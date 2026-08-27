from marshmallow import ValidationError
from app.extensions import db
from app.models.equipo import Equipo
from app.schemas.equipo_schema import EquipoSchema


class EquipoService:
    @staticmethod
    def get_all(torneo_id):
        return Equipo.query.filter_by(torneo_id=torneo_id).order_by(Equipo.nombre).all()

    @staticmethod
    def get_by_id(equipo_id):
        return Equipo.query.get(equipo_id)

    @staticmethod
    def create(data):
        try:
            equipo = EquipoSchema().load(data)
            db.session.add(equipo)
            db.session.commit()
            return equipo, None
        except ValidationError as e:
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update(equipo, data):
        try:
            for key, value in data.items():
                if key in ('id', 'torneo_id', 'created_at', 'updated_at', 'jugadores'):
                    continue
                setattr(equipo, key, value)
            db.session.commit()
            return equipo, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def delete(equipo):
        db.session.delete(equipo)
        db.session.commit()
        return True

    @staticmethod
    def count_jugadores(equipo_id):
        from app.models.jugador import Jugador
        return Jugador.query.filter_by(equipo_id=equipo_id, activo=True).count()