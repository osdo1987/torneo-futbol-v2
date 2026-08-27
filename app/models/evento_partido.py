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
    # SET NULL: los eventos históricos sobreviven si se borra el jugador/equipo
    jugador_id = db.Column(db.Integer, db.ForeignKey('jugadores.id', ondelete='SET NULL'), nullable=True)
    equipo_id = db.Column(db.Integer, db.ForeignKey('equipos.id', ondelete='SET NULL'), nullable=True)
    tipo = db.Column(db.String(30), nullable=False, default='GOL')
    minuto = db.Column(db.Integer, nullable=False, default=0)
    descripcion = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones declaradas: permiten al ORM ordenar los borrados correctamente
    jugador = db.relationship('Jugador')
    equipo = db.relationship('Equipo')

    def __repr__(self):
        return f'<EventoPartido {self.tipo} {self.minuto}\'>'