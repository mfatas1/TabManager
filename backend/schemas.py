from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional, List


class LinkCreate(BaseModel):
    """
    Schema for creating a new link.
    Just needs a URL for now.
    """
    url: str


class LinkUpdate(BaseModel):
    """
    Schema for manually editing a link's title or summary.
    """
    title: Optional[str] = None
    summary: Optional[str] = None


class TagAddRequest(BaseModel):
    """
    Schema for adding a tag to a link.
    """
    name: str
    tag_type: str = 'specific'  # 'specific' or 'broad'


class LinkAddToProject(BaseModel):
    link_id: int
    note: Optional[str] = None
    priority: str = "normal"
    status: str = "unread"


class ProjectLinkUpdate(BaseModel):
    note: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class ProjectMiniResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TagResponse(BaseModel):
    """
    Schema for tag responses.
    """
    id: int
    name: str
    tag_type: str = "specific"  # 'specific' or 'broad'

    class Config:
        from_attributes = True


class LinkResponse(BaseModel):
    """
    Schema for link responses.
    Includes all link fields plus associated tags.
    """
    id: int
    url: str
    title: Optional[str]
    summary: Optional[str]
    date_saved: datetime
    tags: List[TagResponse] = []
    projects: List[ProjectMiniResponse] = []

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    due_date: Optional[datetime] = None
    linked_link_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    linked_link_id: Optional[int] = None


class TaskResponse(BaseModel):
    id: int
    project_id: int
    linked_link_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    linked_link: Optional[LinkResponse] = None

    class Config:
        from_attributes = True


class ProjectLinkResponse(BaseModel):
    project_id: int
    link_id: int
    note: Optional[str]
    priority: str
    status: str
    added_at: datetime
    link: LinkResponse

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    project_links: List[ProjectLinkResponse] = []
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True


class ProjectSummaryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    link_count: int = 0
    task_count: int = 0

    class Config:
        from_attributes = True
