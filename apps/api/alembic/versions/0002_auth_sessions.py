"""Revocable local development sessions."""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not sa.inspect(op.get_bind()).has_table("auth_sessions"):
        op.create_table(
            "auth_sessions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("profiles.id"), nullable=False),
            sa.Column("revoked", sa.Boolean(), nullable=False),
        )
        op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_table("auth_sessions")
