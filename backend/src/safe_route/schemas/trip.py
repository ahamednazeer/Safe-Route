"""Trip-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from safe_route.models.trip import TripStatus


class TripCreate(BaseModel):
    """Schema for creating a trip."""
    route_id: int
    driver_id: int
    vehicle_id: int
    scheduled_time: Optional[datetime] = None


class TripUpdate(BaseModel):
    """Schema for updating a trip."""
    scheduled_time: Optional[datetime] = None


class TripStatusUpdate(BaseModel):
    """Schema for updating trip status."""
    status: TripStatus
    lat: Optional[float] = None
    lng: Optional[float] = None


class TripResponse(BaseModel):
    """Schema for trip response."""
    id: int
    route_id: int
    driver_id: int
    vehicle_id: int
    status: TripStatus
    scheduled_time: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
