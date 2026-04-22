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

task_links = Table(
    'task_links',
    Base.metadata,
    Column('task_id', Integer, ForeignKey('tasks.id'), primary_key=True),
    Column('link_id', Integer, ForeignKey('links.id'), primary_key=True)
)


class Link(Base):
    """
    Links table: stores the URLs and their metadata
    """
    __tablename__ = "links"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    url = Column(String, index=True, nullable=False)
    title = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    date_saved = Column(DateTime, default=datetime.utcnow, nullable=False)
    source_type = Column(String, nullable=False, default='url')  # 'url' or 'file'
    file_name = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    
    # This creates the many-to-many relationship with tags
    # through the link_tags join table
    tags = relationship("Tag", secondary=link_tags, back_populates="links")
    project_links = relationship("ProjectLink", back_populates="link", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="linked_link")
    linked_tasks = relationship("Task", secondary=task_links, back_populates="linked_links")

    __table_args__ = (
        UniqueConstraint('user_id', 'url', name='uq_link_user_url'),
    )


class Tag(Base):
    """
    Tags table: stores unique tags with type (specific or broad)
    """
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    tag_type = Column(String, nullable=False, default='specific')  # 'specific' or 'broad'
    
    # This allows each user to have the same tag taxonomy independently.
    __table_args__ = (
        UniqueConstraint('user_id', 'name', 'tag_type', name='uq_tag_user_name_type'),
    )
    
    # This creates the many-to-many relationship with links
    # through the link_tags join table
    links = relationship("Link", secondary=link_tags, back_populates="tags")


class Project(Base):
    """
    Projects table: stores focused workspaces for links and tasks.
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default='active')  # active or archived
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project_links = relationship("ProjectLink", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class ProjectLink(Base):
    """
    Join table for project-specific link metadata.
    """
    __tablename__ = "project_links"

    project_id = Column(Integer, ForeignKey('projects.id'), primary_key=True)
    link_id = Column(Integer, ForeignKey('links.id'), primary_key=True)
    note = Column(String, nullable=True)
    priority = Column(String, nullable=False, default='normal')  # low, normal, high
    status = Column(String, nullable=False, default='unread')  # unread, reading, done, reference, skip
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="project_links")
    link = relationship("Link", back_populates="project_links")


class Task(Base):
    """
    Project task table. Tasks can optionally point at a saved link.
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    linked_link_id = Column(Integer, ForeignKey('links.id'), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default='todo')  # todo, doing, done
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="tasks")
    linked_link = relationship("Link", back_populates="tasks")
    linked_links = relationship("Link", secondary=task_links, back_populates="linked_tasks")
