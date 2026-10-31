"""Add SystemSettings table

Revision ID: 003
Revises: 002
Create Date: 2026-10-29 19:59:44

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'system_settings',
        sa.Column('id', sa.String(36), nullable=False, primary_key=True),
        sa.Column('timezone', sa.String(100), nullable=False, server_default='America/Sao_Paulo'),
        sa.Column('date_format', sa.String(20), nullable=False, server_default='DD/MM/YYYY'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('system_settings')
