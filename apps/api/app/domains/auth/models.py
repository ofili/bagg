from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("usr_"))
    email = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class MagicLoginCode(Base):
    __tablename__ = "magic_login_codes"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("mgc_"))
    email = Column(String, index=True, nullable=False)
    code_hash = Column(String, nullable=False)
    token = Column(String, unique=True, index=True, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_magic_email_expires", "email", "expires_at"),
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True)  # session token hash
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="sessions")
