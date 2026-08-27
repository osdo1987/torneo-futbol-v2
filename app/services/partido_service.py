from datetime import datetime
from marshmallow import ValidationError
from app.extensions import db
from app.models.partido import Partido, RESULTADO_PARTIDO
from app.models.torneo import Torneo
from app.models.evento_partido import EventoPartido
from app.models.jugador import Jugador
from app.models.equipo import Equipo
from app.schemas.partido_schema import PartidoSchema


class PartidoService:
    @staticmethod
    def get_all(torneo_id=None, fase_id=None):
        q = Partido.query
        if torneo_id:
            q = q.filter_by(torneo_id=torneo_id)
        if fase_id:
            q = q.filter_by(fase_id=fase_id)
        return q.order_by(Partido.jornada, Partido.fecha_programada).all()

    @staticmethod
    def get_by_id(partido_id):
        return Partido.query.get(partido_id)

    @staticmethod
    def create(data):
        try:
            partido = PartidoSchema().load(data)
            torneo = Torneo.query.get(partido.torneo_id)
            if not torneo:
                return None, 'Torneo no encontrado'
            if partido.equipo_local_id == partido.equipo_visitante_id:
                return None, 'El equipo local no puede ser igual al visitante'
            db.session.add(partido)
            db.session.commit()
            return partido, None
        except ValidationError as e:
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def schedule(partido, fecha_programada):
        if not fecha_programada:
            return None, 'La fecha es obligatoria'
        if partido.resultado not in ('PENDIENTE', 'POSTERGADO'):
            return None, 'No se puede reprogramar un partido finalizado'
        if isinstance(fecha_programada, str):
            try:
                fecha_programada = datetime.fromisoformat(fecha_programada.replace('Z', '+00:00'))
            except ValueError:
                return None, 'Formato de fecha inválido'
        partido.fecha_programada = fecha_programada
        if partido.resultado == 'POSTERGADO':
            partido.resultado = 'PENDIENTE'
        db.session.commit()
        return partido, None

    @staticmethod
    def aplazar(partido):
        if partido.resultado != 'PENDIENTE':
            return None, 'Solo se pueden aplazar partidos pendientes'
        partido.resultado = 'POSTERGADO'
        db.session.commit()
        return partido, None

    @staticmethod
    def registrar_resultado(partido, goles_local, goles_visitante):
        if partido.resultado != 'PENDIENTE':
            return None, 'El resultado ya fue registrado'
        if goles_local < 0 or goles_visitante < 0:
            return None, 'Los goles no pueden ser negativos'
        partido.goles_local = goles_local
        partido.goles_visitante = goles_visitante
        if goles_local > goles_visitante:
            partido.resultado = 'LOCAL_GANO'
        elif goles_visitante > goles_local:
            partido.resultado = 'VISITANTE_GANO'
        else:
            partido.resultado = 'EMPATE'
        db.session.commit()
        return partido, None

    @staticmethod
    def actualizar_goles_realtime(partido, goles_local, goles_visitante):
        """Actualiza el marcador en tiempo real solo si sigue pendiente."""
        if partido.resultado != 'PENDIENTE':
            return None, 'Solo se puede actualizar el marcador de un partido pendiente'
        if goles_local < 0 or goles_visitante < 0:
            return None, 'Los goles no pueden ser negativos'
        partido.goles_local = goles_local
        partido.goles_visitante = goles_visitante
        db.session.commit()
        return partido, None

    @staticmethod
    def get_eventos(partido_id):
        return EventoPartido.query.filter_by(partido_id=partido_id).order_by(EventoPartido.minuto).all()