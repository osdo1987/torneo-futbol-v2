from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.estadistica_service import EstadisticaService
from app.services.torneo_service import TorneoService
from app.routes._authz import get_current_user, ensure_torneo_organizador

panel_bp = Blueprint('panel', __name__)


@panel_bp.route('/<int:torneo_id>/tabla', methods=['GET'])
@jwt_required()
def tabla_posiciones(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    filas = EstadisticaService.tabla_posiciones(torneo_id)
    return jsonify({'torneo': torneo.nombre, 'posiciones': filas}), 200


@panel_bp.route('/<int:torneo_id>/goleadores', methods=['GET'])
@jwt_required()
def goleadores(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    top = request.args.get('top', default=10, type=int)
    ranking = EstadisticaService.goleadores(torneo_id, top=top)
    return jsonify({'torneo': torneo.nombre, 'goleadores': ranking}), 200


@panel_bp.route('/<int:torneo_id>/resumen', methods=['GET'])
@jwt_required()
def resumen(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403

    from app.models.equipo import Equipo
    from app.models.partido import Partido
    equipos = Equipo.query.filter_by(torneo_id=torneo_id).count()
    partidos = Partido.query.filter_by(torneo_id=torneo_id).count()
    jugados = Partido.query.filter(
        Partido.torneo_id == torneo_id,
        Partido.resultado.in_(['LOCAL_GANO', 'VISITANTE_GANO', 'EMPATE'])
    ).count()
    filas = EstadisticaService.tabla_posiciones(torneo_id)

    return jsonify({
        'torneo': torneo.nombre,
        'estado': torneo.estado,
        'equipos': equipos,
        'partidos': partidos,
        'partidos_jugados': jugados,
        'goleador': filas[0]['equipo'] if filas else None,
    }), 200