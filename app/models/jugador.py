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
    foto_url = db.Column(db.Text, nullable=True)

    # Datos deportivos
    posicion = db.Column(db.String(20), nullable=True)          # ARQUERO/DEFENSOR/MEDIOCAMPISTA/DELANTERO
    fecha_nacimiento = db.Column(db.Date, nullable=True)
    telefono = db.Column(db.String(30), nullable=True)
    pierna_habil = db.Column(db.String(15), nullable=True)      # DERECHA/IZQUIERDA/AMBIDESTRO
    altura_cm = db.Column(db.Integer, nullable=True)

    # Datos médicos / contacto de emergencia
    tipo_sangre = db.Column(db.String(5), nullable=True)        # A+/A-/B+/B-/AB+/AB-/O+/O-
    eps = db.Column(db.String(120), nullable=True)
    contacto_emergencia = db.Column(db.String(200), nullable=True)
    alergias = db.Column(db.String(255), nullable=True)

    # Atributos adicionales en JSON (extensión libre)
    atributos = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Jugador {self.nombre}>'