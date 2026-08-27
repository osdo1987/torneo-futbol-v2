from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.organizador_service import OrganizadorService
from app.schemas.organizador_schema import OrganizadorSchema
from app.routes._authz import get_current_user, require_roles, ensure_organizador

organizador_bp = Blueprint('organizadores', __name__)
organizador_schema = OrganizadorSchema()


@organizador_bp.route('', methods=['GET'])
@jwt_required()
@require_roles('SUPERADMIN')
def get_organizadores(_user):
    organizadores = OrganizadorService.get_all()
    return jsonify(organizador_schema.dump(organizadores, many=True)), 200


@organizador_bp.route('/<int:org_id>', methods=['GET'])
@jwt_required()
def get_organizador(org_id):
    user = get_current_user()
    org = OrganizadorService.get_by_id(org_id)
    if not org:
        return jsonify({'error': 'Organizador no encontrado'}), 404
    if not ensure_organizador(user, org_id):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(organizador_schema.dump(org)), 200


@organizador_bp.route('', methods=['POST'])
@jwt_required()
@require_roles('SUPERADMIN')
def create_organizador(_user):
    data = request.get_json() or {}
    org, error = OrganizadorService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(organizador_schema.dump(org)), 201


@organizador_bp.route('/<int:org_id>', methods=['PUT'])
@jwt_required()
def update_organizador(org_id):
    user = get_current_user()
    org = OrganizadorService.get_by_id(org_id)
    if not org:
        return jsonify({'error': 'Organizador no encontrado'}), 404
    if not ensure_organizador(user, org_id):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    org, error = OrganizadorService.update(org, data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(organizador_schema.dump(org)), 200


@organizador_bp.route('/<int:org_id>', methods=['DELETE'])
@jwt_required()
@require_roles('SUPERADMIN')
def delete_organizador(_user, org_id):
    org = OrganizadorService.get_by_id(org_id)
    if not org:
        return jsonify({'error': 'Organizador no encontrado'}), 404
    OrganizadorService.delete(org)
    return jsonify({'message': 'Organizador eliminado'}), 200