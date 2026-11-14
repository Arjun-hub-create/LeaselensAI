import hashlib
import secrets
from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()  # Argon2id with the library's default settings


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


@lru_cache
def dummy_password_hash() -> str:
    """Verified against when an email does not exist, so unknown and known emails take similar time."""
    return _hasher.hash("this-is-not-a-real-password")


def new_token() -> str:
    """A random, unguessable token for sessions and CSRF."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 is appropriate here because session tokens are long and random, unlike passwords."""
    return hashlib.sha256(token.encode()).hexdigest()