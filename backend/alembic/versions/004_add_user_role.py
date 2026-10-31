"""Add user role column."""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the enum type explicitly
    op.execute("CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'usuario')")
    
    # Add column with default value
    op.add_column('users', sa.Column('role', sa.String(50), nullable=False, server_default='usuario'))


def downgrade() -> None:
    op.drop_column('users', 'role')
    op.execute('DROP TYPE user_role')
