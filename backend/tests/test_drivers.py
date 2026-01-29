"""Tests for driver management endpoints."""

from datetime import date, timedelta


def test_list_drivers_requires_admin(client):
    """Test listing drivers requires admin role."""
    # No auth
    response = client.get("/drivers/")
    assert response.status_code == 401


def test_list_drivers_empty(client, admin_token):
    """Test listing drivers when none exist."""
    response = client.get(
        "/drivers/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json() == []


def test_create_driver(client, admin_token):
    """Test creating a new driver."""
    driver_data = {
        "username": "driver1",
        "email": "driver1@test.com",
        "password": "password123",
        "first_name": "John",
        "last_name": "Driver",
        "phone": "+1234567890",
        "license_number": "DL12345678",
        "license_expiry": str(date.today() + timedelta(days=365)),
        "emergency_contact": "Jane Doe",
        "emergency_phone": "+0987654321"
    }
    
    response = client.post(
        "/drivers/",
        json=driver_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["license_number"] == "DL12345678"
    assert data["user"]["first_name"] == "John"
    assert data["availability_status"] == "OFF_DUTY"


def test_create_driver_duplicate_license(client, admin_token):
    """Test creating driver fails with duplicate license."""
    driver_data = {
        "username": "dup_driver1",
        "email": "dup1@test.com",
        "password": "password123",
        "first_name": "First",
        "last_name": "Driver",
        "license_number": "DUPLICATE123",
        "license_expiry": str(date.today() + timedelta(days=365)),
    }
    client.post(
        "/drivers/",
        json=driver_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    driver_data["username"] = "dup_driver2"
    driver_data["email"] = "dup2@test.com"
    response = client.post(
        "/drivers/",
        json=driver_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 400
    assert "license" in response.json()["detail"].lower()


def test_get_driver(client, admin_token):
    """Test getting a specific driver."""
    # Create driver first
    driver_data = {
        "username": "getdriver",
        "email": "getdriver@test.com",
        "password": "password123",
        "first_name": "Get",
        "last_name": "Driver",
        "license_number": "GET123456",
        "license_expiry": str(date.today() + timedelta(days=365)),
    }
    create_response = client.post(
        "/drivers/",
        json=driver_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    driver_id = create_response.json()["id"]
    
    # Get driver
    response = client.get(
        f"/drivers/{driver_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["license_number"] == "GET123456"


def test_get_driver_not_found(client, admin_token):
    """Test getting non-existent driver returns 404."""
    response = client.get(
        "/drivers/99999",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 404


def test_update_driver(client, admin_token):
    """Test updating a driver."""
    # Create driver
    driver_data = {
        "username": "updatedriver",
        "email": "update@test.com",
        "password": "password123",
        "first_name": "Update",
        "last_name": "Driver",
        "license_number": "UPDATE123",
        "license_expiry": str(date.today() + timedelta(days=365)),
    }
    create_response = client.post(
        "/drivers/",
        json=driver_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    driver_id = create_response.json()["id"]
    
    # Update driver
    response = client.put(
        f"/drivers/{driver_id}",
        json={
            "emergency_contact": "Emergency Person",
            "availability_status": "AVAILABLE"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["emergency_contact"] == "Emergency Person"
    assert data["availability_status"] == "AVAILABLE"


def test_delete_driver(client, admin_token):
    """Test deleting a driver."""
    # Create driver
    driver_data = {
        "username": "deletedriver",
        "email": "delete@test.com",
        "password": "password123",
        "first_name": "Delete",
        "last_name": "Driver",
        "license_number": "DELETE123",
        "license_expiry": str(date.today() + timedelta(days=365)),
    }
    create_response = client.post(
        "/drivers/",
        json=driver_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    driver_id = create_response.json()["id"]
    
    # Delete driver
    response = client.delete(
        f"/drivers/{driver_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 204
    
    # Verify deleted
    response = client.get(
        f"/drivers/{driver_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 404
