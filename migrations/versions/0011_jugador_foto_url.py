"""Foto del jugador (data URI)

Revision ID: 0011_jugador_foto_url
Revises: 0010_equipo_inscripcion_slug
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0011_jugador_foto_url'
down_revision = '0010_equipo_inscripcion_slug'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jugadores', sa.Column('foto_url', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('jugadores', 'foto_url')