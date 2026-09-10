from app.extensions import db
from datetime import datetime

# Ciclo de vida de un torneo (equivalente al dominio original).
VALID_TORNEO_STATES = [
    'CREADO',
    'INSCRIPCIONES_ABIERTAS',
    'INSCRIPCIONES_CERRADAS',
    'SORTEADO',
    'EN_JUEGO',
    'FINALIZADO',
]

TORNEO_TRANSITIONS = {
    'CREADO': ['INSCRIPCIONES_ABIERTAS'],
    'INSCRIPCIONES_ABIERTAS': ['INSCRIPCIONES_CERRADAS'],
    'INSCRIPCIONES_CERRADAS': ['SORTEADO', 'INSCRIPCIONES_ABIERTAS'],
    'SORTEADO': ['EN_JUEGO'],
    'EN_JUEGO': ['FINALIZADO'],
    'FINALIZADO': [],
}


class Torneo(db.Model):
    __tablename__ = 'torneos'

    id = db.Column(db.Integer, primary_key=True)
    organizador_id = db.Column(db.Integer, db.ForeignKey('organizadores.id'), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    estado = db.Column(db.String(30), nullable=False, default='CREADO')
    max_jugadores_por_equipo = db.Column(db.Integer, nullable=False, default=18)
    puntos_victoria = db.Column(db.Integer, nullable=False, default=3)
    puntos_empate = db.Column(db.Integer, nullable=False, default=1)
    puntos_derrota = db.Column(db.Integer, nullable=False, default=0)
    inscripciones_jugadores_abiertas = db.Column(db.Boolean, nullable=False, default=False)
    # Reglamento configurable (JSON validado por app.services.reglas.ReglasSchema)
    reglas = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fases = db.relationship('Fase', backref='torneo', lazy=True,
                            cascade='all, delete-orphan',
                            order_by='Fase.orden')
    equipos = db.relationship('Equipo', backref='torneo', lazy=True,
                              cascade='all, delete-orphan')
    partidos = db.relationship('Partido', backref='torneo', lazy=True,
                               cascade='all, delete-orphan')

    def can_transition_to(self, nuevo_estado):
        return nuevo_estado in TORNEO_TRANSITIONS.get(self.estado, [])

    def __repr__(self):
        return f'<Torneo {self.nombre} [{self.estado}]>'