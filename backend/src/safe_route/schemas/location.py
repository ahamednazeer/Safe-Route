"""Location-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LocationUpdate(BaseModel):
    """Schema for updating driver location."""
    lat: float
    lng: float
    heading: Optional[float] = None
    speed: Optional[float] = None
    trip_id: Optional[int] = None


class LocationResponse(BaseModel):
    """Schema for location response."""
    id: int
    driver_id: int
    trip_id: Optional[int]
    lat: float
    lng: float
    heading: Optional[float]
    speed: Optional[float]
    timestamp: datetime

    class Config:
        from_attributes = True
