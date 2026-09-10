"""Eventos de cambio: columna jugador_sale_id en eventos_partido

Revision ID: 0006_evento_cambio
Revises: 0005_organizador_landing
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0006_evento_cambio'
down_revision = '0005_organizador_landing'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('eventos_partido', sa.Column('jugador_sale_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'eventos_partido_jugador_sale_id_fkey', 'eventos_partido', 'jugadores', ['jugador_sale_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('eventos_partido_jugador_sale_id_fkey', 'eventos_partido', type_='foreignkey')
    op.drop_column('eventos_partido', 'jugador_sale_id')