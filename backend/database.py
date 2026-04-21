from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/tabmanager")

# Render (and some other hosts) provide postgres:// URLs, but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Supabase (and most cloud databases) require SSL. Adding sslmode=require
# if not already present ensures the connection works on Render.
if "sslmode" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# SessionLocal is a factory for creating database sessions
# Each request will get its own session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all our database models
# All models will inherit from this
Base = declarative_base()


def get_db():
    """
    Dependency function for FastAPI.
    Creates a database session, yields it, then closes it after the request.
    This ensures we always close database connections properly.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
