from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/tabmanager")

# Supabase (and most hosted Postgres providers) require SSL.
# We pass connect_args only when connecting to a remote host.
_is_remote = "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL
_connect_args = {"sslmode": "require"} if _is_remote else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

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
