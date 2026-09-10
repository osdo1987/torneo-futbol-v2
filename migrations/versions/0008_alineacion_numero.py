"""Número de camiseta por partido en alineaciones

Revision ID: 0008_alineacion_numero
Revises: 0007_partido_alineaciones
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0008_alineacion_numero'
down_revision = '0007_partido_alineaciones'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partido_alineaciones', sa.Column('numero_camiseta', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('partido_alineaciones', 'numero_camiseta')