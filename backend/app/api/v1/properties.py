import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AuthContext, CurrentAuth, DbSession, require_roles
from app.api.utils import escape_like
from app.models import Property
from app.schemas.property import (
    PropertyCreate,
    PropertyOut,
    PropertyPage,
    PropertyStatus,
    PropertyType,
    PropertyUpdate,
)

router = APIRouter(prefix="/properties", tags=["properties"])

WriteAuth = Annotated[AuthContext, Depends(require_roles("admin", "property_manager"))]

# These columns cannot be NULL in the database, so a PATCH may not set them to null.
NON_NULLABLE_FIELDS = {"name", "property_type", "address", "city", "country_code", "status"}





def get_owned_property(db: DbSession, ctx: AuthContext, property_id: uuid.UUID) -> Property:
    """Load a property only if it belongs to the caller's workspace. Otherwise it is simply 'not found'."""
    prop = db.execute(
        select(Property).where(
            Property.id == property_id,
            Property.workspace_id == ctx.workspace.id,
        )
    ).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found.")
    return prop


@router.get("", response_model=PropertyPage)
def list_properties(
    ctx: CurrentAuth,
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[PropertyStatus | None, Query(alias="status")] = None,
    property_type: PropertyType | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PropertyPage:
    conditions = [Property.workspace_id == ctx.workspace.id]
    if q and q.strip():
        pattern = f"%{escape_like(q.strip())}%"
        conditions.append(
            or_(
                Property.name.ilike(pattern, escape="\\"),
                Property.property_code.ilike(pattern, escape="\\"),
                Property.city.ilike(pattern, escape="\\"),
            )
        )
    if status_filter is not None:
        conditions.append(Property.status == status_filter)
    if property_type is not None:
        conditions.append(Property.property_type == property_type)

    total = db.execute(select(func.count()).select_from(Property).where(*conditions)).scalar_one()
    rows = (
        db.execute(
            select(Property)
            .where(*conditions)
            .order_by(Property.name, Property.id)
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return PropertyPage(
        items=[PropertyOut.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=PropertyOut, status_code=status.HTTP_201_CREATED)
def create_property(body: PropertyCreate, ctx: WriteAuth, db: DbSession) -> PropertyOut:
    prop = Property(workspace_id=ctx.workspace.id, **body.model_dump())
    db.add(prop)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "A property with this code already exists in your workspace.",
        ) from None
    db.refresh(prop)
    return PropertyOut.model_validate(prop)


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(property_id: uuid.UUID, ctx: CurrentAuth, db: DbSession) -> PropertyOut:
    return PropertyOut.model_validate(get_owned_property(db, ctx, property_id))


@router.patch("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: uuid.UUID, body: PropertyUpdate, ctx: WriteAuth, db: DbSession
) -> PropertyOut:
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No fields to update.")
    null_fields = sorted(k for k, v in changes.items() if v is None and k in NON_NULLABLE_FIELDS)
    if null_fields:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"These fields cannot be null: {', '.join(null_fields)}.",
        )

    prop = get_owned_property(db, ctx, property_id)
    for key, value in changes.items():
        setattr(prop, key, value)
    db.commit()
    db.refresh(prop)
    return PropertyOut.model_validate(prop)