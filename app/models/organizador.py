from app.extensions import db
from datetime import datetime


class Organizador(db.Model):
    """Organizador / liga / cancha que gestiona sus torneos (equivalente a Store en e-shop)."""
    __tablename__ = 'organizadores'

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    whatsapp = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)

    # Identidad / branding (usado por la landing page pública)
    description = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.Text, nullable=True)
    primary_color = db.Column(db.String(7), nullable=False, default='#6366f1')
    welcome_message = db.Column(db.String(200), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship('User', backref='organizador', lazy=True,
                            cascade='all, delete-orphan')
    torneos = db.relationship('Torneo', backref='organizador', lazy=True,
                              cascade='all, delete-orphan')
    locaciones = db.relationship('Locacion', backref='organizador', lazy=True,
                                 cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Organizador {self.name}>'