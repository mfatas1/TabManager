from sqlalchemy import Column, Integer, String, DateTime, Table, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

# This is the join table for the many-to-many relationship
# between links and tags
link_tags = Table(
    'link_tags',
    Base.metadata,
    Column('link_id', Integer, ForeignKey('links.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)


class Link(Base):
    """
    Links table: stores the URLs and their metadata
    """
    __tablename__ = "links"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    date_saved = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # This creates the many-to-many relationship with tags
    # through the link_tags join table
    tags = relationship("Tag", secondary=link_tags, back_populates="links")


class Tag(Base):
    """
    Tags table: stores unique tags with type (specific or broad)
    """
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tag_type = Column(String, nullable=False, default='specific')  # 'specific' or 'broad'
    
    # Create a unique constraint on name + tag_type combination
    # This allows the same tag name to exist as both specific and broad
    __table_args__ = (
        UniqueConstraint('name', 'tag_type', name='uq_tag_name_type'),
    )
    
    # This creates the many-to-many relationship with links
    # through the link_tags join table
    links = relationship("Link", secondary=link_tags, back_populates="tags")
