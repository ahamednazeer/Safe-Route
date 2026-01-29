"""Driver management router with full CRUD operations."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.driver import Driver, AvailabilityStatus
from safe_route.models.user import User, UserRole
from safe_route.schemas.driver import DriverCreate, DriverUpdate, DriverResponse
from safe_route.services.auth import get_current_admin_user, get_current_user, get_password_hash

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("/", response_model=List[DriverResponse])
async def list_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all drivers (Admin only)."""
    from sqlalchemy.orm import joinedload
    drivers = db.query(Driver).options(joinedload(Driver.assigned_vehicle)).all()
    return drivers


@router.get("/{driver_id}", response_model=DriverResponse)
async def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific driver by ID (Accessible to all authenticated users)."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
    return driver


@router.post("/", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(
    driver_data: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new driver with user account (Admin only)."""
    # Check if username exists
    if db.query(User).filter(User.username == driver_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == driver_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )
    
    # Check if license number exists
    if db.query(Driver).filter(Driver.license_number == driver_data.license_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License number already registered",
        )
    
    # Create user account for driver
    user = User(
        username=driver_data.username,
        email=driver_data.email,
        password_hash=get_password_hash(driver_data.password),
        first_name=driver_data.first_name,
        last_name=driver_data.last_name,
        phone=driver_data.phone,
        role=UserRole.DRIVER,
    )
    db.add(user)
    db.flush()  # Get user.id without committing
    
    # Create driver profile
    driver = Driver(
        user_id=user.id,
        license_number=driver_data.license_number,
        license_expiry=driver_data.license_expiry,
        emergency_contact=driver_data.emergency_contact,
        emergency_phone=driver_data.emergency_phone,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    
    return driver


@router.put("/{driver_id}", response_model=DriverResponse)
async def update_driver(
    driver_id: int,
    driver_data: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update an existing driver (Admin only)."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
    
    # Check license number uniqueness if being updated
    if driver_data.license_number and driver_data.license_number != driver.license_number:
        existing = db.query(Driver).filter(
            Driver.license_number == driver_data.license_number
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="License number already registered",
            )
    
    # Update fields
    update_data = driver_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(driver, field, value)
    
    db.commit()
    db.refresh(driver)
    
    return driver


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a driver and their user account (Admin only)."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
    
    # Get associated user
    user = db.query(User).filter(User.id == driver.user_id).first()
    
    # Delete driver first (due to foreign key)
    db.delete(driver)
    
    # Deactivate user rather than delete (for audit purposes)
    if user:
        user.is_active = False
    
    db.commit()
    return None


@router.patch("/{driver_id}/status", response_model=DriverResponse)
async def update_driver_status(
    driver_id: int,
    status: AvailabilityStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update driver availability status (Admin only)."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
    
    driver.availability_status = status
    db.commit()
    db.refresh(driver)
    
    return driver
