"""SOS-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from safe_route.models.sos import SOSStatus


class SOSCreate(BaseModel):
    """Schema for triggering SOS."""
    lat: float
    lng: float
    trip_id: Optional[int] = None
    notes: Optional[str] = None


class SOSResolve(BaseModel):
    """Schema for resolving SOS."""
    notes: Optional[str] = None


class SOSResponse(BaseModel):
    """Schema for SOS response."""
    id: int
    user_id: int
    trip_id: Optional[int]
    lat: float
    lng: float
    status: SOSStatus
    notes: Optional[str]
    triggered_at: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    resolved_by: Optional[int]

    class Config:
        from_attributes = True
