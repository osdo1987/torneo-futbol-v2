from datetime import datetime

from app.extensions import db

# Duración máxima de un partido en segundos (2 x 45')
MAX_SEG = 5400


class PartidoEnVivo(db.Model):
    """Estado en tiempo real de un partido que se está jugando (cronómetro público).

    El cronómetro es autoritativo del lado del servidor: mientras `running` es
    True, `updated_at` marca el inicio del segmento en curso y `seg` la base
    acumulada; así el reloj continúa avanzando aunque se cierre el navegador.
    """
    __tablename__ = 'partido_en_vivo'

    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id', ondelete='CASCADE'), primary_key=True)
    seg = db.Column(db.Integer, nullable=False, default=0)
    running = db.Column(db.Boolean, nullable=False, default=False)
    iniciado = db.Column(db.Boolean, nullable=False, default=False)

    # `updated_at` es el ancla de tiempo del segmento y NO debe actualizarse en
    # cada latido (por eso no lleva `onupdate`).
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    partido = db.relationship('Partido', backref=db.backref('en_vivo', uselist=False, cascade='all, delete-orphan'))

    def seg_actual(self):
        """Segundos del cronómetro considerando el tiempo real transcurrido
        mientras estaba corriendo (persiste aún cerrando el navegador)."""
        base = self.seg or 0
        if self.running and self.iniciado and self.updated_at:
            elapsed = int((datetime.utcnow() - self.updated_at).total_seconds())
            base = base + elapsed
        return min(MAX_SEG, base)