"""Driver location model for GPS tracking."""

from datetime import datetime

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from safe_route.database import Base


class DriverLocation(Base):
    """Real-time driver GPS location."""

    __tablename__ = "driver_locations"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    heading = Column(Float, nullable=True)  # Direction in degrees
    speed = Column(Float, nullable=True)  # Speed in km/h
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    driver = relationship("Driver", backref="locations")
    trip = relationship("Trip", backref="locations")
