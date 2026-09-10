"""Posición táctica y orden en alineaciones

Revision ID: 0009_alineacion_tactica
Revises: 0008_alineacion_numero
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0009_alineacion_tactica'
down_revision = '0008_alineacion_numero'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partido_alineaciones', sa.Column('posicion_tactica', sa.String(length=20), nullable=True))
    op.add_column('partido_alineaciones', sa.Column('posicion_orden', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('partido_alineaciones', 'posicion_orden')
    op.drop_column('partido_alineaciones', 'posicion_tactica')