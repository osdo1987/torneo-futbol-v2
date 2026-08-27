"""Columna reglas (JSON) en torneos

Revision ID: 0003_torneo_reglas
Revises: 0002_jugador_datos
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa


revision = '0003_torneo_reglas'
down_revision = '0002_jugador_datos'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('torneos', sa.Column('reglas', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('torneos', 'reglas')