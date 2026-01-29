"""Trip model for trip lifecycle management."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from safe_route.database import Base


class TripStatus(str, PyEnum):
    """Trip lifecycle states."""
    SCHEDULED = "SCHEDULED"
    STARTED = "STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trip(Base):
    """Trip instance with status tracking."""

    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    status = Column(Enum(TripStatus), default=TripStatus.SCHEDULED, nullable=False)
    scheduled_time = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    route = relationship("Route", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    vehicle = relationship("Vehicle", back_populates="trips")
