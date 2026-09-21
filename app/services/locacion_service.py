from marshmallow import ValidationError
from app.extensions import db
from app.models.locacion import Locacion
from app.schemas.locacion_schema import LocacionSchema


class LocacionService:
    @staticmethod
    def get_all(organizador_id=None, solo_activas=False):
        q = Locacion.query
        if organizador_id:
            q = q.filter_by(organizador_id=organizador_id)
        if solo_activas:
            q = q.filter_by(activa=True)
        return q.order_by(Locacion.nombre).all()

    @staticmethod
    def get_by_id(locacion_id):
        return Locacion.query.get(locacion_id)

    @staticmethod
    def create(data):
        try:
            locacion = LocacionSchema().load(data)
            db.session.add(locacion)
            db.session.commit()
            return locacion, None
        except ValidationError as e:
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update(locacion, data):
        try:
            for key, value in data.items():
                if key in ('id', 'organizador_id', 'created_at', 'updated_at', 'partidos'):
                    continue
                setattr(locacion, key, value)
            db.session.commit()
            return locacion, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def delete(locacion):
        """Elimina la locación; los partidos ya programados quedan sin sede (SET NULL)."""
        db.session.delete(locacion)
        db.session.commit()
        return True
