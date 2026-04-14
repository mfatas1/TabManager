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
from backend.database import engine, Base, get_db
from backend.models import Link, Project, ProjectLink, Tag, Task
from backend.schemas import (
    LinkAddToProject,
    LinkCreate,
    LinkResponse,
    LinkUpdate,
    TagAddRequest,
    TagResponse,
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
# This will create the links, tags, and link_tags tables
# Note: If you're updating an existing database, you may need to add the tag_type column manually
# or drop and recreate the database: dropdb tabmanager && createdb tabmanager
Base.metadata.create_all(bind=engine)

# Add tag_type column if it doesn't exist (for existing databases)
from sqlalchemy import text
try:
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tags' AND column_name='tag_type'
        """))
        if result.fetchone() is None:
            # Column doesn't exist, add it
            logger.info("Adding tag_type column to tags table...")
            conn.execute(text("ALTER TABLE tags ADD COLUMN tag_type VARCHAR DEFAULT 'specific'"))
            conn.commit()
            logger.info("✓ tag_type column added")
except Exception as e:
    logger.warning(f"Could not add tag_type column (this is OK if database is new): {e}")

app = FastAPI(title="TabManager API")

# Add CORS middleware to allow frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],  # Vite dev server default ports/hosts
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
) -> Tuple[Optional[str], List[str], List[str]]:
    """
    Use OpenAI API to generate a concise summary and two-level semantic tags.
    Returns (summary, specific_tags, broad_tags) tuple.
    - summary: 35-70 words, one paragraph, based on page content
    - specific_tags: 3-4 specific descriptive tags for display
    - broad_tags: 2-3 broad topic categories for graph connections
    """
    client = get_openai_client()
    if not client:
        logger.warning("OpenAI client not available. Falling back to meta description.")
        return (fallback_summary(title, meta_description, page_text), [], [])
    
    if not title and not meta_description and not page_text:
        logger.warning("No page content available for summary or tag extraction.")
        return (None, [], [])
    
    try:
        prompt = f"""Analyze the saved webpage below and return a compact JSON object.

Your job:
1. Write "summary": a concise, insightful summary of the actual page content.
2. Write "specific": 3-4 narrow tags useful for recognizing this exact link.
3. Write "broad": 2-3 broad topic tags useful for clustering related links in a graph.

Summary rules:
- 35-70 words.
- One paragraph only.
- Plain, specific language.
- Explain what the page is about and why it may be useful.
- Do not mention "the article", "the page", or "this link" unless unavoidable.
- Do not invent details that are not supported by the provided content.
- If the content is sparse, summarize only what can be confidently inferred.

Tag rules:
- Use lowercase kebab-case.
- Avoid generic tags like "article", "website", "news", or "blog".
- "specific" tags should be concrete, e.g. "attention-mechanism", "summer-2026-internship".
- "broad" tags should be reusable categories, e.g. "machine-learning", "careers", "finance".

Return only valid JSON in this exact shape:
{{"summary": "35-70 word summary", "specific": ["tag-one"], "broad": ["tag-two"]}}

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

            specific_tags = [tag for tag in specific_tags if tag][:4]
            broad_tags = [tag for tag in broad_tags if tag][:3]
            
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


def scrape_url(url: str) -> Tuple[Optional[str], Optional[str], List[str], List[str]]:
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
        )
        
        return (title, summary, specific_tags, broad_tags)
    except Exception as e:
        # If scraping fails for any reason, log it and return None
        logger.error(f"  ⚠ Scraping failed: {e}")
        return (None, None, [], [])


def get_or_create_tag(db: Session, tag_name: str, tag_type: str) -> Tag:
    """
    Get an existing tag by name/type or create it.
    """
    db_tag = db.query(Tag).filter(
        Tag.name == tag_name,
        Tag.tag_type == tag_type
    ).first()
    if not db_tag:
        db_tag = Tag(name=tag_name, tag_type=tag_type)
        db.add(db_tag)
        db.flush()
    return db_tag


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
        db_link.tags.append(get_or_create_tag(db, tag_name, 'specific'))

    for tag_name in broad_tags:
        db_link.tags.append(get_or_create_tag(db, tag_name, 'broad'))

    return db_link


def analyze_and_apply_link(db: Session, db_link: Link) -> Link:
    """
    Scrape a link URL, generate summary/tags, and persist the result.
    """
    title, summary, specific_tags, broad_tags = scrape_url(db_link.url)
    apply_link_analysis(db, db_link, title, summary, specific_tags, broad_tags)
    db.commit()
    db.refresh(db_link)
    return db_link


def get_or_create_analyzed_link(db: Session, url: str) -> Link:
    """
    Get an existing link, reprocess it if incomplete, or create and analyze a new one.
    """
    existing_link = db.query(Link).filter(Link.url == url).first()
    if existing_link:
        if not existing_link.summary or not existing_link.tags:
            return analyze_and_apply_link(db, existing_link)
        return existing_link

    db_link = Link(url=url)
    db.add(db_link)
    db.flush()
    return analyze_and_apply_link(db, db_link)


def get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_link_or_404(db: Session, link_id: int) -> Link:
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


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


@app.post("/links", response_model=LinkResponse, status_code=201)
def create_link(link: LinkCreate, db: Session = Depends(get_db)):
    """
    Create a new link. Scrapes the URL to get title, meta description, and tags.
    If an existing link is incomplete, reprocess it instead of failing.
    """
    # Check if URL already exists (since url is unique)
    existing_link = db.query(Link).filter(Link.url == link.url).first()
    if existing_link:
        if not existing_link.summary or not existing_link.tags:
            return analyze_and_apply_link(db, existing_link)
        raise HTTPException(status_code=400, detail="Link with this URL already exists")
    
    return get_or_create_analyzed_link(db, link.url)


@app.get("/links", response_model=List[LinkResponse])
def get_links(db: Session = Depends(get_db)):
    """
    Get all saved links, with project memberships eagerly loaded.
    """
    links = (
        db.query(Link)
        .options(joinedload(Link.project_links).joinedload(ProjectLink.project))
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


@app.get("/projects", response_model=List[ProjectSummaryResponse])
def get_projects(db: Session = Depends(get_db)):
    """
    Get all projects with lightweight counts.
    """
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return [build_project_summary(project) for project in projects]


@app.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """
    Create a project workspace.
    """
    db_project = Project(
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
def get_project(project_id: int, db: Session = Depends(get_db)):
    """
    Get a project with its links and tasks.
    """
    return get_project_or_404(db, project_id)


@app.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):
    """
    Update project metadata.
    """
    db_project = get_project_or_404(db, project_id)
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
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a project. Saved links remain in the global library.
    """
    db_project = get_project_or_404(db, project_id)
    db.delete(db_project)
    db.commit()
    return None


@app.post("/projects/{project_id}/links", response_model=ProjectLinkResponse, status_code=201)
def add_link_to_project(project_id: int, link_data: LinkAddToProject, db: Session = Depends(get_db)):
    """
    Add an existing saved link to a project.
    """
    get_project_or_404(db, project_id)
    get_link_or_404(db, link_data.link_id)

    existing = db.query(ProjectLink).filter(
        ProjectLink.project_id == project_id,
        ProjectLink.link_id == link_data.link_id,
    ).first()
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
def add_url_to_project(project_id: int, link: LinkCreate, db: Session = Depends(get_db)):
    """
    Save/analyze a URL and add it to a project.
    """
    get_project_or_404(db, project_id)
    db_link = get_or_create_analyzed_link(db, link.url)

    existing = db.query(ProjectLink).filter(
        ProjectLink.project_id == project_id,
        ProjectLink.link_id == db_link.id,
    ).first()
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
):
    """
    Update project-specific metadata for a link.
    """
    project_link = db.query(ProjectLink).filter(
        ProjectLink.project_id == project_id,
        ProjectLink.link_id == link_id,
    ).first()
    if not project_link:
        raise HTTPException(status_code=404, detail="Project link not found")

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
def remove_link_from_project(project_id: int, link_id: int, db: Session = Depends(get_db)):
    """
    Remove a link from a project without deleting it from the global library.
    """
    project_link = db.query(ProjectLink).filter(
        ProjectLink.project_id == project_id,
        ProjectLink.link_id == link_id,
    ).first()
    if not project_link:
        raise HTTPException(status_code=404, detail="Project link not found")

    db.delete(project_link)
    db.commit()
    return None


@app.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=201)
def create_task(project_id: int, task: TaskCreate, db: Session = Depends(get_db)):
    """
    Create a task in a project.
    """
    get_project_or_404(db, project_id)
    if task.linked_link_id is not None:
        get_link_or_404(db, task.linked_link_id)

    db_task = Task(
        project_id=project_id,
        title=task.title.strip(),
        description=task.description.strip() if task.description else None,
        status=task.status,
        due_date=task.due_date,
        linked_link_id=task.linked_link_id,
    )
    if not db_task.title:
        raise HTTPException(status_code=400, detail="Task title is required")

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    """
    Update a project task.
    """
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

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
            get_link_or_404(db, updates["linked_link_id"])
        db_task.linked_link_id = updates["linked_link_id"]

    if not db_task.title:
        raise HTTPException(status_code=400, detail="Task title is required")

    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """
    Delete a project task.
    """
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(db_task)
    db.commit()
    return None


@app.post("/links/{link_id}/reprocess", response_model=LinkResponse)
def reprocess_link(link_id: int, db: Session = Depends(get_db)):
    """
    Re-scrape a saved link and regenerate its summary and tags.
    """
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    return analyze_and_apply_link(db, link)


@app.patch("/links/{link_id}", response_model=LinkResponse)
def update_link(link_id: int, update: LinkUpdate, db: Session = Depends(get_db)):
    """
    Manually update a link's title and/or summary.
    """
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if update.title is not None:
        link.title = update.title
    if update.summary is not None:
        link.summary = update.summary
    db.commit()
    db.refresh(link)
    return link


@app.get("/tags", response_model=List[TagResponse])
def get_all_tags(db: Session = Depends(get_db)):
    """
    Return all tags sorted by name, for autocomplete.
    """
    return db.query(Tag).order_by(Tag.name).all()


@app.post("/links/{link_id}/tags", response_model=TagResponse, status_code=201)
def add_tag_to_link(link_id: int, tag_data: TagAddRequest, db: Session = Depends(get_db)):
    """
    Add a tag to a link. Finds an existing tag with that name+type or creates one.
    """
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    tag_name = tag_data.name.strip().lower()
    tag = db.query(Tag).filter(Tag.name == tag_name, Tag.tag_type == tag_data.tag_type).first()
    if not tag:
        tag = Tag(name=tag_name, tag_type=tag_data.tag_type)
        db.add(tag)
        db.flush()

    if tag not in link.tags:
        link.tags.append(tag)
        db.commit()

    db.refresh(tag)
    return tag


@app.delete("/links/{link_id}/tags/{tag_id}", status_code=204)
def remove_tag_from_link(link_id: int, tag_id: int, db: Session = Depends(get_db)):
    """
    Remove a tag from a link. Deletes the tag entirely if no other links use it.
    """
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if tag in link.tags:
        link.tags.remove(tag)
        db.flush()
        if len(tag.links) == 0:
            db.delete(tag)
        db.commit()

    return None


@app.delete("/links/{link_id}", status_code=204)
def delete_link(link_id: int, db: Session = Depends(get_db)):
    """
    Delete a link by ID.
    Returns 204 No Content on success.
    """
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    db.delete(link)
    db.commit()
    return None
