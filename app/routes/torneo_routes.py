from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.torneo_service import TorneoService
from app.schemas.torneo_schema import TorneoSchema
from app.schemas.equipo_schema import EquipoSchema
from app.schemas.partido_schema import PartidoSchema
from app.schemas.fase_schema import FaseSchema
from app.routes._authz import get_current_user, require_roles, ensure_torneo_organizador

torneo_bp = Blueprint('torneos', __name__)
torneo_schema = TorneoSchema()
equipo_schema = EquipoSchema()
partido_schema = PartidoSchema()
fase_schema = FaseSchema()


@torneo_bp.route('', methods=['GET'])
@jwt_required()
def get_torneos():
    """Lista torneos. SUPERADMIN ve todos; los demás solo los de su organizador."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if user.role == 'SUPERADMIN':
        torneos = TorneoService.get_all()
    else:
        torneos = TorneoService.get_all(organizador_id=user.organizador_id)
    return jsonify(torneo_schema.dump(torneos, many=True)), 200


@torneo_bp.route('/<int:torneo_id>', methods=['GET'])
@jwt_required()
def get_torneo(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(torneo_schema.dump(torneo)), 200


@torneo_bp.route('', methods=['POST'])
@jwt_required()
@require_roles('SUPERADMIN', 'ORGANIZADOR')
def create_torneo(user):
    data = request.get_json() or {}
    # Forzar que el torneo pertenezca al organizador del usuario (salvo SUPERADMIN).
    if user.role != 'SUPERADMIN':
        if not data.get('organizador_id') or data['organizador_id'] != user.organizador_id:
            data['organizador_id'] = user.organizador_id
    torneo, error = TorneoService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(torneo_schema.dump(torneo)), 201


@torneo_bp.route('/<int:torneo_id>', methods=['PUT'])
@jwt_required()
def update_torneo(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    torneo, error = TorneoService.update(torneo, data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(torneo_schema.dump(torneo)), 200


@torneo_bp.route('/<int:torneo_id>/estado', methods=['POST'])
@jwt_required()
def change_estado(torneo_id):
    """Transición de estado (p. ej. CREADO -> INSCRIPCIONES_ABIERTAS)."""
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    nuevo_estado = data.get('estado')
    if not nuevo_estado:
        return jsonify({'error': 'Estado requerido'}), 400
    torneo, error = TorneoService.change_estado(torneo, nuevo_estado)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(torneo_schema.dump(torneo)), 200


@torneo_bp.route('/<int:torneo_id>/equipos', methods=['GET'])
@jwt_required()
def get_torneo_equipos(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    equipos = TorneoService.get_equipos(torneo_id)
    return jsonify(equipo_schema.dump(equipos, many=True)), 200


@torneo_bp.route('/<int:torneo_id>/partidos', methods=['GET'])
@jwt_required()
def get_torneo_partidos(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    fase_id = request.args.get('fase_id', type=int)
    partidos = TorneoService.get_partidos(torneo_id, fase_id=fase_id)
    return jsonify(partido_schema.dump(partidos, many=True)), 200


@torneo_bp.route('/<int:torneo_id>/fases', methods=['GET'])
@jwt_required()
def get_torneo_fases(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    fases = torneo.fases
    return jsonify(fase_schema.dump(fases, many=True)), 200


@torneo_bp.route('/<int:torneo_id>', methods=['DELETE'])
@jwt_required()
def delete_torneo(torneo_id):
    user = get_current_user()
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    TorneoService.delete(torneo)
    return jsonify({'message': 'Torneo eliminado'}), 200