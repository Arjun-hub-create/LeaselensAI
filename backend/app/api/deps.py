import secrets
import uuid
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_token
from app.db.session import get_session_factory
from app.models import User, UserSession, Workspace, WorkspaceMembership

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def get_db() -> Iterator[Session]:
    """One database session per request, always closed afterwards."""
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


@dataclass
class AuthContext:
    user: User
    workspace: Workspace
    role: str
    session_id: uuid.UUID


def find_membership(db: Session, user_id: uuid.UUID) -> tuple[Workspace, str] | None:
    """The user's workspace and role. The MVP uses the oldest membership if there are several."""
    row = db.execute(
        select(Workspace, WorkspaceMembership.role)
        .join(WorkspaceMembership, WorkspaceMembership.workspace_id == Workspace.id)
        .where(WorkspaceMembership.user_id == user_id, Workspace.status == "active")
        .order_by(WorkspaceMembership.created_at)
    ).first()
    if row is None:
        return None
    workspace, role = row
    return workspace, role


def get_auth_context(request: Request, db: DbSession) -> AuthContext:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")

    row = db.execute(
        select(UserSession, User)
        .join(User, User.id == UserSession.user_id)
        .where(
            UserSession.token_hash == hash_token(token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(UTC),
            User.is_active.is_(True),
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")
    user_session, user = row

    membership = find_membership(db, user.id)
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has no active workspace.")
    workspace, role = membership
    return AuthContext(user=user, workspace=workspace, role=role, session_id=user_session.id)


CurrentAuth = Annotated[AuthContext, Depends(get_auth_context)]


def require_csrf(request: Request) -> None:
    """Double-submit check: the cookie value must match the X-CSRF-Token header on unsafe methods."""
    if request.method in SAFE_METHODS:
        return
    cookie = request.cookies.get(settings.csrf_cookie_name)
    header = request.headers.get("x-csrf-token")
    if not cookie or not header or not secrets.compare_digest(cookie.encode(), header.encode()):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF token missing or invalid.")
def require_roles(*allowed_roles: str) -> Callable[..., AuthContext]:
    """Dependency factory: the caller must hold one of these roles.

    It also enforces the CSRF header on unsafe methods (POST, PATCH, DELETE).
    Order of checks: logged in (401), CSRF (403), role (403).
    """

    def checker(request: Request, ctx: CurrentAuth) -> AuthContext:
        require_csrf(request)
        if ctx.role not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to do this.")
        return ctx

    return checker
