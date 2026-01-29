"""Audit Logging Service."""

from sqlalchemy.orm import Session
from safe_route.models.audit import AuditLog

class AuditLogger:
    @staticmethod
    def log(
        db: Session,
        action: str,
        user_id: int = None,
        entity_type: str = None,
        entity_id: int = None,
        details: str = None,
        ip_address: str = None
    ):
        """
        Create an audit log entry.
        
        Args:
            db: Database session
            action: Action name (e.g. "LOGIN_SUCCESS", "TRIP_START")
            user_id: ID of user performing action (optional)
            entity_type: Type of entity affected (e.g. "TRIP")
            entity_id: ID of entity affected
            details: Additional context
            ip_address: Client IP
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
                ip_address=ip_address
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            # Fallback logging to file/console if DB fails, to ensure we don't crash the main flow
            print(f"CRITICAL: Failed to write audit log! {e}")
            db.rollback()
