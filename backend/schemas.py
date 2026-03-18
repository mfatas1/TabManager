from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional, List


class LinkCreate(BaseModel):
    """
    Schema for creating a new link.
    Just needs a URL for now.
    """
    url: str


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

    class Config:
        from_attributes = True
