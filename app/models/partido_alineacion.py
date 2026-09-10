from app.extensions import db
from datetime import datetime


class PartidoAlineacion(db.Model):
    """Jugadores convocados por partido (titulares y suplentes)."""
    __tablename__ = 'partido_alineaciones'

    id = db.Column(db.Integer, primary_key=True)
    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id'), nullable=False)
    equipo_id = db.Column(db.Integer, db.ForeignKey('equipos.id', ondelete='CASCADE'), nullable=False)
    jugador_id = db.Column(db.Integer, db.ForeignKey('jugadores.id', ondelete='CASCADE'), nullable=False)
    titular = db.Column(db.Boolean, nullable=False, default=False)
    # Número con el que juega en ESTE partido (None = usa el número inscrito del jugador)
    numero_camiseta = db.Column(db.Integer, nullable=True)
    # Táctica por partido: POR/DEF/MED/DEL/OTROS y orden dentro de su fila
    posicion_tactica = db.Column(db.String(20), nullable=True)
    posicion_orden = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('partido_id', 'jugador_id', name='uq_partido_jugador'),
    )

    jugador = db.relationship('Jugador')
    equipo = db.relationship('Equipo')

    def __repr__(self):
        return f'<PartidoAlineacion partido={self.partido_id} jugador={self.jugador_id} titular={self.titular}>'