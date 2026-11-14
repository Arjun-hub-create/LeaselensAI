"""Create the demo workspace and four demo users.

Run from the backend folder:  python -m app.cli.seed
Passwords are generated randomly and printed ONCE. They are not stored anywhere else.
"""

import secrets

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models import User, Workspace, WorkspaceMembership

WORKSPACE_SLUG = "northstar-demo"

DEMO_USERS = [
    ("admin@northstar.example", "Demo Admin", "admin"),
    ("manager@northstar.example", "Arjun M", "property_manager"),
    ("reviewer@northstar.example", "Demo Reviewer", "reviewer"),
    ("viewer@northstar.example", "Demo Viewer", "viewer"),
]


def main() -> None:
    credentials: list[tuple[str, str, str]] = []
    with get_session_factory()() as db:
        existing = db.execute(
            select(Workspace).where(Workspace.slug == WORKSPACE_SLUG)
        ).scalar_one_or_none()
        if existing is not None:
            print("The demo workspace already exists. Nothing was changed.")
            return

        workspace = Workspace(name="Northstar Property Group (demo)", slug=WORKSPACE_SLUG, is_demo=True)
        db.add(workspace)
        db.flush()

        for email, display_name, role in DEMO_USERS:
            password = secrets.token_urlsafe(12)
            user = User(email=email, display_name=display_name, password_hash=hash_password(password))
            db.add(user)
            db.flush()
            db.add(WorkspaceMembership(workspace_id=workspace.id, user_id=user.id, role=role))
            credentials.append((email, role, password))
        db.commit()

    print("Demo workspace created. These passwords are shown ONCE. Save them now.\n")
    for email, role, password in credentials:
        print(f"  {role:<17} {email:<28} {password}")


if __name__ == "__main__":
    main()