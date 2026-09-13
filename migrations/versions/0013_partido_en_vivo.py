"""Estado en vivo (cronómetro) de los partidos

Revision ID: 0013_partido_en_vivo
Revises: 0012_jugador_salud
Create Date: 2026-09-11
"""
from alembic import op
import sqlalchemy as sa


revision = '0013_partido_en_vivo'
down_revision = '0012_jugador_salud'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'partido_en_vivo',
        sa.Column('partido_id', sa.Integer(), nullable=False),
        sa.Column('seg', sa.Integer(), nullable=False),
        sa.Column('running', sa.Boolean(), nullable=False),
        sa.Column('iniciado', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['partido_id'], ['partidos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('partido_id'),
    )


def downgrade():
    op.drop_table('partido_en_vivo')