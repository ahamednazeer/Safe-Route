"""Audit Log Router."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from safe_route.database import get_db
from safe_route.models.audit import AuditLog
from safe_route.models.user import User
from safe_route.services.auth import get_current_admin_user

router = APIRouter(prefix="/audit", tags=["Audit"])

class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_id: int | None
    entity_type: str | None
    entity_id: int | None
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get system audit logs (Admin only)."""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
