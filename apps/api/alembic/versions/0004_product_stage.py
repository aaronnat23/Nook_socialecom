"""Seller-chosen product presentation (cut-out, backdrop and placement)."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("stage", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "stage")
