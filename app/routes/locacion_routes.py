from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.locacion_service import LocacionService
from app.schemas.locacion_schema import LocacionSchema
from app.routes._authz import get_current_user, ensure_organizador, ensure_management_role

locacion_bp = Blueprint('locaciones', __name__)
locacion_schema = LocacionSchema()


@locacion_bp.route('', methods=['GET'])
@jwt_required()
def get_locaciones():
    """Locaciones (sedes/canchas) del organizador. Filtro opcional ?activas=1."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    organizador_id = request.args.get('organizador_id', type=int) or user.organizador_id
    if not organizador_id:
        return jsonify({'error': 'organizador_id es requerido'}), 400
    if not ensure_organizador(user, organizador_id):
        return jsonify({'error': 'No autorizado'}), 403
    solo_activas = str(request.args.get('activas', '')).lower() in ('1', 'true', 'si', 'yes')
    locaciones = LocacionService.get_all(organizador_id, solo_activas=solo_activas)
    return jsonify(locacion_schema.dump(locaciones, many=True)), 200


@locacion_bp.route('', methods=['POST'])
@jwt_required()
def create_locacion():
    user = get_current_user()
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    if not data.get('organizador_id'):
        data['organizador_id'] = user.organizador_id
    if not ensure_organizador(user, data.get('organizador_id')):
        return jsonify({'error': 'No autorizado'}), 403
    locacion, error = LocacionService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(locacion_schema.dump(locacion)), 201


@locacion_bp.route('/<int:locacion_id>', methods=['PUT'])
@jwt_required()
def update_locacion(locacion_id):
    user = get_current_user()
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    locacion = LocacionService.get_by_id(locacion_id)
    if not locacion:
        return jsonify({'error': 'Locación no encontrada'}), 404
    if not ensure_organizador(user, locacion.organizador_id):
        return jsonify({'error': 'No autorizado'}), 403
    locacion, error = LocacionService.update(locacion, request.get_json() or {})
    if error:
        return jsonify({'error': error}), 400
    return jsonify(locacion_schema.dump(locacion)), 200


@locacion_bp.route('/<int:locacion_id>', methods=['DELETE'])
@jwt_required()
def delete_locacion(locacion_id):
    user = get_current_user()
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    locacion = LocacionService.get_by_id(locacion_id)
    if not locacion:
        return jsonify({'error': 'Locación no encontrada'}), 404
    if not ensure_organizador(user, locacion.organizador_id):
        return jsonify({'error': 'No autorizado'}), 403
    LocacionService.delete(locacion)
    return jsonify({'message': 'Locación eliminada'}), 200
