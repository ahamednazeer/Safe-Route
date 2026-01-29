"""Message router for in-trip communication."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.message import Message
from safe_route.models.trip import Trip
from safe_route.models.user import User
from safe_route.schemas.message import MessageCreate, MessageResponse
from safe_route.services.auth import get_current_user

router = APIRouter(prefix="/trips/{trip_id}/messages", tags=["Messages"])


@router.get("/", response_model=List[MessageResponse])
async def get_trip_messages(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages for a trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    messages = db.query(Message).filter(
        Message.trip_id == trip_id
    ).order_by(Message.sent_at.asc()).all()

    return messages


@router.post("/", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    trip_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message in a trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    message = Message(
        trip_id=trip_id,
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        content=message_data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.patch("/{message_id}/read", response_model=MessageResponse)
async def mark_message_read(
    trip_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a message as read."""
    from datetime import datetime

    message = db.query(Message).filter(
        Message.id == message_id,
        Message.trip_id == trip_id,
        Message.receiver_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.read_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    return message
