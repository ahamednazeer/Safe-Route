"""Vehicle management router with CRUD operations."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.vehicle import Vehicle
from safe_route.models.driver import Driver
from safe_route.models.user import User
from safe_route.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from safe_route.services.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("/", response_model=List[VehicleResponse])
async def list_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all vehicles."""
    return db.query(Vehicle).all()


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


from safe_route.services.audit import AuditLogger

@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new vehicle."""
    if db.query(Vehicle).filter(Vehicle.vehicle_number == vehicle_data.vehicle_number).first():
        raise HTTPException(status_code=400, detail="Vehicle number already exists")

    if vehicle_data.assigned_driver_id:
        driver = db.query(Driver).filter(Driver.id == vehicle_data.assigned_driver_id).first()
        if not driver:
            raise HTTPException(status_code=400, detail="Driver not found")
        
        # Check if driver is already assigned
        existing_assignment = db.query(Vehicle).filter(
            Vehicle.assigned_driver_id == vehicle_data.assigned_driver_id,
            Vehicle.is_active == True
        ).first()
        if existing_assignment:
            raise HTTPException(status_code=400, detail=f"Driver is already assigned to active vehicle {existing_assignment.vehicle_number}")

    vehicle = Vehicle(**vehicle_data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    
    AuditLogger.log(
        db=db,
        action="VEHICLE_CREATED",
        user_id=current_user.id,
        entity_type="VEHICLE",
        entity_id=vehicle.id,
        details=f"Created vehicle {vehicle.vehicle_number}"
    )

    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    vehicle_data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update a vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if vehicle_data.vehicle_number and vehicle_data.vehicle_number != vehicle.vehicle_number:
        if db.query(Vehicle).filter(Vehicle.vehicle_number == vehicle_data.vehicle_number).first():
            raise HTTPException(status_code=400, detail="Vehicle number already exists")

    if vehicle_data.assigned_driver_id and vehicle_data.assigned_driver_id != vehicle.assigned_driver_id:
        # Check if driver is already assigned to ANOTHER active vehicle
        existing_assignment = db.query(Vehicle).filter(
            Vehicle.assigned_driver_id == vehicle_data.assigned_driver_id,
            Vehicle.is_active == True,
            Vehicle.id != vehicle_id
        ).first()
        if existing_assignment:
            raise HTTPException(status_code=400, detail=f"Driver is already assigned to active vehicle {existing_assignment.vehicle_number}")

    update_data = vehicle_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)

    AuditLogger.log(
        db=db,
        action="VEHICLE_UPDATED",
        user_id=current_user.id,
        entity_type="VEHICLE",
        entity_id=vehicle.id,
        details=f"Updated vehicle {vehicle.vehicle_number}"
    )

    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(vehicle)
    db.commit()
    return None
