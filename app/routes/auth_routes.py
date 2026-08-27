from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.auth_service import AuthService
from app.schemas.user_schema import LoginSchema, UserSchema
from app.routes._authz import get_current_user, require_roles

auth_bp = Blueprint('auth', __name__)
user_schema = UserSchema()
login_schema = LoginSchema()


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login de usuario."""
    data = request.get_json()
    errors = login_schema.validate(data)
    if errors:
        return jsonify(errors), 400
    result, status = AuthService.login(data['email'], data['password'])
    return jsonify(result), status


@auth_bp.route('/register-organizador', methods=['POST'])
@jwt_required()
@require_roles('SUPERADMIN')
def register_organizador(user):
    """Crea un organizador (tenant) y su usuario ORGANIZADOR. Solo SUPERADMIN."""
    data = request.get_json() or {}
    org_data = {
        'name': data.get('name'),
        'slug': data.get('slug'),
        'whatsapp': data.get('whatsapp'),
        'address': data.get('address'),
    }
    user_data = {
        'email': data.get('email'),
        'password': data.get('password'),
        'role': data.get('role', 'ORGANIZADOR'),
    }
    if not all([org_data['name'], org_data['slug'], user_data['email'], user_data['password']]):
        return jsonify({'error': 'Faltan campos obligatorios'}), 400
    result, status = AuthService.register_organizer(org_data, user_data)
    return jsonify(result), status


@auth_bp.route('/register-staff', methods=['POST'])
@jwt_required()
@require_roles('SUPERADMIN', 'ORGANIZADOR')
def register_staff(user):
    """Crea un usuario STAFF dentro del organizador del autenticado."""
    data = request.get_json() or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Faltan campos obligatorios'}), 400
    result, status = AuthService.register_staff(user, data)
    return jsonify(result), status


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_route():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify(user_schema.dump(user)), 200