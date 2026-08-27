"""Initial schema for torneo-futbol-v2

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa


revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'organizadores',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('whatsapp', sa.String(20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint('uq_organizadores_slug', 'organizadores', ['slug'])

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(120), nullable=False),
        sa.Column('password_hash', sa.String(128), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('organizador_id', sa.Integer(), sa.ForeignKey('organizadores.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('reset_token', sa.String(256), nullable=True),
        sa.Column('reset_token_expiry', sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    op.create_index('ix_users_reset_token', 'users', ['reset_token'])

    op.create_table(
        'torneos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizador_id', sa.Integer(), sa.ForeignKey('organizadores.id'), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('estado', sa.String(30), nullable=False),
        sa.Column('max_jugadores_por_equipo', sa.Integer(), nullable=False),
        sa.Column('puntos_victoria', sa.Integer(), nullable=False),
        sa.Column('puntos_empate', sa.Integer(), nullable=False),
        sa.Column('puntos_derrota', sa.Integer(), nullable=False),
        sa.Column('inscripciones_jugadores_abiertas', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'fases',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('torneo_id', sa.Integer(), sa.ForeignKey('torneos.id'), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('completada', sa.Boolean(), nullable=False),
    )

    op.create_table(
        'equipos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('torneo_id', sa.Integer(), sa.ForeignKey('torneos.id'), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('delegado_email', sa.String(120), nullable=True),
        sa.Column('delegado_documento', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'jugadores',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('equipo_id', sa.Integer(), sa.ForeignKey('equipos.id'), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('numero_camiseta', sa.Integer(), nullable=False),
        sa.Column('documento_identidad', sa.String(50), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False),
        sa.Column('atributos', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'partidos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('torneo_id', sa.Integer(), sa.ForeignKey('torneos.id'), nullable=False),
        sa.Column('fase_id', sa.Integer(), sa.ForeignKey('fases.id'), nullable=True),
        sa.Column('equipo_local_id', sa.Integer(), sa.ForeignKey('equipos.id'), nullable=False),
        sa.Column('equipo_visitante_id', sa.Integer(), sa.ForeignKey('equipos.id'), nullable=False),
        sa.Column('jornada', sa.Integer(), nullable=False),
        sa.Column('fecha_programada', sa.DateTime(), nullable=True),
        sa.Column('goles_local', sa.Integer(), nullable=False),
        sa.Column('goles_visitante', sa.Integer(), nullable=False),
        sa.Column('resultado', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'eventos_partido',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('partido_id', sa.Integer(), sa.ForeignKey('partidos.id'), nullable=False),
        sa.Column('jugador_id', sa.Integer(), sa.ForeignKey('jugadores.id'), nullable=True),
        sa.Column('equipo_id', sa.Integer(), sa.ForeignKey('equipos.id'), nullable=True),
        sa.Column('tipo', sa.String(30), nullable=False),
        sa.Column('minuto', sa.Integer(), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('eventos_partido')
    op.drop_table('partidos')
    op.drop_table('jugadores')
    op.drop_table('equipos')
    op.drop_table('fases')
    op.drop_table('torneos')
    op.drop_index('ix_users_reset_token', table_name='users')
    op.drop_table('users')
    op.drop_table('organizadores')
