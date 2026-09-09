from app.extensions import db
from datetime import datetime


class OrganizadorLanding(db.Model):
    """Landing page configurable por organizador (1:1, equivalente a ClubLandingPage)."""
    __tablename__ = 'organizador_landing_pages'

    id = db.Column(db.Integer, primary_key=True)
    organizador_id = db.Column(db.Integer, db.ForeignKey('organizadores.id'), unique=True, nullable=False)

    # Hero / Banner
    hero_title = db.Column(db.String(200), nullable=True, default='Bienvenido')
    hero_subtitle = db.Column(db.String(300), nullable=True)
    banner_url = db.Column(db.Text, nullable=True)

    # About
    about_title = db.Column(db.String(200), nullable=True, default='Sobre nosotros')
    about_text = db.Column(db.Text, nullable=True)
    about_image_url = db.Column(db.Text, nullable=True)

    # Features / Services
    features_title = db.Column(db.String(200), nullable=True, default='Nuestros servicios')
    features = db.Column(db.JSON, nullable=True)  # [{icon, title, description}]

    # Gallery
    gallery_title = db.Column(db.String(200), nullable=True, default='Galería')
    gallery_images = db.Column(db.JSON, nullable=True)  # [{url, caption}]

    # Contact
    contact_email = db.Column(db.String(120), nullable=True)
    contact_phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.String(300), nullable=True)

    # Social media
    social_facebook = db.Column(db.String(300), nullable=True)
    social_instagram = db.Column(db.String(300), nullable=True)
    social_whatsapp = db.Column(db.String(300), nullable=True)
    social_twitter = db.Column(db.String(300), nullable=True)
    social_youtube = db.Column(db.String(300), nullable=True)

    # Layout / visibility
    show_login_in_hero = db.Column(db.Boolean, nullable=False, default=True)
    show_about = db.Column(db.Boolean, nullable=False, default=True)
    show_features = db.Column(db.Boolean, nullable=False, default=True)
    show_gallery = db.Column(db.Boolean, nullable=False, default=True)
    show_contact = db.Column(db.Boolean, nullable=False, default=True)
    show_footer_social = db.Column(db.Boolean, nullable=False, default=True)
    show_registration = db.Column(db.Boolean, nullable=False, default=False)

    footer_text = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organizador = db.relationship('Organizador', backref=db.backref('landing_page', uselist=False))

    def __repr__(self):
        return f'<OrganizadorLanding for Organizador {self.organizador_id}>'