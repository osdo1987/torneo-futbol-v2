"""Locaciones (sedes/canchas) y sede del partido

Revision ID: 0015_locaciones_partido
Revises: 0014_user_equipo
Create Date: 2026-09-20
"""
from alembic import op
import sqlalchemy as sa


revision = '0015_locaciones_partido'
down_revision = '0014_user_equipo'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'locaciones',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizador_id', sa.Integer(), sa.ForeignKey('organizadores.id'), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('direccion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.add_column('partidos', sa.Column('locacion_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_partidos_locacion_id', 'partidos', 'locaciones',
        ['locacion_id'], ['id'], ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_partidos_locacion_id', 'partidos', type_='foreignkey')
    op.drop_column('partidos', 'locacion_id')
    op.drop_table('locaciones')
