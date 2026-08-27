from app.extensions import db
from datetime import datetime

TIPO_EVENTO_PARTIDO = [
    'GOL',
    'TARJETA_AMARILLA',
    'TARJETA_ROJA',
    'AUTOGOL',
]


class EventoPartido(db.Model):
    __tablename__ = 'eventos_partido'

    id = db.Column(db.Integer, primary_key=True)
    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id'), nullable=False)
    jugador_id = db.Column(db.Integer, db.ForeignKey('jugadores.id'), nullable=True)
    equipo_id = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=True)
    tipo = db.Column(db.String(30), nullable=False, default='GOL')
    minuto = db.Column(db.Integer, nullable=False, default=0)
    descripcion = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<EventoPartido {self.tipo} {self.minuto}\'>'