"""Allow NULL snmp_community to support disabled SNMP printers.

Revision ID: 002
Revises: 001
Create Date: 2026-10-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Alter snmp_community column to allow NULL
    op.alter_column('printers', 'snmp_community',
                    existing_type=sa.String(64),
                    nullable=True)


def downgrade() -> None:
    # Revert to NOT NULL, defaulting existing NULLs to 'public'
    op.execute("UPDATE printers SET snmp_community = 'public' WHERE snmp_community IS NULL")
    op.alter_column('printers', 'snmp_community',
                    existing_type=sa.String(64),
                    nullable=False)
