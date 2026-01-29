"""Route-related Pydantic schemas."""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from safe_route.models.route import RouteType


class RouteStopCreate(BaseModel):
    """Schema for adding a stop to a route."""
    employee_id: int
    sequence_order: int


class RouteStopResponse(BaseModel):
    """Schema for route stop response."""
    id: int
    route_id: int
    employee_id: int
    sequence_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class RouteBase(BaseModel):
    """Base route schema."""
    name: str = Field(..., min_length=1, max_length=100)
    route_type: RouteType = RouteType.PICKUP


class RouteCreate(RouteBase):
    """Schema for creating a route."""
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    stops: Optional[List[RouteStopCreate]] = None



class RouteStopUpdate(BaseModel):
    """Schema for updating a route stop."""
    sequence_order: Optional[int] = None
    employee_id: Optional[int] = None


class RouteUpdate(BaseModel):
    """Schema for updating a route."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    route_type: Optional[RouteType] = None
    is_active: Optional[bool] = None


class RouteResponse(BaseModel):
    """Schema for route response."""
    id: int
    name: str
    driver_id: Optional[int]
    vehicle_id: Optional[int]
    route_type: RouteType
    is_active: bool
    created_at: datetime
    stops: List[RouteStopResponse] = []

    class Config:
        from_attributes = True
