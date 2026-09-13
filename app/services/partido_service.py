from datetime import datetime
from marshmallow import ValidationError
from app.extensions import db
from app.models.partido import Partido, RESULTADO_PARTIDO
from app.models.partido_en_vivo import PartidoEnVivo
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
    def registrar_walkover(partido, bando):
        """W por inasistencia: gana el bando presente con marcador configurado."""
        if partido.resultado != 'PENDIENTE':
            return None, 'El resultado ya fue registrado'
        if bando not in ('LOCAL', 'VISITANTE'):
            return None, "bando debe ser 'LOCAL' o 'VISITANTE'"
        from app.services.reglas import reglas_normalizadas
        reglas = reglas_normalizadas(partido.torneo)
        gw = int(reglas.get('marcador_w') or 3)
        if bando == 'LOCAL':
            partido.goles_local, partido.goles_visitante = gw, 0
            partido.resultado = 'W_LOCAL'
        else:
            partido.goles_local, partido.goles_visitante = 0, gw
            partido.resultado = 'W_VISITANTE'
        db.session.commit()
        return partido, None

    @staticmethod
    def get_eventos(partido_id):
        return EventoPartido.query.filter_by(partido_id=partido_id).order_by(EventoPartido.minuto).all()

    @staticmethod
    def en_vivo_dict(partido_id):
        vivo = PartidoEnVivo.query.get(partido_id)
        if not vivo:
            return {'partido_id': partido_id, 'seg': 0, 'running': False, 'iniciado': False}
        return {'partido_id': vivo.partido_id, 'seg': vivo.seg, 'running': vivo.running, 'iniciado': vivo.iniciado}

    @staticmethod
    def guardar_en_vivo(partido, seg, running, iniciado):
        """Persiste el cronómetro del partido en vivo (solo si sigue pendiente)."""
        if partido.resultado != 'PENDIENTE':
            return None, 'El partido ya no está pendiente'
        try:
            seg = max(0, min(5400, int(seg)))
        except (TypeError, ValueError):
            return None, 'seg inválido'
        running = bool(running)
        iniciado = bool(iniciado)
        vivo = PartidoEnVivo.query.get(partido.id)
        if not vivo:
            vivo = PartidoEnVivo(partido_id=partido.id)
            db.session.add(vivo)
        vivo.seg = seg
        vivo.running = running
        vivo.iniciado = iniciado
        db.session.commit()
        return vivo, None