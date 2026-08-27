"""FK de eventos_partido con ON DELETE SET NULL (jugador_id, equipo_id)

Revision ID: 0004_evento_fk_setnull
Revises: 0003_torneo_reglas
Create Date: 2026-08-27
"""
from alembic import op


revision = '0004_evento_fk_setnull'
down_revision = '0003_torneo_reglas'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('eventos_partido_jugador_id_fkey', 'eventos_partido', type_='foreignkey')
    op.create_foreign_key(
        'eventos_partido_jugador_id_fkey', 'eventos_partido', 'jugadores',
        ['jugador_id'], ['id'], ondelete='SET NULL',
    )
    op.drop_constraint('eventos_partido_equipo_id_fkey', 'eventos_partido', type_='foreignkey')
    op.create_foreign_key(
        'eventos_partido_equipo_id_fkey', 'eventos_partido', 'equipos',
        ['equipo_id'], ['id'], ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('eventos_partido_equipo_id_fkey', 'eventos_partido', type_='foreignkey')
    op.create_foreign_key(
        'eventos_partido_equipo_id_fkey', 'eventos_partido', 'equipos',
        ['equipo_id'], ['id'],
    )
    op.drop_constraint('eventos_partido_jugador_id_fkey', 'eventos_partido', type_='foreignkey')
    op.create_foreign_key(
        'eventos_partido_jugador_id_fkey', 'eventos_partido', 'jugadores',
        ['jugador_id'], ['id'],
    )