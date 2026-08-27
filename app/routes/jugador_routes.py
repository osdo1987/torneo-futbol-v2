from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.jugador_service import JugadorService
from app.services.equipo_service import EquipoService
from app.schemas.jugador_schema import JugadorSchema
from app.routes._authz import get_current_user, ensure_torneo_organizador

jugador_bp = Blueprint('jugadores', __name__)
jugador_schema = JugadorSchema()


def _get_equipo(equipo_id):
    return EquipoService.get_by_id(equipo_id)


@jugador_bp.route('', methods=['GET'])
@jwt_required()
def get_jugadores():
    user = get_current_user()
    equipo_id = request.args.get('equipo_id', type=int)
    jugadores = JugadorService.get_all(equipo_id=equipo_id)
    # Filtrar por acceso al organizador cuando hay equipo asociado.
    if equipo_id:
        equipo = _get_equipo(equipo_id)
        if not equipo or not ensure_torneo_organizador(user, equipo.torneo):
            return jsonify({'error': 'No autorizado'}), 403
    return jsonify(jugador_schema.dump(jugadores, many=True)), 200


@jugador_bp.route('/<int:jugador_id>', methods=['GET'])
@jwt_required()
def get_jugador(jugador_id):
    user = get_current_user()
    jugador = JugadorService.get_by_id(jugador_id)
    if not jugador:
        return jsonify({'error': 'Jugador no encontrado'}), 404
    if not ensure_torneo_organizador(user, jugador.equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(jugador_schema.dump(jugador)), 200


@jugador_bp.route('', methods=['POST'])
@jwt_required()
def create_jugador():
    user = get_current_user()
    data = request.get_json() or {}
    equipo_id = data.get('equipo_id')
    if not equipo_id:
        return jsonify({'error': 'equipo_id es requerido'}), 400
    equipo = _get_equipo(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    # Validar cupo máx. jugadores por equipo (si inscripciones abiertas).
    torneo = equipo.torneo
    if not torneo.inscripciones_jugadores_abiertas and torneo.estado not in ('CREADO', 'INSCRIPCIONES_ABIERTAS'):
        return jsonify({'error': 'Inscripciones de jugadores cerradas'}), 400
    jugador, error = JugadorService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(jugador_schema.dump(jugador)), 201


@jugador_bp.route('/<int:jugador_id>', methods=['PUT'])
@jwt_required()
def update_jugador(jugador_id):
    user = get_current_user()
    jugador = JugadorService.get_by_id(jugador_id)
    if not jugador:
        return jsonify({'error': 'Jugador no encontrado'}), 404
    if not ensure_torneo_organizador(user, jugador.equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    jugador, error = JugadorService.update(jugador, data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(jugador_schema.dump(jugador)), 200


@jugador_bp.route('/<int:jugador_id>/liberar', methods=['POST'])
@jwt_required()
def liberar_jugador(jugador_id):
    user = get_current_user()
    jugador = JugadorService.get_by_id(jugador_id)
    if not jugador:
        return jsonify({'error': 'Jugador no encontrado'}), 404
    if not ensure_torneo_organizador(user, jugador.equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    jugador, error = JugadorService.liberar(jugador)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(jugador_schema.dump(jugador)), 200


@jugador_bp.route('/<int:jugador_id>', methods=['DELETE'])
@jwt_required()
def delete_jugador(jugador_id):
    user = get_current_user()
    jugador = JugadorService.get_by_id(jugador_id)
    if not jugador:
        return jsonify({'error': 'Jugador no encontrado'}), 404
    if not ensure_torneo_organizador(user, jugador.equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    JugadorService.delete(jugador)
    return jsonify({'message': 'Jugador eliminado'}), 200