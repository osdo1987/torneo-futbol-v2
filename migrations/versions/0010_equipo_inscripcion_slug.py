"""Link público de inscripción por equipo

Revision ID: 0010_equipo_inscripcion_slug
Revises: 0009_alineacion_tactica
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0010_equipo_inscripcion_slug'
down_revision = '0009_alineacion_tactica'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('equipos', sa.Column('inscripcion_slug', sa.String(length=12), nullable=True))
    op.create_unique_constraint('uq_equipos_inscripcion_slug', 'equipos', ['inscripcion_slug'])


def downgrade():
    op.drop_constraint('uq_equipos_inscripcion_slug', 'equipos', type_='unique')
    op.drop_column('equipos', 'inscripcion_slug')