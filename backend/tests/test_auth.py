"""Tests for authentication endpoints."""

import pytest


def test_root_endpoint(client):
    """Test root endpoint returns app info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Safe Route"
    assert data["status"] == "running"


def test_health_endpoint(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_user(client):
    """Test user registration."""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@test.com",
            "password": "password123",
            "first_name": "Test",
            "last_name": "User",
            "role": "EMPLOYEE"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@test.com"
    assert data["role"] == "EMPLOYEE"


def test_register_duplicate_username(client):
    """Test registration fails with duplicate username."""
    user_data = {
        "username": "duplicate",
        "email": "dup1@test.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User",
        "role": "EMPLOYEE"
    }
    client.post("/auth/register", json=user_data)
    
    user_data["email"] = "dup2@test.com"
    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_success(client):
    """Test successful login."""
    # Register user first
    client.post(
        "/auth/register",
        json={
            "username": "logintest",
            "email": "login@test.com",
            "password": "password123",
            "first_name": "Login",
            "last_name": "Test",
            "role": "EMPLOYEE"
        }
    )
    
    # Login
    response = client.post(
        "/auth/login",
        json={"username": "logintest", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "logintest"


def test_login_invalid_credentials(client):
    """Test login fails with wrong password."""
    client.post(
        "/auth/register",
        json={
            "username": "wrongpass",
            "email": "wrong@test.com",
            "password": "password123",
            "first_name": "Wrong",
            "last_name": "Pass",
            "role": "EMPLOYEE"
        }
    )
    
    response = client.post(
        "/auth/login",
        json={"username": "wrongpass", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_get_me(client, admin_token):
    """Test getting current user info."""
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testadmin"
    assert data["role"] == "ADMIN"


def test_get_me_unauthorized(client):
    """Test /me endpoint requires authentication."""
    response = client.get("/auth/me")
    assert response.status_code == 401
