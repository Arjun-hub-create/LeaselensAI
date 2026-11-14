"""Add the demo properties to the demo workspace. Safe to run more than once.

Run from the backend folder:  python -m app.cli.seed_properties
"""

from sqlalchemy import select

from app.cli.seed import WORKSPACE_SLUG
from app.db.session import get_session_factory
from app.models import Property, Workspace

# code, name, property_type, city, status. Everything here is fictional.
DEMO_PROPERTIES = [
    ("PROP-001", "Greenwood Residency", "residential", "Bengaluru", "active"),
    ("PROP-002", "Skyline Apartments", "residential", "Pune", "active"),
    ("PROP-003", "Harmony Heights", "residential", "Hyderabad", "active"),
    ("PROP-004", "Riverside Court", "residential", "Mysuru", "active"),
    ("PROP-005", "Northgate Business Centre", "commercial", "Bengaluru", "active"),
    ("PROP-006", "Willow Park Residences", "residential", "Chennai", "active"),
    ("PROP-007", "Harbour View Offices", "commercial", "Kochi", "active"),
    ("PROP-008", "Cedar Lane Homes", "residential", "Coimbatore", "inactive"),
    ("PROP-009", "Westbridge House", "mixed_use", "Mumbai", "active"),
    ("PROP-010", "Meadowfield Retail Units", "commercial", "Ahmedabad", "archived"),
]


def main() -> None:
    with get_session_factory()() as db:
        workspace = db.execute(
            select(Workspace).where(Workspace.slug == WORKSPACE_SLUG)
        ).scalar_one_or_none()
        if workspace is None:
            print("The demo workspace does not exist. Run the seed command first.")
            return

        existing = set(
            db.execute(
                select(Property.property_code).where(Property.workspace_id == workspace.id)
            ).scalars()
        )

        added = 0
        for number, (code, name, property_type, city, status) in enumerate(DEMO_PROPERTIES, start=1):
            if code in existing:
                continue
            db.add(
                Property(
                    workspace_id=workspace.id,
                    property_code=code,
                    name=name,
                    property_type=property_type,
                    address={"line1": f"{number} Example Road"},
                    city=city,
                    country_code="IN",
                    status=status,
                    is_demo=True,
                )
            )
            added += 1
        db.commit()

    print(f"Added {added} demo properties. {len(DEMO_PROPERTIES) - added} already existed.")


if __name__ == "__main__":
    main()