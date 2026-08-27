"""Datos deportivos de jugadores (posicion, fecha_nac, telefono, pierna, altura)

Revision ID: 0002_jugador_datos
Revises: 0001_initial_schema
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa


revision = '0002_jugador_datos'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jugadores', sa.Column('posicion', sa.String(20), nullable=True))
    op.add_column('jugadores', sa.Column('fecha_nacimiento', sa.Date(), nullable=True))
    op.add_column('jugadores', sa.Column('telefono', sa.String(30), nullable=True))
    op.add_column('jugadores', sa.Column('pierna_habil', sa.String(15), nullable=True))
    op.add_column('jugadores', sa.Column('altura_cm', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('jugadores', 'altura_cm')
    op.drop_column('jugadores', 'pierna_habil')
    op.drop_column('jugadores', 'telefono')
    op.drop_column('jugadores', 'fecha_nacimiento')
    op.drop_column('jugadores', 'posicion')