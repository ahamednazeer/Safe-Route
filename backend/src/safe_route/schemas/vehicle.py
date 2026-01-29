"""Vehicle-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from safe_route.models.vehicle import CarType


class VehicleBase(BaseModel):
    """Base vehicle schema."""
    vehicle_number: str = Field(..., min_length=3, max_length=20)
    car_type: CarType = CarType.SEDAN
    capacity: int = Field(default=4, ge=1, le=50)


class VehicleCreate(VehicleBase):
    """Schema for creating a vehicle."""
    assigned_driver_id: Optional[int] = None


class VehicleUpdate(BaseModel):
    """Schema for updating a vehicle."""
    vehicle_number: Optional[str] = Field(None, min_length=3, max_length=20)
    car_type: Optional[CarType] = None
    capacity: Optional[int] = Field(None, ge=1, le=50)
    assigned_driver_id: Optional[int] = None
    is_active: Optional[bool] = None


class VehicleResponse(BaseModel):
    """Schema for vehicle response."""
    id: int
    vehicle_number: str
    car_type: CarType
    capacity: int
    assigned_driver_id: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
