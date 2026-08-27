from app.extensions import db
from datetime import datetime

TIPO_FASE = ['GRUPOS', 'ELIMINATORIA', 'ROUND_ROBIN']


class Fase(db.Model):
    __tablename__ = 'fases'

    id = db.Column(db.Integer, primary_key=True)
    torneo_id = db.Column(db.Integer, db.ForeignKey('torneos.id'), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    orden = db.Column(db.Integer, nullable=False, default=1)
    tipo = db.Column(db.String(20), nullable=False, default='ROUND_ROBIN')
    completada = db.Column(db.Boolean, nullable=False, default=False)

    partidos = db.relationship('Partido', backref='fase', lazy=True,
                               cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Fase {self.nombre}>'