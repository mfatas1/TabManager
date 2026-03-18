from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
import requests
from bs4 import BeautifulSoup
import os
import json
import logging
from dotenv import load_dotenv
from openai import OpenAI
from backend.database import engine, Base, get_db
from backend.models import Link, Tag
from backend.schemas import LinkCreate, LinkResponse

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI client will be initialized lazily when needed
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = None

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
    allow_origins=["http://localhost:5173"],  # Vite dev server default port
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


def extract_tags_with_llm(title: Optional[str], summary: Optional[str]) -> Tuple[List[str], List[str]]:
    """
    Use OpenAI API to generate two-level semantic tags from title and summary.
    Returns (specific_tags, broad_tags) tuple.
    - specific_tags: 3-4 specific descriptive tags for display
    - broad_tags: 2-3 broad topic categories for graph connections
    """
    client = get_openai_client()
    if not client:
        logger.warning("OpenAI client not available. Cannot extract tags.")
        return ([], [])
    
    if not title and not summary:
        logger.warning("No title or summary provided for tag extraction.")
        return ([], [])
    
    try:
        prompt = f"""Given this article title and summary, generate two sets of tags:
1. "specific": 3-4 specific descriptive tags (e.g. "machine-learning-internship", "summer-2026")
2. "broad": 2-3 broad topic categories (e.g. "machine-learning", "careers")

Return only JSON in this format:
{{"specific": ["tag1", "tag2"], "broad": ["tag1", "tag2"]}}

Title: {title or 'N/A'}
Summary: {summary or 'N/A'}

Return only the JSON object, nothing else:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using the cheaper, faster model
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates semantic tags for articles. Always return only a valid JSON object with 'specific' and 'broad' arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent results
            max_tokens=300
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
            if "specific" in result and isinstance(result["specific"], list):
                specific_tags = [str(tag).lower().strip() for tag in result["specific"] if tag]
            if "broad" in result and isinstance(result["broad"], list):
                broad_tags = [str(tag).lower().strip() for tag in result["broad"] if tag]
            
            logger.info(f"✓ Generated {len(specific_tags)} specific tags: {specific_tags}")
            logger.info(f"✓ Generated {len(broad_tags)} broad tags: {broad_tags}")
            return (specific_tags, broad_tags)
        else:
            logger.warning(f"Unexpected response format: {result}")
            return ([], [])
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}. Response: {content}")
        return ([], [])
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}")
        return ([], [])


def scrape_url(url: str) -> Tuple[Optional[str], Optional[str], List[str], List[str]]:
    """
    Scrape a URL and extract the title, meta description, and two-level tags using LLM.
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
        summary = meta_desc.get('content') if meta_desc else None
        logger.info(f"  ✓ Summary: {summary}")
        
        # Extract two-level tags using LLM
        specific_tags, broad_tags = extract_tags_with_llm(title, summary)
        
        return (title, summary, specific_tags, broad_tags)
    except Exception as e:
        # If scraping fails for any reason, log it and return None
        logger.error(f"  ⚠ Scraping failed: {e}")
        return (None, None, [], [])


@app.get("/")
def read_root():
    return {"message": "TabManager API is running"}


@app.post("/links", response_model=LinkResponse, status_code=201)
def create_link(link: LinkCreate, db: Session = Depends(get_db)):
    """
    Create a new link. Scrapes the URL to get title, meta description, and tags.
    """
    # Check if URL already exists (since url is unique)
    existing_link = db.query(Link).filter(Link.url == link.url).first()
    if existing_link:
        raise HTTPException(status_code=400, detail="Link with this URL already exists")
    
    # Scrape the URL to get title, summary, and two-level tags
    title, summary, specific_tags, broad_tags = scrape_url(link.url)
    
    # Create new link with URL, title, and summary
    db_link = Link(url=link.url, title=title, summary=summary)
    db.add(db_link)
    db.flush()  # Flush to get the ID without committing yet
    
    # Create or get tags and associate them with the link
    # Process specific tags
    for tag_name in specific_tags:
        # Get existing tag with same name and type, or create new one
        db_tag = db.query(Tag).filter(
            Tag.name == tag_name,
            Tag.tag_type == 'specific'
        ).first()
        if not db_tag:
            db_tag = Tag(name=tag_name, tag_type='specific')
            db.add(db_tag)
            db.flush()  # Flush to get the tag ID
        
        # Associate tag with link (many-to-many relationship)
        db_link.tags.append(db_tag)
    
    # Process broad tags
    for tag_name in broad_tags:
        # Get existing tag with same name and type, or create new one
        db_tag = db.query(Tag).filter(
            Tag.name == tag_name,
            Tag.tag_type == 'broad'
        ).first()
        if not db_tag:
            db_tag = Tag(name=tag_name, tag_type='broad')
            db.add(db_tag)
            db.flush()  # Flush to get the tag ID
        
        # Associate tag with link (many-to-many relationship)
        db_link.tags.append(db_tag)
    
    db.commit()
    db.refresh(db_link)  # Refresh to get all relationships loaded
    
    return db_link


@app.get("/links", response_model=List[LinkResponse])
def get_links(db: Session = Depends(get_db)):
    """
    Get all saved links.
    Returns a list of all links in the database.
    """
    links = db.query(Link).all()
    return links


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
