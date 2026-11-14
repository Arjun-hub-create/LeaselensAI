"""Give every demo user a new random password and sign out their existing sessions.

Run from the backend folder:  python -m app.cli.reset_demo_passwords
The new passwords are printed ONCE. They are not stored anywhere else.
"""

import secrets
from datetime import UTC, datetime

from sqlalchemy import select, update

from app.cli.seed import DEMO_USERS
from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models import User, UserSession


def main() -> None:
    credentials: list[tuple[str, str]] = []
    with get_session_factory()() as db:
        for email, _display_name, _role in DEMO_USERS:
            user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
            if user is None:
                continue
            password = secrets.token_urlsafe(12)
            user.password_hash = hash_password(password)
            db.execute(
                update(UserSession)
                .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
                .values(revoked_at=datetime.now(UTC))
            )
            credentials.append((email, password))
        db.commit()

    if not credentials:
        print("No demo users found. Run the seed command first.")
        return
    print("New demo passwords, shown ONCE. Save them privately.\n")
    for email, password in credentials:
        print(f"  {email:<28} {password}")


if __name__ == "__main__":
    main()