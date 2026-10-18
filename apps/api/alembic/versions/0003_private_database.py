"""Deny direct client database access; FastAPI owner role retains access."""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None
TABLES = [
    "audit_logs",
    "payment_webhook_events",
    "profiles",
    "auth_sessions",
    "reports",
    "shops",
    "assets",
    "collections",
    "orders",
    "products",
    "shop_followers",
    "storefront_drafts",
    "storefront_versions",
    "product_favorites",
    "product_variants",
    "shop_publications",
    "cart_items",
]


def upgrade() -> None:
    for name in TABLES:
        op.execute(f'ALTER TABLE "{name}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'REVOKE ALL ON "{name}" FROM PUBLIC')
        for role in ["anon", "authenticated"]:
            op.execute(
                f"DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='{role}') THEN REVOKE ALL ON \"{name}\" FROM {role}; END IF; END $$"
            )


def downgrade() -> None:
    for name in TABLES:
        op.execute(f'ALTER TABLE "{name}" DISABLE ROW LEVEL SECURITY')
