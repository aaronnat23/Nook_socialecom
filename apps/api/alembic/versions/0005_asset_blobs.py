"""Keep uploaded image bytes in PostgreSQL when the host has no persistent disk."""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "asset_blobs",
        sa.Column("asset_id", sa.String(36), primary_key=True),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("asset_blobs")
