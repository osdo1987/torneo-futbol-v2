from marshmallow import ValidationError
from app.extensions import db
from app.models.jugador import Jugador
from app.schemas.jugador_schema import JugadorSchema


class JugadorService:
    @staticmethod
    def get_all(equipo_id=None):
        q = Jugador.query
        if equipo_id:
            q = q.filter_by(equipo_id=equipo_id)
        return q.order_by(Jugador.nombre).all()

    @staticmethod
    def get_by_id(jugador_id):
        return Jugador.query.get(jugador_id)

    @staticmethod
    def create(data):
        try:
            jugador = JugadorSchema().load(data)
            db.session.add(jugador)
            db.session.commit()
            return jugador, None
        except ValidationError as e:
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update(jugador, data):
        try:
            for key, value in data.items():
                if key in ('id', 'equipo_id', 'created_at', 'updated_at', 'activo'):
                    continue
                setattr(jugador, key, value)
            db.session.commit()
            return jugador, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def liberar(jugador):
        """Libera a un jugador (equivalente a set activo = False en el dominio original)."""
        jugador.activo = False
        db.session.commit()
        return jugador, None

    @staticmethod
    def delete(jugador):
        db.session.delete(jugador)
        db.session.commit()
        return True