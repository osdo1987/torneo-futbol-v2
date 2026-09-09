"""Branding del organizador + tabla de landing pages (1:1)

Revision ID: 0005_organizador_landing
Revises: 0004_evento_fk_setnull
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa


revision = '0005_organizador_landing'
down_revision = '0004_evento_fk_setnull'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('organizadores', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('organizadores', sa.Column('logo_url', sa.Text(), nullable=True))
    op.add_column('organizadores', sa.Column('primary_color', sa.String(length=7), nullable=False, server_default='#6366f1'))
    op.add_column('organizadores', sa.Column('welcome_message', sa.String(length=200), nullable=True))

    op.create_table(
        'organizador_landing_pages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizador_id', sa.Integer(), sa.ForeignKey('organizadores.id'), unique=True, nullable=False),
        sa.Column('hero_title', sa.String(length=200), nullable=True, server_default='Bienvenido'),
        sa.Column('hero_subtitle', sa.String(length=300), nullable=True),
        sa.Column('banner_url', sa.Text(), nullable=True),
        sa.Column('about_title', sa.String(length=200), nullable=True, server_default='Sobre nosotros'),
        sa.Column('about_text', sa.Text(), nullable=True),
        sa.Column('about_image_url', sa.Text(), nullable=True),
        sa.Column('features_title', sa.String(length=200), nullable=True, server_default='Nuestros servicios'),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('gallery_title', sa.String(length=200), nullable=True, server_default='Galería'),
        sa.Column('gallery_images', sa.JSON(), nullable=True),
        sa.Column('contact_email', sa.String(length=120), nullable=True),
        sa.Column('contact_phone', sa.String(length=30), nullable=True),
        sa.Column('address', sa.String(length=300), nullable=True),
        sa.Column('social_facebook', sa.String(length=300), nullable=True),
        sa.Column('social_instagram', sa.String(length=300), nullable=True),
        sa.Column('social_whatsapp', sa.String(length=300), nullable=True),
        sa.Column('social_twitter', sa.String(length=300), nullable=True),
        sa.Column('social_youtube', sa.String(length=300), nullable=True),
        sa.Column('show_login_in_hero', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_about', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_features', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_gallery', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_contact', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_footer_social', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('show_registration', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('footer_text', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('organizador_landing_pages')
    op.drop_column('organizadores', 'welcome_message')
    op.drop_column('organizadores', 'primary_color')
    op.drop_column('organizadores', 'logo_url')
    op.drop_column('organizadores', 'description')