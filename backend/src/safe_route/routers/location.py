"""Location tracking router with WebSocket support."""

from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.location import DriverLocation
from safe_route.models.user import User
from safe_route.schemas.location import LocationUpdate, LocationResponse
from safe_route.services.auth import get_current_user

router = APIRouter(prefix="/location", tags=["Location"])

# Store active WebSocket connections
active_connections: dict[int, WebSocket] = {}


@router.post("/", response_model=LocationResponse)
async def update_location(
    location_data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update driver's current location."""
    if not current_user.driver_profile:
        raise HTTPException(status_code=400, detail="User is not a driver")

    location = DriverLocation(
        driver_id=current_user.driver_profile.id,
        trip_id=location_data.trip_id,
        lat=location_data.lat,
        lng=location_data.lng,
        heading=location_data.heading,
        speed=location_data.speed,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.get("/driver/{driver_id}", response_model=LocationResponse)
async def get_driver_location(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get latest location for a driver."""
    location = db.query(DriverLocation).filter(
        DriverLocation.driver_id == driver_id
    ).order_by(DriverLocation.timestamp.desc()).first()

    if not location:
        return None
    return location


@router.get("/all", response_model=List[LocationResponse])
async def get_all_driver_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get latest location for all drivers (Admin only)."""
    from sqlalchemy import func
    
    # Subquery to get latest timestamp per driver
    subq = db.query(
        DriverLocation.driver_id,
        func.max(DriverLocation.timestamp).label('max_ts')
    ).group_by(DriverLocation.driver_id).subquery()

    locations = db.query(DriverLocation).join(
        subq,
        (DriverLocation.driver_id == subq.c.driver_id) &
        (DriverLocation.timestamp == subq.c.max_ts)
    ).all()

    return locations


@router.websocket("/ws/{driver_id}")
async def websocket_tracking(websocket: WebSocket, driver_id: int):
    """WebSocket endpoint for real-time location updates."""
    await websocket.accept()
    active_connections[driver_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast location to all connected clients tracking this driver
            # In production, you'd store this and broadcast to subscribers
            await websocket.send_json({
                "driver_id": driver_id,
                "lat": data.get("lat"),
                "lng": data.get("lng"),
                "timestamp": datetime.utcnow().isoformat()
            })
    except WebSocketDisconnect:
        if driver_id in active_connections:
            del active_connections[driver_id]
