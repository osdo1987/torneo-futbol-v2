from datetime import datetime

from app.extensions import db


class PartidoEnVivo(db.Model):
    """Estado en tiempo real de un partido que se está jugando (cronómetro público)."""
    __tablename__ = 'partido_en_vivo'

    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id', ondelete='CASCADE'), primary_key=True)
    seg = db.Column(db.Integer, nullable=False, default=0)
    running = db.Column(db.Boolean, nullable=False, default=False)
    iniciado = db.Column(db.Boolean, nullable=False, default=False)

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    partido = db.relationship('Partido', backref=db.backref('en_vivo', uselist=False, cascade='all, delete-orphan'))