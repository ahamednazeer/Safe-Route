"""Route and RouteStop models for route management."""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from safe_route.database import Base


class RouteType(str, PyEnum):
    """Route type - pickup or drop."""
    PICKUP = "PICKUP"
    DROP = "DROP"


class Route(Base):
    """Route definition with driver and vehicle assignment."""

    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    route_type = Column(Enum(RouteType), default=RouteType.PICKUP, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    driver = relationship("Driver", back_populates="routes")
    vehicle = relationship("Vehicle", back_populates="routes")
    stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.sequence_order")
    trips = relationship("Trip", back_populates="route")


class RouteStop(Base):
    """Individual stop in a route with sequence order."""

    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    route = relationship("Route", back_populates="stops")
    employee = relationship("Employee", back_populates="route_stops")
