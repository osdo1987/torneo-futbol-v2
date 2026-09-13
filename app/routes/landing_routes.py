import os
import base64
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.landing_service import LandingService
from app.services.organizador_service import OrganizadorService
from app.services.torneo_service import TorneoService
from app.services.estadistica_service import EstadisticaService
from app.routes._authz import get_current_user, ensure_organizador

landing_bp = Blueprint('landing', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
MIME_MAP = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _target_org(user):
    """Organizador objetivo: el del usuario autenticado o, si es SUPERADMIN,
    el indicado por query param `organizador_id`."""
    org_id = request.args.get('organizador_id', type=int)
    if user.role == 'SUPERADMIN' and org_id:
        return org_id
    return user.organizador_id


@landing_bp.route('/<slug>', methods=['GET'])
def get_public_landing(slug):
    """Landing pública de un organizador (sin autenticación)."""
    result = LandingService.get_public_by_slug(slug)
    if not result:
        return jsonify({'error': 'Organizador no encontrado'}), 404
    return jsonify(result), 200


def _public_torneo(torneo_id):
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return None, jsonify({'error': 'Torneo no encontrado'}), 404
    return torneo, None, None


@landing_bp.route('/torneo/<int:torneo_id>/tabla', methods=['GET'])
def public_tabla(torneo_id):
    """Posiciones de un torneo (público)."""
    torneo, err_resp, err_code = _public_torneo(torneo_id)
    if err_resp:
        return err_resp, err_code
    return jsonify({'torneo': torneo.nombre, 'posiciones': EstadisticaService.tabla_posiciones(torneo_id)}), 200


@landing_bp.route('/torneo/<int:torneo_id>/goleadores', methods=['GET'])
def public_goleadores(torneo_id):
    """Goleadores de un torneo (público)."""
    torneo, err_resp, err_code = _public_torneo(torneo_id)
    if err_resp:
        return err_resp, err_code
    top = request.args.get('top', default=10, type=int)
    return jsonify({'torneo': torneo.nombre, 'goleadores': EstadisticaService.goleadores(torneo_id, top=top)}), 200


@landing_bp.route('/torneo/<int:torneo_id>/partidos', methods=['GET'])
def public_partidos(torneo_id):
    """Fixture de un torneo agrupado por jornada (público)."""
    torneo, err_resp, err_code = _public_torneo(torneo_id)
    if err_resp:
        return err_resp, err_code
    return jsonify({'torneo': torneo.nombre, 'jornadas': LandingService.public_partidos(torneo_id)}), 200


@landing_bp.route('/torneo/<int:torneo_id>/sanciones', methods=['GET'])
def public_sanciones(torneo_id):
    """Sanciones acumuladas por jugador (público)."""
    torneo, err_resp, err_code = _public_torneo(torneo_id)
    if err_resp:
        return err_resp, err_code
    return jsonify({'torneo': torneo.nombre, 'sanciones': EstadisticaService.sanciones(torneo_id)}), 200


@landing_bp.route('/torneo/<int:torneo_id>/resumen', methods=['GET'])
def public_resumen(torneo_id):
    """Resumen de un torneo: cantidades, líder, goleador y tallies (público)."""
    torneo, err_resp, err_code = _public_torneo(torneo_id)
    if err_resp:
        return err_resp, err_code
    from app.models.equipo import Equipo
    from app.models.partido import Partido
    from app.models.evento_partido import EventoPartido
    from app.services.estadistica_service import RESULTADOS_JUGADOS

    filas = EstadisticaService.tabla_posiciones(torneo_id)
    goleadores = EstadisticaService.goleadores(torneo_id, top=1)
    jugados = Partido.query.filter(
        Partido.torneo_id == torneo_id,
        Partido.resultado.in_(RESULTADOS_JUGADOS)
    ).all()
    pids = [p.id for p in jugados]
    if pids:
        goles_totales = sum(p.goles_local + p.goles_visitante for p in jugados)
        amarillas = EventoPartido.query.filter(
            EventoPartido.partido_id.in_(pids),
            EventoPartido.tipo == 'TARJETA_AMARILLA'
        ).count()
        rojas = EventoPartido.query.filter(
            EventoPartido.partido_id.in_(pids),
            EventoPartido.tipo == 'TARJETA_ROJA'
        ).count()
    else:
        goles_totales = amarillas = rojas = 0
    return jsonify({
        'torneo': torneo.nombre,
        'equipos': Equipo.query.filter_by(torneo_id=torneo_id).count(),
        'partidos': Partido.query.filter_by(torneo_id=torneo_id).count(),
        'partidos_jugados': len(jugados),
        'goles_totales': goles_totales,
        'goles_partido': round(goles_totales / len(jugados), 1) if jugados else 0,
        'amarillas': amarillas,
        'rojas': rojas,
        'lider': {'equipo': filas[0]['equipo'], 'pts': filas[0]['PTS']} if filas else None,
        'goleador': goleadores[0] if goleadores else None,
    }), 200


@landing_bp.route('/partido/<int:partido_id>/eventos', methods=['GET'])
def public_eventos(partido_id):
    """Eventos de un partido (público)."""
    from app.models.partido import Partido
    from app.models.evento_partido import EventoPartido
    from app.models.jugador import Jugador
    from app.models.equipo import Equipo

    partido = Partido.query.get(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    eventos = EventoPartido.query.filter_by(partido_id=partido_id).order_by(EventoPartido.minuto).all()
    data = []
    for ev in eventos:
        jugador = Jugador.query.get(ev.jugador_id) if ev.jugador_id else None
        equipo = Equipo.query.get(ev.equipo_id) if ev.equipo_id else None
        data.append({
            'id': ev.id,
            'tipo': ev.tipo,
            'minuto': ev.minuto,
            'jugador': jugador.nombre if jugador else None,
            'jugador_sale': (Jugador.query.get(ev.jugador_sale_id).nombre
                             if ev.jugador_sale_id and Jugador.query.get(ev.jugador_sale_id) else None),
            'equipo': equipo.nombre if equipo else None,
            'descripcion': ev.descripcion,
        })
    return jsonify({'partido_id': partido_id, 'eventos': data}), 200


@landing_bp.route('/partido/<int:partido_id>/alineaciones', methods=['GET'])
def public_alineaciones(partido_id):
    """Alineaciones (formación + suplentes) y cambios de un partido (público)."""
    result = LandingService.alineaciones_partido(partido_id)
    if not result:
        return jsonify({'error': 'Partido no encontrado'}), 404
    return jsonify(result), 200


@landing_bp.route('/partido/<int:partido_id>/vivo', methods=['GET'])
def public_en_vivo(partido_id):
    """Estado en vivo (cronómetro) de un partido (público)."""
    from app.models.partido import Partido

    partido = Partido.query.get(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    return jsonify(LandingService.en_vivo_partido(partido_id)), 200


@landing_bp.route('/manage', methods=['GET'])
@jwt_required()
def get_landing_manage():
    """Datos de landing + organizador para el editor. (ORGANIZADOR / SUPERADMIN)"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if user.role not in ('ORGANIZADOR', 'SUPERADMIN'):
        return jsonify({'error': 'No autorizado'}), 403
    org_id = _target_org(user)
    if not org_id or not ensure_organizador(user, org_id):
        return jsonify({'error': 'No autorizado'}), 403
    org = OrganizadorService.get_by_id(org_id)
    if not org:
        return jsonify({'error': 'Organizador no encontrado'}), 404
    return jsonify(LandingService.get_payload(org)), 200


@landing_bp.route('/manage', methods=['PUT'])
@jwt_required()
def update_landing_manage():
    """Crea o actualiza la configuración de la landing. (ORGANIZADOR / SUPERADMIN)"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if user.role not in ('ORGANIZADOR', 'SUPERADMIN'):
        return jsonify({'error': 'No autorizado'}), 403
    org_id = _target_org(user)
    if not org_id or not ensure_organizador(user, org_id):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    LandingService.create_or_update(org_id, data)
    return jsonify({'message': 'Landing actualizada correctamente'}), 200


@landing_bp.route('/manage', methods=['DELETE'])
@jwt_required()
def delete_landing_manage():
    """Elimina la configuración de la landing. (ORGANIZADOR / SUPERADMIN)"""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if user.role not in ('ORGANIZADOR', 'SUPERADMIN'):
        return jsonify({'error': 'No autorizado'}), 403
    org_id = _target_org(user)
    if not org_id or not ensure_organizador(user, org_id):
        return jsonify({'error': 'No autorizado'}), 403
    if LandingService.delete_landing(org_id):
        return jsonify({'message': 'Landing eliminada'}), 200
    return jsonify({'error': 'Landing no encontrada'}), 404


@landing_bp.route('/upload-image', methods=['POST'])
@jwt_required()
def upload_image():
    """Sube una imagen y devuelve su data URI (base64). No se guarda en disco."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if user.role not in ('ORGANIZADOR', 'SUPERADMIN'):
        return jsonify({'error': 'No autorizado'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No se proporcionó ningún archivo'}), 400
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Tipo de archivo inválido. Permitidos: png, jpg, jpeg, gif, webp, svg'}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > 5 * 1024 * 1024:
        return jsonify({'error': 'Archivo demasiado grande. Máximo 5MB'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    data_uri = f'data:{MIME_MAP.get(ext, "image/png")};base64,{base64.b64encode(file.read()).decode("utf-8")}'
    return jsonify({'url': data_uri, 'filename': file.filename}), 200