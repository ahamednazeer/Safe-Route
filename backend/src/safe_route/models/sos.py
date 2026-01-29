"""SOS Alert model for emergency handling."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship

from safe_route.database import Base


class SOSStatus(str, PyEnum):
    """SOS alert status."""
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class SOSAlert(Base):
    """Emergency SOS alert with location."""

    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(Enum(SOSStatus), default=SOSStatus.ACTIVE, nullable=False)
    notes = Column(Text, nullable=True)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="sos_alerts")
    trip = relationship("Trip", backref="sos_alerts")
    resolver = relationship("User", foreign_keys=[resolved_by])
