"""Message-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MessageCreate(BaseModel):
    """Schema for creating a message."""
    receiver_id: int
    content: str


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: int
    trip_id: int
    sender_id: int
    receiver_id: int
    content: str
    sent_at: datetime
    read_at: Optional[datetime]

    class Config:
        from_attributes = True
