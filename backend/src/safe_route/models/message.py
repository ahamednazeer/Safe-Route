"""Message model for driver-employee communication."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from safe_route.database import Base


class Message(Base):
    """In-trip messaging between driver and employee."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    # Relationships
    trip = relationship("Trip", backref="messages")
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_messages")
