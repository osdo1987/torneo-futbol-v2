"""Tarjetas a técnicos y datos del acta (árbitro, observaciones)

Revision ID: 0017_tecnico_arbitro_acta
Revises: 0016_pagos
Create Date: 2026-09-22
"""
from alembic import op
import sqlalchemy as sa


revision = '0017_tecnico_arbitro_acta'
down_revision = '0016_pagos'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('eventos_partido', sa.Column('tipo_sancionado', sa.String(length=20),
                                               nullable=False, server_default='JUGADOR'))
    op.add_column('eventos_partido', sa.Column('nombre_sancionado', sa.String(length=120), nullable=True))
    op.add_column('equipos', sa.Column('tecnico_nombre', sa.String(length=120), nullable=True))
    op.add_column('partidos', sa.Column('arbitro_nombre', sa.String(length=120), nullable=True))
    op.add_column('partidos', sa.Column('arbitro_asistente1', sa.String(length=120), nullable=True))
    op.add_column('partidos', sa.Column('arbitro_asistente2', sa.String(length=120), nullable=True))
    op.add_column('partidos', sa.Column('observaciones', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('partidos', 'observaciones')
    op.drop_column('partidos', 'arbitro_asistente2')
    op.drop_column('partidos', 'arbitro_asistente1')
    op.drop_column('partidos', 'arbitro_nombre')
    op.drop_column('equipos', 'tecnico_nombre')
    op.drop_column('eventos_partido', 'nombre_sancionado')
    op.drop_column('eventos_partido', 'tipo_sancionado')