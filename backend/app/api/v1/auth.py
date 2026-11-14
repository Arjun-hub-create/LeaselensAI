import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update

from app.api.deps import CurrentAuth, DbSession, find_membership, require_csrf
from app.core.config import settings
from app.core.security import (
    dummy_password_hash,
    hash_token,
    new_token,
    verify_password,
)
from app.models import User, UserSession, Workspace

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_LOGIN = "Invalid email or password."


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)  # the cap stops huge inputs reaching Argon2


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    is_demo: bool


class MeResponse(BaseModel):
    user: UserOut
    workspace: WorkspaceOut
    role: str


def build_me(user: User, workspace: Workspace, role: str) -> MeResponse:
    return MeResponse(
        user=UserOut(id=user.id, email=user.email, display_name=user.display_name),
        workspace=WorkspaceOut(id=workspace.id, name=workspace.name, is_demo=workspace.is_demo),
        role=role,
    )


@router.post("/login", response_model=MeResponse)
def login(body: LoginRequest, response: Response, db: DbSession) -> MeResponse:
    email = body.email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

    if user is None:
        verify_password(dummy_password_hash(), body.password)  # keeps timing similar
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_LOGIN)

    password_ok = verify_password(user.password_hash, body.password)
    if not password_ok or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_LOGIN)

    membership = find_membership(db, user.id)
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has no active workspace.")
    workspace, role = membership

    session_token = new_token()
    csrf_token = new_token()
    lifetime = timedelta(hours=settings.session_ttl_hours)
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_token(session_token),
            expires_at=datetime.now(UTC) + lifetime,
        )
    )
    db.commit()

    max_age = int(lifetime.total_seconds())
    response.set_cookie(
        settings.session_cookie_name,
        session_token,
        max_age=max_age,
        httponly=True,  # page scripts cannot read the session cookie
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        httponly=False,  # the frontend must read this one and echo it in a header
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    return build_me(user, workspace, role)


@router.get("/me", response_model=MeResponse)
def me(ctx: CurrentAuth) -> MeResponse:
    return build_me(ctx.user, ctx.workspace, ctx.role)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
def logout(response: Response, ctx: CurrentAuth, db: DbSession) -> None:
    db.execute(
        update(UserSession)
        .where(UserSession.id == ctx.session_id)
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")