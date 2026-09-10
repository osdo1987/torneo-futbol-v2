"""Datos médicos y contacto de emergencia del jugador

Revision ID: 0012_jugador_salud
Revises: 0011_jugador_foto_url
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa


revision = '0012_jugador_salud'
down_revision = '0011_jugador_foto_url'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jugadores', sa.Column('tipo_sangre', sa.String(5), nullable=True))
    op.add_column('jugadores', sa.Column('eps', sa.String(120), nullable=True))
    op.add_column('jugadores', sa.Column('contacto_emergencia', sa.String(200), nullable=True))
    op.add_column('jugadores', sa.Column('alergias', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('jugadores', 'alergias')
    op.drop_column('jugadores', 'contacto_emergencia')
    op.drop_column('jugadores', 'eps')
    op.drop_column('jugadores', 'tipo_sangre')