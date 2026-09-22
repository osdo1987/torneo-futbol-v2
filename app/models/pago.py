from app.extensions import db
from datetime import datetime

CONCEPTOS_PAGO = [
    'INSCRIPCION',
    'TARJETA_AMARILLA',
    'TARJETA_ROJA',
]


class Pago(db.Model):
    __tablename__ = 'pagos'

    id = db.Column(db.Integer, primary_key=True)
    torneo_id = db.Column(db.Integer, db.ForeignKey('torneos.id'), nullable=False)
    # GRUPAL: pago de inscripción del equipo (jugador_id NULL). Individual: jugador_id.
    equipo_id = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=True)
    jugador_id = db.Column(db.Integer, db.ForeignKey('jugadores.id'), nullable=True)
    concepto = db.Column(db.String(30), nullable=False, default='INSCRIPCION')
    monto = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    nota = db.Column(db.String(255), nullable=True)
    registrado_por = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    torneo = db.relationship('Torneo')
    equipo = db.relationship('Equipo')
    jugador = db.relationship('Jugador')

    def __repr__(self):
        return f'<Pago {self.concepto} {self.monto}>'