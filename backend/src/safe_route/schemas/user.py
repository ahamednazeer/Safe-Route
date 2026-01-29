"""User-related Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from safe_route.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.EMPLOYEE


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """Schema for updating a user (all fields optional)."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Schema for login request."""
    username: str
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for decoded token data."""
    username: Optional[str] = None
    user_id: Optional[int] = None
