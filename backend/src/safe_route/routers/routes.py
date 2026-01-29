"""Route management router with CRUD and stop operations."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.route import Route, RouteStop
from safe_route.models.user import User
from safe_route.schemas.route import (
    RouteCreate, RouteUpdate, RouteResponse,
    RouteStopCreate, RouteStopResponse, RouteStopUpdate,
)
from safe_route.services.auth import get_current_admin_user

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.get("/", response_model=List[RouteResponse])
async def list_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all routes."""
    return db.query(Route).all()


@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific route with stops."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.post("/", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def create_route(
    route_data: RouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new route with optional stops."""
    route = Route(
        name=route_data.name,
        driver_id=route_data.driver_id,
        vehicle_id=route_data.vehicle_id,
        route_type=route_data.route_type,
    )
    db.add(route)
    db.flush()

    if route_data.stops:
        for stop_data in route_data.stops:
            stop = RouteStop(
                route_id=route.id,
                employee_id=stop_data.employee_id,
                sequence_order=stop_data.sequence_order,
            )
            db.add(stop)

    db.commit()
    db.refresh(route)
    return route


def check_route_locked(db: Session, route_id: int):
    """Raise 400 if route has active trips."""
    from safe_route.models.trip import Trip, TripStatus
    active_trips = db.query(Trip).filter(
        Trip.route_id == route_id,
        Trip.status.in_([TripStatus.SCHEDULED, TripStatus.STARTED, TripStatus.IN_PROGRESS])
    ).first()
    if active_trips:
         raise HTTPException(
             status_code=400, 
             detail=f"Cannot modify Route #{route_id} because it is assigned to active Trip #{active_trips.id}. Cancel or complete the trip first."
         )


@router.put("/{route_id}", response_model=RouteResponse)
async def update_route(
    route_id: int,
    route_data: RouteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update a route."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    check_route_locked(db, route_id)

    update_data = route_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(route, field, value)

    db.commit()
    db.refresh(route)
    return route


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a route and its stops."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    check_route_locked(db, route_id)

    db.query(RouteStop).filter(RouteStop.route_id == route_id).delete()
    db.delete(route)
    db.commit()
    return None


@router.post("/{route_id}/stops", response_model=RouteStopResponse, status_code=status.HTTP_201_CREATED)
async def add_route_stop(
    route_id: int,
    stop_data: RouteStopCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Add a stop to a route."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    check_route_locked(db, route_id)

    stop = RouteStop(
        route_id=route_id,
        employee_id=stop_data.employee_id,
        sequence_order=stop_data.sequence_order,
    )
    db.add(stop)
    db.commit()
    db.refresh(stop)
    return stop


@router.delete("/{route_id}/stops/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_route_stop(
    route_id: int,
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Remove a stop from a route."""
    stop = db.query(RouteStop).filter(
        RouteStop.id == stop_id,
        RouteStop.route_id == route_id
    ).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    check_route_locked(db, route_id)

    db.delete(stop)
    db.commit()
    return None


@router.put("/{route_id}/stops/{stop_id}", response_model=RouteStopResponse)
async def update_route_stop(
    route_id: int,
    stop_id: int,
    stop_data: RouteStopUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update a route stop (e.g. change sequence)."""
    stop = db.query(RouteStop).filter(
        RouteStop.id == stop_id,
        RouteStop.route_id == route_id
    ).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    check_route_locked(db, route_id)

    if stop_data.sequence_order is not None:
        stop.sequence_order = stop_data.sequence_order
    
    if stop_data.employee_id is not None:
         # Verify employee exists if changing employee
         from safe_route.models.employee import Employee
         emp = db.query(Employee).filter(Employee.id == stop_data.employee_id).first()
         if not emp:
             raise HTTPException(status_code=404, detail="Employee not found")
         stop.employee_id = stop_data.employee_id

    db.commit()
    db.refresh(stop)
    return stop


@router.post("/{route_id}/optimize", response_model=List[RouteStopResponse])
async def optimize_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Optimize route stop sequence based on nearest-neighbor distance."""
    from safe_route.models.employee import Employee
    from safe_route.utils.geo import optimize_route_sequence

    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    check_route_locked(db, route_id)
    
    stops = db.query(RouteStop).filter(RouteStop.route_id == route_id).all()
    if not stops:
        raise HTTPException(status_code=400, detail="Route has no stops")

    # mapped_stops = [{stop_obj, lat, lng}]
    mapped_stops = []
    employees_map = {}

    validation_errors = []
    
    for stop in stops:
        emp = db.query(Employee).filter(Employee.id == stop.employee_id).first()
        if not emp: continue
        
        # Determine target coordinates based on route type (PICKUP vs DROP)
        lat = emp.pickup_lat if route.route_type != "DROP" else emp.drop_lat
        lng = emp.pickup_lng if route.route_type != "DROP" else emp.drop_lng
        
        if lat is None or lng is None:
            location_type = "Pickup" if route.route_type != "DROP" else "Drop"
            validation_errors.append(f"{emp.user.first_name} {emp.user.last_name} (Missing {location_type} Coords)")
            continue

        employees_map[stop.id] = stop
        mapped_stops.append({
            "id": stop.id,
            "lat": lat,
            "lng": lng,
            "original_obj": stop
        })

    if validation_errors:
         error_msg = "Current route cannot be optimized. Missing/Invalid coordinates for: " + ", ".join(validation_errors)
         raise HTTPException(status_code=400, detail=error_msg)

    if not mapped_stops:
        raise HTTPException(status_code=400, detail="No valid coordinates found for employees on this route")

    # Start from the first stop in current sequence as the anchor
    # In a real app, this would be the Office Location or Driver Home
    start_point = (mapped_stops[0]['lat'], mapped_stops[0]['lng'])

    optimized_data = optimize_route_sequence(start_point, mapped_stops)

    # Apply new order to DB objects
    for item in optimized_data:
        stop_obj = employees_map[item['id']]
        stop_obj.sequence_order = item['sequence_order']
    
    db.commit()
    
    # Return re-queried stops
    return db.query(RouteStop).filter(RouteStop.route_id == route_id).order_by(RouteStop.sequence_order).all()
