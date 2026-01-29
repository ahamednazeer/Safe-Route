"""Employee-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from safe_route.schemas.user import UserResponse


class EmployeeBase(BaseModel):
    """Base employee schema."""
    pickup_address: Optional[str] = Field(None, max_length=255)
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: Optional[str] = Field(None, max_length=255)
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None


class EmployeeCreate(EmployeeBase):
    """Schema for creating employee with user."""
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)


class EmployeeUpdate(BaseModel):
    """Schema for updating employee."""
    pickup_address: Optional[str] = Field(None, max_length=255)
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: Optional[str] = Field(None, max_length=255)
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None


class EmployeeResponse(BaseModel):
    """Schema for employee response."""
    id: int
    user_id: int
    pickup_address: Optional[str]
    pickup_lat: Optional[float]
    pickup_lng: Optional[float]
    drop_address: Optional[str]
    drop_lat: Optional[float]
    drop_lng: Optional[float]
    created_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True
