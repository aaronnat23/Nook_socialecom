"""Give the sample shops their current catalogue: distinct photos, matching names, descriptions and options.

Data only. It updates the eight sample shops in place (accounts, orders and any page a seller has edited are left
alone) and does nothing on an empty database, where the seed script creates the current catalogue directly.
"""

from alembic import op
from sqlalchemy.orm import Session

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.seed import refresh_sample_catalog

    refresh_sample_catalog(Session(bind=op.get_bind()))


def downgrade() -> None:
    pass
