"""Snapshot de alineación en eventos CAMBIO (permite revertir al borrar)

Revision ID: 0018_evento_cambio_snapshot
Revises: 0017_tecnico_arbitro_acta
Create Date: 2026-10-11
"""
from alembic import op
import sqlalchemy as sa


revision = '0018_evento_cambio_snapshot'
down_revision = '0017_tecnico_arbitro_acta'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('eventos_partido', sa.Column('cambio_snapshot', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('eventos_partido', 'cambio_snapshot')