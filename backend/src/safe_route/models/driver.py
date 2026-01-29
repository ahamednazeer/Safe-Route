"""Driver model for driver-specific information."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from safe_route.database import Base


class AvailabilityStatus(str, PyEnum):
    """Driver availability status."""
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    OFF_DUTY = "OFF_DUTY"
    ON_LEAVE = "ON_LEAVE"


class Driver(Base):
    """Driver profile with additional driver-specific fields."""

    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    license_expiry = Column(Date, nullable=False)
    emergency_contact = Column(String(100), nullable=True)
    emergency_phone = Column(String(20), nullable=True)
    availability_status = Column(
        Enum(AvailabilityStatus),
        default=AvailabilityStatus.OFF_DUTY,
        nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="driver_profile")
    assigned_vehicle = relationship("Vehicle", back_populates="assigned_driver", uselist=False)
    routes = relationship("Route", back_populates="driver")
    trips = relationship("Trip", back_populates="driver")
