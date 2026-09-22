from app.extensions import db
from datetime import datetime

RESULTADO_PARTIDO = [
    'PENDIENTE',
    'POSTERGADO',
    'LOCAL_GANO',
    'VISITANTE_GANO',
    'EMPATE',
    'W_LOCAL',
    'W_VISITANTE',
]


class Partido(db.Model):
    __tablename__ = 'partidos'

    id = db.Column(db.Integer, primary_key=True)
    torneo_id = db.Column(db.Integer, db.ForeignKey('torneos.id'), nullable=False)
    fase_id = db.Column(db.Integer, db.ForeignKey('fases.id'), nullable=True)
    equipo_local_id = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=False)
    equipo_visitante_id = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=False)
    jornada = db.Column(db.Integer, nullable=False, default=1)
    fecha_programada = db.Column(db.DateTime, nullable=True)
    locacion_id = db.Column(db.Integer,
                            db.ForeignKey('locaciones.id', ondelete='SET NULL'),
                            nullable=True)
    goles_local = db.Column(db.Integer, nullable=False, default=0)
    goles_visitante = db.Column(db.Integer, nullable=False, default=0)
    resultado = db.Column(db.String(20), nullable=False, default='PENDIENTE')
    # Datos del acta oficial
    arbitro_nombre = db.Column(db.String(120), nullable=True)
    arbitro_asistente1 = db.Column(db.String(120), nullable=True)
    arbitro_asistente2 = db.Column(db.String(120), nullable=True)
    observaciones = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    locacion = db.relationship('Locacion', backref=db.backref('partidos', lazy=True))
    eventos = db.relationship('EventoPartido', backref='partido', lazy=True,
                              cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Partido {self.equipo_local_id} vs {self.equipo_visitante_id} [{self.resultado}]>'