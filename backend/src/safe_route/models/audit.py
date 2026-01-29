"""Audit Log model for system traceability."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from safe_route.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for system events or failed logins
    action = Column(String, nullable=False) # e.g., "LOGIN", "TRIP_START", "SOS_TRIGGER"
    entity_type = Column(String, nullable=True) # e.g., "TRIP", "USER", "ROUTE"
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True) # JSON string or text description
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
