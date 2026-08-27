from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.partido_service import PartidoService
from app.services.torneo_service import TorneoService
from app.schemas.partido_schema import PartidoSchema
from app.routes._authz import get_current_user, ensure_torneo_organizador

partido_bp = Blueprint('partidos', __name__)
partido_schema = PartidoSchema()


@partido_bp.route('', methods=['GET'])
@jwt_required()
def get_partidos():
    user = get_current_user()
    torneo_id = request.args.get('torneo_id', type=int)
    fase_id = request.args.get('fase_id', type=int)
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    partidos = PartidoService.get_all(torneo_id=torneo_id, fase_id=fase_id)
    return jsonify(partido_schema.dump(partidos, many=True)), 200


@partido_bp.route('/<int:partido_id>', methods=['GET'])
@jwt_required()
def get_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('', methods=['POST'])
@jwt_required()
def create_partido():
    user = get_current_user()
    data = request.get_json() or {}
    torneo_id = data.get('torneo_id')
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    partido, error = PartidoService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 201


@partido_bp.route('/<int:partido_id>/programar', methods=['POST'])
@jwt_required()
def programar_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    partido, error = PartidoService.schedule(partido, data.get('fecha_programada'))
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/aplazar', methods=['POST'])
@jwt_required()
def aplazar_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    partido, error = PartidoService.aplazar(partido)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/resultado', methods=['POST'])
@jwt_required()
def registrar_resultado(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    try:
        gl = int(data.get('goles_local', 0))
        gv = int(data.get('goles_visitante', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Goles inválidos'}), 400
    partido, error = PartidoService.registrar_resultado(partido, gl, gv)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/marcador', methods=['POST'])
@jwt_required()
def actualizar_marcador(partido_id):
    """Actualiza el marcador en tiempo real (sin fijar resultado)."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    try:
        gl = int(data.get('goles_local', 0))
        gv = int(data.get('goles_visitante', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Goles inválidos'}), 400
    partido, error = PartidoService.actualizar_goles_realtime(partido, gl, gv)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/w', methods=['POST'])
@jwt_required()
def registrar_walkover(partido_id):
    """W por inasistencia (marcador configurable en el reglamento del torneo)."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    partido, error = PartidoService.registrar_walkover(partido, (data.get('bando') or '').upper())
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200