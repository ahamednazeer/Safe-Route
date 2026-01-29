"""SOS router for emergency handling."""

from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.sos import SOSAlert, SOSStatus
from safe_route.models.user import User
from safe_route.schemas.sos import SOSCreate, SOSResolve, SOSResponse
from safe_route.services.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/sos", tags=["SOS"])


@router.post("/", response_model=SOSResponse, status_code=status.HTTP_201_CREATED)
async def trigger_sos(
    sos_data: SOSCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger an SOS alert."""
    alert = SOSAlert(
        user_id=current_user.id,
        trip_id=sos_data.trip_id,
        lat=sos_data.lat,
        lng=sos_data.lng,
        notes=sos_data.notes,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # TODO: Send notifications (SMS, Email, Push)
    # In production, integrate with notification service

    return alert


@router.get("/", response_model=List[SOSResponse])
async def get_sos_alerts(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get all SOS alerts (Admin only)."""
    query = db.query(SOSAlert)
    if active_only:
        query = query.filter(SOSAlert.status == SOSStatus.ACTIVE)
    return query.order_by(SOSAlert.triggered_at.desc()).all()


@router.get("/{alert_id}", response_model=SOSResponse)
async def get_sos_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific SOS alert."""
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/acknowledge", response_model=SOSResponse)
async def acknowledge_sos(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Acknowledge an SOS alert."""
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status != SOSStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Alert is not active")

    alert.status = SOSStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{alert_id}/resolve", response_model=SOSResponse)
async def resolve_sos(
    alert_id: int,
    resolve_data: SOSResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Resolve an SOS alert."""
    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status == SOSStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Alert already resolved")

    alert.status = SOSStatus.RESOLVED
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    if resolve_data.notes:
        alert.notes = (alert.notes or "") + f"\n[Resolution] {resolve_data.notes}"
    db.commit()
    db.refresh(alert)
    return alert
