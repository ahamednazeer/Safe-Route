"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from safe_route.config import get_settings
from safe_route.database import Base, engine
from safe_route.routers import auth, drivers, employees, vehicles, routes, trips, location, messages, sos, audit
from safe_route.models import User, Driver, Employee, Vehicle, Route, RouteStop, Trip, DriverLocation, Message, SOSAlert  # noqa: F401


settings = get_settings()

# CORS logic
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    import json
    try:
        origins = json.loads(origins)
    except Exception:
        origins = [o.strip() for o in origins.split(",") if o.strip()]

print(f"DEBUG: CORS Origins: {origins}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Seed admin user if not exists
    from sqlalchemy.orm import Session
    from safe_route.database import SessionLocal
    from safe_route.models.user import UserRole
    from safe_route.services.auth import get_password_hash
    
    db: Session = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@saferoute.com",
                password_hash=get_password_hash("admin123"),
                first_name="System",
                last_name="Admin",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            print("✓ Admin user created (admin / admin123)")
    finally:
        db.close()
    
    yield
    # Shutdown: Nothing to do


app = FastAPI(
    title=settings.APP_NAME,
    description="Safe Route - Web-based safety and route-tracking system (Debug CORS)",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(drivers.router)
app.include_router(employees.router)
app.include_router(vehicles.router)
app.include_router(routes.router)
app.include_router(trips.router)
app.include_router(location.router)
app.include_router(messages.router)
app.include_router(sos.router)
app.include_router(audit.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
