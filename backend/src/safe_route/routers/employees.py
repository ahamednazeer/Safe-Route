"""Employee management router with CRUD operations."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.employee import Employee
from safe_route.models.user import User, UserRole
from safe_route.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from safe_route.services.auth import get_current_admin_user, get_current_user, get_password_hash

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/me", response_model=EmployeeResponse)
async def get_me_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current logged-in employee profile."""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return employee


@router.get("/", response_model=List[EmployeeResponse])
async def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all employees (Admin only)."""
    employees = db.query(Employee).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific employee by ID."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new employee with user account."""
    if db.query(User).filter(User.username == employee_data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == employee_data.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=employee_data.username,
        email=employee_data.email,
        password_hash=get_password_hash(employee_data.password),
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        phone=employee_data.phone,
        role=UserRole.EMPLOYEE,
    )
    db.add(user)
    db.flush()

    employee = Employee(
        user_id=user.id,
        pickup_address=employee_data.pickup_address,
        pickup_lat=employee_data.pickup_lat,
        pickup_lng=employee_data.pickup_lng,
        drop_address=employee_data.drop_address,
        drop_lat=employee_data.drop_lat,
        drop_lng=employee_data.drop_lng,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update an employee."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = employee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete an employee."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    user = db.query(User).filter(User.id == employee.user_id).first()
    db.delete(employee)
    if user:
        user.is_active = False
    db.commit()
    return None
