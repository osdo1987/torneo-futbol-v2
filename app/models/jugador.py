from app.extensions import db
from datetime import datetime


class Jugador(db.Model):
    __tablename__ = 'jugadores'

    id = db.Column(db.Integer, primary_key=True)
    equipo_id = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    numero_camiseta = db.Column(db.Integer, nullable=False, default=0)
    documento_identidad = db.Column(db.String(50), nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    # Atributos adicionales en JSON (posicion, edad, etc.)
    atributos = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Jugador {self.nombre}>'