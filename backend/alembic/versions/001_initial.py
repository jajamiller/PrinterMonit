"""Initial migration: users, printers, printer_readings, alerts tables.

Revision ID: 001
Revises: 
Create Date: 2026-10-28
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # printers table
    op.create_table(
        'printers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('manufacturer', sa.String(255), nullable=True),
        sa.Column('model', sa.String(255), nullable=True),
        sa.Column('serial_number', sa.String(255), nullable=True),
        sa.Column('asset_tag', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=False, index=True),
        sa.Column('port', sa.Integer(), default=9100, nullable=False),
        sa.Column('snmp_community', sa.String(64), default='public', nullable=False),
        sa.Column('snmp_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('sector', sa.String(100), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('printer_type', sa.String(50), nullable=True),
        sa.Column('status', sa.Enum('online', 'offline', 'error', name='printer_status'), default='offline', nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # printer_readings table
    op.create_table(
        'printer_readings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('printer_id', sa.String(36), sa.ForeignKey('printers.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('total_pages', sa.Integer(), nullable=False),
        sa.Column('available_pages', sa.Integer(), nullable=True),
        sa.Column('snmp_raw', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), default='ok', nullable=False),
        sa.Column('response_time_ms', sa.Integer(), default=0, nullable=False),
        sa.Column('error_message', sa.String(512), nullable=True),
        sa.Column('read_at', sa.DateTime(), default=sa.func.now(), nullable=False, index=True),
    )

    # alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('printer_id', sa.String(36), sa.ForeignKey('printers.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('alert_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), default='warning', nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('resolved', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('alerts')
    op.drop_table('printer_readings')
    op.drop_table('printers')
    op.drop_table('users')
    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS printer_status;")