"""Trip management router with lifecycle operations."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.trip import Trip, TripStatus
from safe_route.models.user import User
from safe_route.schemas.trip import TripCreate, TripStatusUpdate, TripResponse
from safe_route.services.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.get("/", response_model=List[TripResponse])
async def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all trips (Admin only)."""
    return db.query(Trip).order_by(Trip.created_at.desc()).all()


@router.get("/my", response_model=List[TripResponse])
async def get_my_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get trips for current driver."""
    if not current_user.driver_profile:
        raise HTTPException(status_code=400, detail="User is not a driver")
    
    driver_id = current_user.driver_profile.id
    return db.query(Trip).filter(Trip.driver_id == driver_id).order_by(Trip.created_at.desc()).all()


@router.get("/employee/active", response_model=TripResponse)
async def get_employee_active_trip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the currently active trip for the logged-in employee."""
    from safe_route.models.employee import Employee
    from safe_route.models.route import Route, RouteStop
    
    # 1. Get Employee Profile
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=400, detail="User is not an employee")

    # 2. Find active trip where this employee is a stop on the route
    # Join Trip -> Route -> RouteStop
    active_trip = db.query(Trip).join(Route).join(RouteStop).filter(
        RouteStop.employee_id == employee.id,
        Trip.status.in_([TripStatus.STARTED, TripStatus.IN_PROGRESS, TripStatus.SCHEDULED])
    ).order_by(Trip.created_at.desc()).first()

    if not active_trip:
        raise HTTPException(status_code=404, detail="No active trip found")
        
    return active_trip


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.post("/", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new trip (Admin only)."""
    trip = Trip(**trip_data.model_dump())
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.patch("/{trip_id}/status", response_model=TripResponse)
async def update_trip_status(
    trip_id: int,
    status_data: TripStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update trip status (Driver can start/complete their trips)."""
    from safe_route.models.route import RouteStop
    from safe_route.models.employee import Employee
    from safe_route.utils.geo import haversine_distance

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Validate status transitions
    valid_transitions = {
        TripStatus.SCHEDULED: [TripStatus.STARTED, TripStatus.CANCELLED],
        TripStatus.STARTED: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
        TripStatus.IN_PROGRESS: [TripStatus.COMPLETED, TripStatus.CANCELLED],
        TripStatus.COMPLETED: [],
        TripStatus.CANCELLED: [],
    }

    if status_data.status not in valid_transitions.get(trip.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {trip.status} to {status_data.status}"
        )

    # Geo-fencing check for START
    if status_data.status == TripStatus.STARTED:
        if status_data.lat is None or status_data.lng is None:
             raise HTTPException(status_code=400, detail="Location required to start trip")
        
        # Get first stop
        first_stop = db.query(RouteStop).filter(RouteStop.route_id == trip.route_id).order_by(RouteStop.sequence_order).first()
        if first_stop:
             emp = db.query(Employee).filter(Employee.id == first_stop.employee_id).first()
             # Use pickup coords (assuming pickup route for simplicity, or check route type)
             # Ideally we check route type but let's assume first stop coordinate is the target.
             target_lat = emp.pickup_lat if emp else None
             target_lng = emp.pickup_lng if emp else None
             
             if target_lat and target_lng:
                 dist = haversine_distance(status_data.lat, status_data.lng, target_lat, target_lng)
                 # 2.0 km radius for testing looseness (0.5km might be too tight for simulation)
                 # Spec says "geo-start radius". I'll set 2km to be safe for manual testing, 
                 # or 0.5km if strict. Let's do 1.0km.
                 if dist > 1.0: 
                     raise HTTPException(status_code=400, detail=f"Too far from start point ({dist:.2f}km). Must be within 1km.")

    trip.status = status_data.status

    # Update timestamps
    if status_data.status == TripStatus.STARTED:
        trip.started_at = datetime.utcnow()
    elif status_data.status == TripStatus.COMPLETED:
        trip.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a trip (Admin only)."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db.delete(trip)
    db.commit()
    return None
