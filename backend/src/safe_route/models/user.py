"""User model for authentication and authorization."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship

from safe_route.database import Base


class UserRole(str, PyEnum):
    """User roles for access control."""
    ADMIN = "ADMIN"
    DRIVER = "DRIVER"
    EMPLOYEE = "EMPLOYEE"


class User(Base):
    """User model for all system users."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    employee_profile = relationship("Employee", back_populates="user", uselist=False)
