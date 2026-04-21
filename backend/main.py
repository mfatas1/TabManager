from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple
import requests
from bs4 import BeautifulSoup
import os
import json
import logging
import re
from dotenv import load_dotenv
from openai import OpenAI
from backend.auth import CurrentUser, get_current_user
from backend.database import engine, Base, get_db
from backend.models import Link, Project, ProjectLink, Tag, Task
from backend.schemas import (
    LinkAddToProject,
    LinkCreate,
    LinkResponse,
    LinkUpdate,
    ProjectCreate,
    ProjectLinkResponse,
    ProjectLinkUpdate,
    ProjectResponse,
    ProjectSummaryResponse,
    ProjectUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI client will be initialized lazily when needed
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
openai_client = None

MAX_PAGE_TEXT_CHARS = 8000

def get_openai_client():
    """Lazy initialization of OpenAI client to avoid startup errors."""
    global openai_client
    if openai_client is not None:
        return openai_client
    
    if not OPENAI_API_KEY:
        logger.warning("⚠️  OPENAI_API_KEY not found in environment variables.")
        return None
    
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("✓ OpenAI client initialized")
        return openai_client
    except Exception as e:
        logger.error(f"⚠️  Failed to initialize OpenAI client: {e}")
        logger.error("   Try running: pip install --upgrade openai httpx")
        return None

# Create all tables in the database
try:
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables created/verified")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    raise

from sqlalchemy import text


def ensure_column(conn, table_name: str, column_name: str, definition: str):
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name=:table_name AND column_name=:column_name
    """), {"table_name": table_name, "column_name": column_name})
    if result.fetchone() is not None:
        return

    logger.info("Adding %s column to %s table...", column_name, table_name)
    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


def drop_single_column_unique_indexes(conn, table_name: str, column_name: str):
    result = conn.execute(text("""
        SELECT
            indexrelid::regclass::text AS index_name,
            pg_constraint.conname AS constraint_name
        FROM pg_index
        LEFT JOIN pg_constraint ON pg_constraint.conindid = pg_index.indexrelid
        WHERE indrelid = to_regclass(:table_name)
          AND indisunique
          AND indnatts = 1
          AND indkey[0] = (
              SELECT attnum
              FROM pg_attribute
              WHERE attrelid = to_regclass(:table_name)
                AND attname = :column_name
          )
    """), {"table_name": table_name, "column_name": column_name})
    for row in result:
        if row.constraint_name:
            logger.info("Dropping old global unique constraint %s on %s", row.constraint_name, table_name)
            conn.execute(text(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {row.constraint_name}"))
        else:
            logger.info("Dropping old global unique index %s", row.index_name)
            conn.execute(text(f"DROP INDEX IF EXISTS {row.index_name}"))


def drop_global_tag_unique_indexes(conn):
    result = conn.execute(text("""
        SELECT
            indexrelid::regclass::text AS index_name,
            pg_constraint.conname AS constraint_name
        FROM pg_index
        LEFT JOIN pg_constraint ON pg_constraint.conindid = pg_index.indexrelid
        WHERE indrelid = to_regclass('tags')
          AND indisunique
          AND indnatts = 2
          AND ARRAY(
              SELECT attname::text
              FROM unnest(indkey) WITH ORDINALITY AS cols(attnum, ordinality)
              JOIN pg_attribute ON attrelid = to_regclass('tags')
                AND pg_attribute.attnum = cols.attnum
              ORDER BY ordinality
          ) = ARRAY['name', 'tag_type']
    """))
    for row in result:
        if row.constraint_name:
            logger.info("Dropping old global unique tag constraint %s", row.constraint_name)
            conn.execute(text(f"ALTER TABLE tags DROP CONSTRAINT IF EXISTS {row.constraint_name}"))
        else:
            logger.info("Dropping old global unique tag index %s", row.index_name)
            conn.execute(text(f"DROP INDEX IF EXISTS {row.index_name}"))


try:
    with engine.connect() as conn:
        ensure_column(conn, "tags", "tag_type", "VARCHAR DEFAULT 'specific'")
        for table_name in ("links", "tags", "projects", "tasks"):
            ensure_column(conn, table_name, "user_id", "VARCHAR")
            conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS ix_{table_name}_user_id ON {table_name} (user_id)"
            ))
        conn.execute(text("ALTER TABLE links DROP CONSTRAINT IF EXISTS links_url_key"))
        conn.execute(text("ALTER TABLE links DROP CONSTRAINT IF EXISTS ix_links_url"))
        conn.execute(text("DROP INDEX IF EXISTS ix_links_url"))
        conn.execute(text("ALTER TABLE tags DROP CONSTRAINT IF EXISTS uq_tag_name_type"))
        conn.execute(text("ALTER TABLE tags DROP CONSTRAINT IF EXISTS ix_tags_name"))
        conn.execute(text("DROP INDEX IF EXISTS ix_tags_name"))
        drop_single_column_unique_indexes(conn, "links", "url")
        drop_single_column_unique_indexes(conn, "tags", "name")
        drop_global_tag_unique_indexes(conn)
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_link_user_url "
            "ON links (user_id, url) WHERE user_id IS NOT NULL"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_tag_user_name_type "
            "ON tags (user_id, name, tag_type) WHERE user_id IS NOT NULL"
        ))
        conn.commit()
        logger.info("✓ Auth ownership columns are ready")
except Exception as e:
    logger.warning(f"Could not prepare database compatibility columns: {e}")

app = FastAPI(title="TabManager API")

def get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("FRONTEND_ORIGINS", "")
    production_origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *production_origins,
    ]


# Add CORS middleware to allow frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


def extract_page_text(soup: BeautifulSoup) -> str:
    """
    Extract readable page text for summarization.
    Keeps the input bounded so model calls stay predictable and cheap.
    """
    for element in soup(["script", "style", "noscript", "svg", "form", "nav", "footer"]):
        element.decompose()

    content_root = soup.find("article") or soup.find("main") or soup.body or soup
    for element in content_root.find_all(class_=lambda value: value and "math" in str(value).lower()):
        element.decompose()

    text_blocks = [
        element.get_text(" ", strip=True)
        for element in content_root.find_all(["h1", "h2", "p", "li"])
    ]
    text = " ".join(block for block in text_blocks if block) or content_root.get_text(" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_PAGE_TEXT_CHARS]


def normalize_tag(tag: str) -> str:
    """
    Normalize model-provided tags into lowercase kebab-case.
    """
    normalized = re.sub(r"[^a-z0-9]+", "-", str(tag).lower()).strip("-")
    return normalized


def fallback_summary(
    title: Optional[str],
    meta_description: Optional[str],
    page_text: Optional[str],
) -> Optional[str]:
    """
    Create a short non-LLM fallback summary when OpenAI is unavailable.
    """
    if meta_description and len(meta_description.split()) >= 8:
        return re.sub(r"\s+", " ", meta_description).strip()

    if not page_text:
        return title

    sentences = re.split(r"(?<=[.!?])\s+", page_text)
    useful_sentences = []
    for sentence in sentences:
        sentence = re.sub(r"\s+", " ", sentence).strip()
        if len(sentence) < 50 or len(sentence) > 260:
            continue

        alpha_ratio = sum(char.isalpha() for char in sentence) / max(len(sentence), 1)
        if alpha_ratio < 0.55:
            continue

        useful_sentences.append(sentence)
        if len(" ".join(useful_sentences).split()) >= 45:
            break

    summary = " ".join(useful_sentences).strip()
    if not summary:
        summary = page_text[:260].strip()

    words = summary.split()
    if len(words) > 70:
        summary = " ".join(words[:70]).rstrip(" ,;:") + "..."

    return summary or title


def analyze_page_with_llm(
    url: str,
    title: Optional[str],
    meta_description: Optional[str],
    page_text: Optional[str],
    existing_topics: Optional[List[str]] = None,
) -> Tuple[Optional[str], List[str], List[str]]:
    """
    Use OpenAI API to generate a concise summary and two-level semantic tags.
    Returns (summary, specific_tags, broad_tags) tuple.
    - summary: 35-70 words, one paragraph, based on page content
    - specific_tags: 3-5 specific descriptive keywords for display
    - broad_tags: 1-2 broad topic categories for graph connections
    """
    client = get_openai_client()
    if not client:
        logger.warning("OpenAI client not available. Falling back to meta description.")
        return (fallback_summary(title, meta_description, page_text), [], [])
    
    if not title and not meta_description and not page_text:
        logger.warning("No page content available for summary or tag extraction.")
        return (None, [], [])
    
    try:
        topic_options = existing_topics or []
        existing_topics_text = ", ".join(topic_options) if topic_options else "None yet"

        prompt = f"""Analyze the saved webpage below and return a compact JSON object.

Your job:
1. Write "summary": a concise, insightful summary of the actual page content.
2. Write "specific": 3-5 narrow keyword tags useful for recognizing this exact link.
3. Write "broad": 1-2 broad topic tags useful for clustering related links in a graph.

Summary rules:
- 35-70 words.
- One paragraph only.
- Plain, specific language.
- Explain what the page is about and why it may be useful.
- Do not mention "the article", "the page", or "this link" unless unavoidable.
- Do not invent details that are not supported by the provided content.
- If the content is sparse, summarize only what can be confidently inferred.

Topic rules for "broad":
- Return exactly 2 topics.
- Topics should be library sections, not detailed descriptors.
- First, decide the 2 best topics purely based on the page content, ignoring existing topics entirely.
- Then, for each of your 2 chosen topics, check if any existing topic is essentially the same concept or very close in meaning. If so, use the existing topic name instead. Otherwise keep your original choice.
- Only substitute an existing topic if it is a near-identical match — do NOT force an existing topic just because it loosely relates.
- Prefer stable, reusable fields like "machine-learning", "software-engineering", "physics", "startups", "finance", "climate", "neuroscience", "product-design", "mechanical-engineering", or "knowledge-management".
- Do not use narrow concepts as topics. Examples that are too narrow for topics: "model-explainability", "startup-strategies", "algorithm-analysis", "geolocation", "sensor-technology", "momentum-gradient-descent".

Keyword rules for "specific":
- Return 3-5 keywords.
- Keywords should be concrete and specific to the link.
- Put narrow concepts here, e.g. "momentum-gradient-descent", "model-explainability", "geolocation", "convex-optimization", "sensor-technology".

General tag rules:
- Use lowercase kebab-case.
- Avoid generic tags like "article", "website", "news", or "blog".

Return only valid JSON in this exact shape:
{{"summary": "35-70 word summary", "specific": ["tag-one"], "broad": ["tag-two"]}}

Existing broad topics for this user's library:
{existing_topics_text}

URL: {url}
Title: {title or 'N/A'}
Meta description: {meta_description or 'N/A'}
Extracted page content:
{page_text or 'N/A'}"""

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You summarize saved webpages for a personal knowledge manager. Always return only valid JSON matching the requested schema."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=350,
            response_format={"type": "json_object"},
        )
        
        # Extract the response content
        content = response.choices[0].message.content.strip()
        
        # Try to parse as JSON
        # Sometimes the model returns markdown code blocks, so we handle that
        if content.startswith("```"):
            # Remove markdown code blocks
            content = content.replace("```json", "").replace("```", "").strip()
        
        result = json.loads(content)
        
        # Validate and extract tags
        specific_tags = []
        broad_tags = []
        
        if isinstance(result, dict):
            generated_summary = result.get("summary")
            if generated_summary:
                generated_summary = re.sub(r"\s+", " ", str(generated_summary)).strip()

            if "specific" in result and isinstance(result["specific"], list):
                specific_tags = [normalize_tag(tag) for tag in result["specific"] if tag]
            if "broad" in result and isinstance(result["broad"], list):
                broad_tags = [normalize_tag(tag) for tag in result["broad"] if tag]

            specific_tags = [tag for tag in specific_tags if tag][:5]
            broad_tags = [tag for tag in broad_tags if tag][:2]
            if not broad_tags:
                broad_tags = ["general-knowledge"]
            
            logger.info(f"✓ Generated summary: {generated_summary}")
            logger.info(f"✓ Generated {len(specific_tags)} specific tags: {specific_tags}")
            logger.info(f"✓ Generated {len(broad_tags)} broad tags: {broad_tags}")
            return (
                generated_summary or fallback_summary(title, meta_description, page_text),
                specific_tags,
                broad_tags,
            )
        else:
            logger.warning(f"Unexpected response format: {result}")
            return (fallback_summary(title, meta_description, page_text), [], [])
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}. Response: {content}")
        return (fallback_summary(title, meta_description, page_text), [], [])
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}")
        return (fallback_summary(title, meta_description, page_text), [], [])


def scrape_url(
    url: str,
    existing_topics: Optional[List[str]] = None,
) -> Tuple[Optional[str], Optional[str], List[str], List[str]]:
    """
    Scrape a URL and extract the title, model-written summary, and two-level tags using LLM.
    Returns (title, summary, specific_tags, broad_tags) tuple. 
    Returns (None, None, [], []) if scraping fails.
    """
    try:
        logger.info(f"🔍 Scraping URL: {url}")
        response = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Get title
        title_tag = soup.find('title')
        title = title_tag.get_text(strip=True) if title_tag else None
        logger.info(f"  ✓ Title: {title}")
        
        # Get meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        meta_description = meta_desc.get('content') if meta_desc else None
        logger.info(f"  ✓ Meta description: {meta_description}")
        
        page_text = extract_page_text(soup)
        logger.info(f"  ✓ Extracted {len(page_text)} characters of page text")
        
        # Generate model-written summary and two-level tags using LLM
        summary, specific_tags, broad_tags = analyze_page_with_llm(
            url=url,
            title=title,
            meta_description=meta_description,
            page_text=page_text,
            existing_topics=existing_topics,
        )
        
        return (title, summary, specific_tags, broad_tags)
    except Exception as e:
        # If scraping fails for any reason, log it and return None
        logger.error(f"  ⚠ Scraping failed: {e}")
        return (None, None, [], [])


def user_owned_filter(model, user_id: str):
    return model.user_id == user_id


def get_or_create_tag(db: Session, tag_name: str, tag_type: str, user_id: Optional[str] = None) -> Tag:
    """
    Get an existing tag by name/type or create it.
    """
    db_tag = db.query(Tag).filter(
        Tag.name == tag_name,
        Tag.tag_type == tag_type,
        Tag.user_id == user_id,
    ).first()
    if not db_tag:
        db_tag = Tag(name=tag_name, tag_type=tag_type, user_id=user_id)
        db.add(db_tag)
        db.flush()
    return db_tag


def get_existing_broad_topics(db: Session, user_id: Optional[str]) -> List[str]:
    if not user_id:
        return []

    rows = (
        db.query(Tag.name)
        .filter(
            Tag.user_id == user_id,
            Tag.tag_type == 'broad',
        )
        .order_by(Tag.name.asc())
        .all()
    )
    return [row.name for row in rows]


def apply_link_analysis(
    db: Session,
    db_link: Link,
    title: Optional[str],
    summary: Optional[str],
    specific_tags: List[str],
    broad_tags: List[str],
) -> Link:
    """
    Update a link with scraped/model metadata and replace its generated tags.
    """
    db_link.title = title
    db_link.summary = summary
    db_link.tags.clear()
    db.flush()

    for tag_name in specific_tags:
        db_link.tags.append(get_or_create_tag(db, tag_name, 'specific', db_link.user_id))

    for tag_name in broad_tags:
        db_link.tags.append(get_or_create_tag(db, tag_name, 'broad', db_link.user_id))

    return db_link


def analyze_and_apply_link(db: Session, db_link: Link) -> Link:
    """
    Scrape a link URL, generate summary/tags, and persist the result.
    """
    existing_topics = get_existing_broad_topics(db, db_link.user_id)
    title, summary, specific_tags, broad_tags = scrape_url(db_link.url, existing_topics)
    apply_link_analysis(db, db_link, title, summary, specific_tags, broad_tags)
    db.commit()
    db.refresh(db_link)
    return db_link


def get_or_create_analyzed_link(db: Session, url: str, user_id: Optional[str] = None) -> Link:
    """
    Get an existing link, reprocess it if incomplete, or create and analyze a new one.
    """
    existing_link = db.query(Link).filter(
        Link.url == url,
        Link.user_id == user_id,
    ).first()
    if existing_link:
        if not existing_link.summary or not existing_link.tags:
            return analyze_and_apply_link(db, existing_link)
        return existing_link

    db_link = Link(url=url, user_id=user_id)
    db.add(db_link)
    db.flush()
    return analyze_and_apply_link(db, db_link)


def get_project_or_404(db: Session, project_id: int, user_id: str) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        user_owned_filter(Project, user_id),
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_link_or_404(db: Session, link_id: int, user_id: str) -> Link:
    link = db.query(Link).filter(
        Link.id == link_id,
        user_owned_filter(Link, user_id),
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


def get_task_or_404(db: Session, task_id: int, user_id: str) -> Task:
    task = db.query(Task).filter(
        Task.id == task_id,
        user_owned_filter(Task, user_id),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def get_project_link_or_404(db: Session, project_id: int, link_id: int, user_id: str) -> ProjectLink:
    project_link = (
        db.query(ProjectLink)
        .join(Project, Project.id == ProjectLink.project_id)
        .join(Link, Link.id == ProjectLink.link_id)
        .filter(
            ProjectLink.project_id == project_id,
            ProjectLink.link_id == link_id,
            user_owned_filter(Project, user_id),
            user_owned_filter(Link, user_id),
        )
        .first()
    )
    if not project_link:
        raise HTTPException(status_code=404, detail="Project link not found")
    return project_link


def get_project_links_for_task(
    db: Session,
    project_id: int,
    link_ids: Optional[List[int]],
    user_id: str,
) -> List[Link]:
    if not link_ids:
        return []

    unique_ids = list(dict.fromkeys(link_ids))
    links = []
    for link_id in unique_ids:
        get_project_link_or_404(db, project_id, link_id, user_id)
        links.append(get_link_or_404(db, link_id, user_id))
    return links


def build_project_summary(project: Project) -> ProjectSummaryResponse:
    return ProjectSummaryResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        link_count=len(project.project_links),
        task_count=len(project.tasks),
    )


@app.get("/")
def read_root():
    return {"message": "TabManager API is running"}


@app.get("/auth/me")
def read_current_user(current_user: CurrentUser = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}


@app.post("/links", response_model=LinkResponse, status_code=201)
def create_link(
    link: LinkCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a new link. Scrapes the URL to get title, meta description, and tags.
    If an existing link is incomplete, reprocess it instead of failing.
    """
    # Check if this user already saved the URL.
    existing_link = db.query(Link).filter(
        Link.url == link.url,
        user_owned_filter(Link, current_user.id),
    ).first()
    if existing_link:
        if not existing_link.summary or not existing_link.tags:
            return analyze_and_apply_link(db, existing_link)
        raise HTTPException(status_code=400, detail="Link with this URL already exists in your library")
    
    return get_or_create_analyzed_link(db, link.url, current_user.id)


@app.get("/links", response_model=List[LinkResponse])
def get_links(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get all saved links, with project memberships eagerly loaded.
    """
    links = (
        db.query(Link)
        .options(joinedload(Link.project_links).joinedload(ProjectLink.project))
        .filter(user_owned_filter(Link, current_user.id))
        .all()
    )
    result = []
    for link in links:
        result.append({
            "id": link.id,
            "url": link.url,
            "title": link.title,
            "summary": link.summary,
            "date_saved": link.date_saved,
            "tags": link.tags,
            "projects": [
                {"id": pl.project.id, "name": pl.project.name}
                for pl in link.project_links
                if pl.project
            ],
        })
    return result


@app.get("/tags", response_model=List[dict])
def get_tags(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get all tags for manual topic/keyword editing.
    """
    tags = (
        db.query(Tag)
        .filter(user_owned_filter(Tag, current_user.id))
        .order_by(Tag.tag_type.asc(), Tag.name.asc())
        .all()
    )
    return [
        {"id": tag.id, "name": tag.name, "tag_type": tag.tag_type}
        for tag in tags
    ]


@app.get("/projects", response_model=List[ProjectSummaryResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get all projects with lightweight counts.
    """
    projects = (
        db.query(Project)
        .filter(user_owned_filter(Project, current_user.id))
        .order_by(Project.updated_at.desc())
        .all()
    )
    return [build_project_summary(project) for project in projects]


@app.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a project workspace.
    """
    db_project = Project(
        user_id=current_user.id,
        name=project.name.strip(),
        description=project.description.strip() if project.description else None,
    )
    if not db_project.name:
        raise HTTPException(status_code=400, detail="Project name is required")

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get a project with its links and tasks.
    """
    return get_project_or_404(db, project_id, current_user.id)


@app.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update project metadata.
    """
    db_project = get_project_or_404(db, project_id, current_user.id)
    updates = project.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        db_project.name = updates["name"].strip()
    if "description" in updates:
        db_project.description = updates["description"].strip() if updates["description"] else None
    if "status" in updates and updates["status"] is not None:
        db_project.status = updates["status"]

    if not db_project.name:
        raise HTTPException(status_code=400, detail="Project name is required")

    db.commit()
    db.refresh(db_project)
    return db_project


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Delete a project. Saved links remain in the global library.
    """
    db_project = get_project_or_404(db, project_id, current_user.id)
    db.delete(db_project)
    db.commit()
    return None


@app.post("/projects/{project_id}/links", response_model=ProjectLinkResponse, status_code=201)
def add_link_to_project(
    project_id: int,
    link_data: LinkAddToProject,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Add an existing saved link to a project.
    """
    get_project_or_404(db, project_id, current_user.id)
    get_link_or_404(db, link_data.link_id, current_user.id)

    existing = (
        db.query(ProjectLink)
        .join(Project, Project.id == ProjectLink.project_id)
        .join(Link, Link.id == ProjectLink.link_id)
        .filter(
            ProjectLink.project_id == project_id,
            ProjectLink.link_id == link_data.link_id,
            user_owned_filter(Project, current_user.id),
            user_owned_filter(Link, current_user.id),
        )
        .first()
    )
    if existing:
        existing.note = link_data.note
        existing.priority = link_data.priority
        existing.status = link_data.status
        db.commit()
        db.refresh(existing)
        return existing

    project_link = ProjectLink(
        project_id=project_id,
        link_id=link_data.link_id,
        note=link_data.note,
        priority=link_data.priority,
        status=link_data.status,
    )
    db.add(project_link)
    db.commit()
    db.refresh(project_link)
    return project_link


@app.post("/projects/{project_id}/links/from-url", response_model=ProjectLinkResponse, status_code=201)
def add_url_to_project(
    project_id: int,
    link: LinkCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Save/analyze a URL and add it to a project.
    """
    get_project_or_404(db, project_id, current_user.id)
    db_link = get_or_create_analyzed_link(db, link.url, current_user.id)

    existing = (
        db.query(ProjectLink)
        .join(Project, Project.id == ProjectLink.project_id)
        .join(Link, Link.id == ProjectLink.link_id)
        .filter(
            ProjectLink.project_id == project_id,
            ProjectLink.link_id == db_link.id,
            user_owned_filter(Project, current_user.id),
            user_owned_filter(Link, current_user.id),
        )
        .first()
    )
    if existing:
        return existing

    project_link = ProjectLink(project_id=project_id, link_id=db_link.id)
    db.add(project_link)
    db.commit()
    db.refresh(project_link)
    return project_link


@app.patch("/projects/{project_id}/links/{link_id}", response_model=ProjectLinkResponse)
def update_project_link(
    project_id: int,
    link_id: int,
    link_data: ProjectLinkUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update project-specific metadata for a link.
    """
    project_link = get_project_link_or_404(db, project_id, link_id, current_user.id)

    updates = link_data.model_dump(exclude_unset=True)
    if "note" in updates:
        project_link.note = updates["note"]
    if "priority" in updates and updates["priority"] is not None:
        project_link.priority = updates["priority"]
    if "status" in updates and updates["status"] is not None:
        project_link.status = updates["status"]

    db.commit()
    db.refresh(project_link)
    return project_link


@app.delete("/projects/{project_id}/links/{link_id}", status_code=204)
def remove_link_from_project(
    project_id: int,
    link_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Remove a link from a project without deleting it from the global library.
    """
    project_link = get_project_link_or_404(db, project_id, link_id, current_user.id)

    db.delete(project_link)
    db.commit()
    return None


@app.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=201)
def create_task(
    project_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a task in a project.
    """
    get_project_or_404(db, project_id, current_user.id)
    linked_link_ids = list(task.linked_link_ids or [])
    if task.linked_link_id is not None and task.linked_link_id not in linked_link_ids:
        linked_link_ids.append(task.linked_link_id)
    linked_links = get_project_links_for_task(db, project_id, linked_link_ids, current_user.id)

    db_task = Task(
        user_id=current_user.id,
        project_id=project_id,
        title=task.title.strip(),
        description=task.description.strip() if task.description else None,
        status=task.status,
        due_date=task.due_date,
        linked_link_id=linked_link_ids[0] if linked_link_ids else None,
    )
    db_task.linked_links = linked_links
    if not db_task.title:
        raise HTTPException(status_code=400, detail="Task title is required")

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update a project task.
    """
    db_task = get_task_or_404(db, task_id, current_user.id)

    updates = task.model_dump(exclude_unset=True)
    if "title" in updates and updates["title"] is not None:
        db_task.title = updates["title"].strip()
    if "description" in updates:
        db_task.description = updates["description"].strip() if updates["description"] else None
    if "status" in updates and updates["status"] is not None:
        db_task.status = updates["status"]
    if "due_date" in updates:
        db_task.due_date = updates["due_date"]
    if "linked_link_id" in updates:
        if updates["linked_link_id"] is not None:
            get_project_link_or_404(db, db_task.project_id, updates["linked_link_id"], current_user.id)
        db_task.linked_link_id = updates["linked_link_id"]
    if "linked_link_ids" in updates:
        linked_links = get_project_links_for_task(
            db,
            db_task.project_id,
            updates["linked_link_ids"] or [],
            current_user.id,
        )
        db_task.linked_links = linked_links
        db_task.linked_link_id = linked_links[0].id if linked_links else None

    if not db_task.title:
        raise HTTPException(status_code=400, detail="Task title is required")

    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Delete a project task.
    """
    db_task = get_task_or_404(db, task_id, current_user.id)

    db.delete(db_task)
    db.commit()
    return None


@app.post("/links/{link_id}/reprocess", response_model=LinkResponse)
def reprocess_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Re-scrape a saved link and regenerate its summary and tags.
    """
    link = get_link_or_404(db, link_id, current_user.id)

    return analyze_and_apply_link(db, link)


@app.patch("/links/{link_id}", response_model=LinkResponse)
def update_link(
    link_id: int,
    update: LinkUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Manually update a link's title, summary, topics, and/or keywords.
    """
    link = get_link_or_404(db, link_id, current_user.id)
    if update.title is not None:
        link.title = update.title
    if update.summary is not None:
        link.summary = update.summary
    if update.topics is not None or update.keywords is not None:
        topics = update.topics if update.topics is not None else [
            tag.name for tag in link.tags if tag.tag_type == 'broad'
        ]
        keywords = update.keywords if update.keywords is not None else [
            tag.name for tag in link.tags if tag.tag_type == 'specific'
        ]
        link.tags.clear()
        db.flush()
        for tag_name in topics:
            normalized = normalize_tag(tag_name)
            if normalized:
                link.tags.append(get_or_create_tag(db, normalized, 'broad', link.user_id))
        for tag_name in keywords:
            normalized = normalize_tag(tag_name)
            if normalized:
                link.tags.append(get_or_create_tag(db, normalized, 'specific', link.user_id))
    db.commit()
    db.refresh(link)
    return link


@app.delete("/links/{link_id}", status_code=204)
def delete_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Delete a link by ID.
    Returns 204 No Content on success.
    """
    link = get_link_or_404(db, link_id, current_user.id)
    
    db.delete(link)
    db.commit()
    return None
