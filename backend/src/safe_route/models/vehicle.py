"""Vehicle model for vehicle management."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from safe_route.database import Base


class CarType(str, PyEnum):
    """Vehicle type categories."""
    SEDAN = "SEDAN"
    SUV = "SUV"
    VAN = "VAN"
    BUS = "BUS"


class Vehicle(Base):
    """Vehicle registration and assignment."""

    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(20), unique=True, nullable=False, index=True)
    car_type = Column(Enum(CarType), default=CarType.SEDAN, nullable=False)
    capacity = Column(Integer, default=4)
    assigned_driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_driver = relationship("Driver", back_populates="assigned_vehicle")
    routes = relationship("Route", back_populates="vehicle")
    trips = relationship("Trip", back_populates="vehicle")
