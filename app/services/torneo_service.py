from marshmallow import ValidationError
from app.extensions import db
from app.models.torneo import Torneo, VALID_TORNEO_STATES, TORNEO_TRANSITIONS
from app.models.equipo import Equipo
from app.models.partido import Partido
from app.schemas.torneo_schema import TorneoSchema


class TorneoService:
    @staticmethod
    def get_all(organizador_id=None):
        q = Torneo.query
        if organizador_id:
            q = q.filter_by(organizador_id=organizador_id)
        return q.order_by(Torneo.created_at.desc()).all()

    @staticmethod
    def get_by_id(torneo_id):
        return Torneo.query.get(torneo_id)

    @staticmethod
    def create(data):
        try:
            torneo = TorneoSchema().load(data)
            db.session.add(torneo)
            db.session.commit()
            return torneo, None
        except ValidationError as e:
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update(torneo, data):
        try:
            for key, value in data.items():
                if key in ('id', 'estado', 'created_at', 'updated_at', 'fases', 'equipos', 'partidos'):
                    continue
                setattr(torneo, key, value)
            db.session.commit()
            return torneo, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def change_estado(torneo, nuevo_estado):
        """Transición de estado del torneo con validación de máquina de estados."""
        if nuevo_estado not in VALID_TORNEO_STATES:
            return None, f'Estado inválido: {nuevo_estado}'
        if not torneo.can_transition_to(nuevo_estado):
            return None, f'Transición inválida de {torneo.estado} a {nuevo_estado}'
        torneo.estado = nuevo_estado
        db.session.commit()
        return torneo, None

    @staticmethod
    def delete(torneo):
        db.session.delete(torneo)
        db.session.commit()
        return True

    @staticmethod
    def get_equipos(torneo_id):
        return Equipo.query.filter_by(torneo_id=torneo_id).order_by(Equipo.nombre).all()

    @staticmethod
    def get_partidos(torneo_id, fase_id=None):
        q = Partido.query.filter_by(torneo_id=torneo_id)
        if fase_id:
            q = q.filter_by(fase_id=fase_id)
        return q.order_by(Partido.jornada, Partido.fecha_programada).all()