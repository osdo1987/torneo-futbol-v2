"""Alineaciones: tabla partido_alineaciones

Revision ID: 0007_partido_alineaciones
Revises: 0006_evento_cambio
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0007_partido_alineaciones'
down_revision = '0006_evento_cambio'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'partido_alineaciones',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partido_id', sa.Integer(), sa.ForeignKey('partidos.id'), nullable=False),
        sa.Column('equipo_id', sa.Integer(), sa.ForeignKey('equipos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('jugador_id', sa.Integer(), sa.ForeignKey('jugadores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('titular', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('partido_id', 'jugador_id', name='uq_partido_jugador'),
    )


def downgrade():
    op.drop_table('partido_alineaciones')