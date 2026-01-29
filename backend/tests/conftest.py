"""Pytest configuration and fixtures."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from safe_route.database import Base, get_db
from safe_route.main import app


# Create test database in memory
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with the test database."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token(client, db):
    """Create an admin user and return the auth token."""
    from safe_route.models.user import User, UserRole
    from safe_route.services.auth import get_password_hash
    
    admin = User(
        username="testadmin",
        email="testadmin@test.com",
        password_hash=get_password_hash("testpass123"),
        first_name="Test",
        last_name="Admin",
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()
    
    response = client.post(
        "/auth/login",
        json={"username": "testadmin", "password": "testpass123"}
    )
    return response.json()["access_token"]
