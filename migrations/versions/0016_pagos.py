"""Pagos (inscripción y sanciones de tarjetas)

Revision ID: 0016_pagos
Revises: 0015_locaciones_partido
Create Date: 2026-09-22
"""
from alembic import op
import sqlalchemy as sa


revision = '0016_pagos'
down_revision = '0015_locaciones_partido'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pagos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('torneo_id', sa.Integer(), sa.ForeignKey('torneos.id'), nullable=False),
        sa.Column('equipo_id', sa.Integer(), sa.ForeignKey('equipos.id'), nullable=True),
        sa.Column('jugador_id', sa.Integer(), sa.ForeignKey('jugadores.id'), nullable=True),
        sa.Column('concepto', sa.String(length=30), nullable=False, server_default='INSCRIPCION'),
        sa.Column('monto', sa.Numeric(10, 2), nullable=False, server_default=sa.text('0')),
        sa.Column('nota', sa.String(length=255), nullable=True),
        sa.Column('registrado_por', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('pagos')