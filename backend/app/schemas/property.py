import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PropertyType = Literal["residential", "commercial", "mixed_use", "other"]
PropertyStatus = Literal["active", "inactive", "archived"]

COUNTRY_PATTERN = r"^[A-Za-z]{2}$"
MAX_ADDRESS_FIELDS = 10


def _check_address(value: dict[str, str] | None) -> dict[str, str] | None:
    if value is not None and len(value) > MAX_ADDRESS_FIELDS:
        raise ValueError(f"An address can have at most {MAX_ADDRESS_FIELDS} fields.")
    return value


class PropertyCreate(BaseModel):
    """What a client may send. There is no workspace_id: it always comes from the login session."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    property_code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=160)
    property_type: PropertyType
    address: dict[str, str] = Field(default_factory=dict)
    city: str = Field(min_length=1, max_length=100)
    state_region: str | None = Field(default=None, max_length=100)
    country_code: str = Field(pattern=COUNTRY_PATTERN)

    @field_validator("address")
    @classmethod
    def address_size(cls, value: dict[str, str]) -> dict[str, str]:
        _check_address(value)
        return value

    @field_validator("country_code")
    @classmethod
    def uppercase_country(cls, value: str) -> str:
        return value.upper()


class PropertyUpdate(BaseModel):
    """Every field is optional. property_code cannot be changed."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=160)
    property_type: PropertyType | None = None
    address: dict[str, str] | None = None
    city: str | None = Field(default=None, min_length=1, max_length=100)
    state_region: str | None = Field(default=None, max_length=100)
    country_code: str | None = Field(default=None, pattern=COUNTRY_PATTERN)
    status: PropertyStatus | None = None

    @field_validator("address")
    @classmethod
    def address_size(cls, value: dict[str, str] | None) -> dict[str, str] | None:
        return _check_address(value)

    @field_validator("country_code")
    @classmethod
    def uppercase_country(cls, value: str | None) -> str | None:
        return value.upper() if value is not None else None


class PropertyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_code: str
    name: str
    property_type: str
    address: dict[str, Any]
    city: str
    state_region: str | None
    country_code: str
    status: str
    is_demo: bool
    created_at: datetime
    updated_at: datetime


class PropertyPage(BaseModel):
    items: list[PropertyOut]
    total: int
    limit: int
    offset: int