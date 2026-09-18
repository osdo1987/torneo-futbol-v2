"""Usuario delegado asociado a un equipo

Revision ID: 0014_user_equipo
Revises: 0013_partido_en_vivo
Create Date: 2026-09-17
"""
from alembic import op
import sqlalchemy as sa


revision = '0014_user_equipo'
down_revision = '0013_partido_en_vivo'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('equipo_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_users_equipo_id', 'users', 'equipos',
        ['equipo_id'], ['id'],
    )


def downgrade():
    op.drop_constraint('fk_users_equipo_id', 'users', type_='foreignkey')
    op.drop_column('users', 'equipo_id')