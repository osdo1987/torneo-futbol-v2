from app.extensions import db
from datetime import datetime


class Locacion(db.Model):
    """Sede / cancha del organizador donde se programan los partidos."""
    __tablename__ = 'locaciones'

    id = db.Column(db.Integer, primary_key=True)
    organizador_id = db.Column(db.Integer, db.ForeignKey('organizadores.id'), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    direccion = db.Column(db.Text, nullable=True)
    activa = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Locacion {self.nombre}>'
