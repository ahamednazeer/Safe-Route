"""Authentication router for login and user info endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from safe_route.database import get_db
from safe_route.models.user import User, UserRole
from safe_route.schemas.user import Token, UserResponse, UserCreate, LoginRequest
from safe_route.services.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)

from safe_route.services.audit import AuditLogger

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        # Log failed attempt (optional security feature)
        AuditLogger.log(
            db=db,
            action="LOGIN_FAILED",
            details=f"Failed login attempt for username: {credentials.username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )

    AuditLogger.log(
        db=db,
        action="LOGIN_SUCCESS",
        user_id=user.id,
        entity_type="USER",
        entity_id=user.id,
        details="User logged in via API"
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Register a new user (Admin only in production, open for demo)."""
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    AuditLogger.log(
        db=db,
        action="USER_REGISTERED",
        entity_type="USER",
        entity_id=user.id,
        details=f"New user registered: {user.username} ({user.role.value})"
    )
    
    return user
