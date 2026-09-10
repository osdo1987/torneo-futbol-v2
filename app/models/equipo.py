from app.extensions import db
from datetime import datetime


class Equipo(db.Model):
    __tablename__ = 'equipos'

    id = db.Column(db.Integer, primary_key=True)
    torneo_id = db.Column(db.Integer, db.ForeignKey('torneos.id'), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    delegado_email = db.Column(db.String(120), nullable=True)
    delegado_documento = db.Column(db.String(50), nullable=True)
    # Link público de inscripción de jugadores (token único)
    inscripcion_slug = db.Column(db.String(12), unique=True, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jugadores = db.relationship('Jugador', backref='equipo', lazy=True,
                                cascade='all, delete-orphan')
    partidos_local = db.relationship('Partido', backref='equipo_local',
                                     foreign_keys='Partido.equipo_local_id', lazy=True,
                                     cascade='all, delete-orphan')
    partidos_visitante = db.relationship('Partido', backref='equipo_visitante',
                                         foreign_keys='Partido.equipo_visitante_id', lazy=True,
                                         cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Equipo {self.nombre}>'