"""Driver-related Pydantic schemas for request/response validation."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from safe_route.models.driver import AvailabilityStatus
from safe_route.schemas.user import UserResponse


class DriverBase(BaseModel):
    """Base driver schema with common fields."""
    license_number: str = Field(..., min_length=5, max_length=50)
    license_expiry: date
    emergency_contact: Optional[str] = Field(None, max_length=100)
    emergency_phone: Optional[str] = Field(None, max_length=20)


class DriverCreate(DriverBase):
    """Schema for creating a new driver (requires user info)."""
    # User fields for creating the user account
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)


class DriverUpdate(BaseModel):
    """Schema for updating a driver (all fields optional)."""
    license_number: Optional[str] = Field(None, min_length=5, max_length=50)
    license_expiry: Optional[date] = None
    emergency_contact: Optional[str] = Field(None, max_length=100)
    emergency_phone: Optional[str] = Field(None, max_length=20)
    availability_status: Optional[AvailabilityStatus] = None



class VehicleSummary(BaseModel):
    """Minimal vehicle info for driver profile."""
    id: int
    vehicle_number: str
    car_type: str
    capacity: int

    class Config:
        from_attributes = True


class DriverResponse(BaseModel):
    """Schema for driver response with user info."""
    id: int
    user_id: int
    license_number: str
    license_expiry: date
    emergency_contact: Optional[str]
    emergency_phone: Optional[str]
    availability_status: AvailabilityStatus
    created_at: datetime
    user: UserResponse
    assigned_vehicle: Optional[VehicleSummary] = None

    class Config:
        from_attributes = True
