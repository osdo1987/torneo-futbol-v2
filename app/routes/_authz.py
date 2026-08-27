from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models.user import User


def get_current_user():
    user_id = get_jwt_identity()
    if not user_id:
        return None
    try:
        return User.query.get(int(user_id))
    except (TypeError, ValueError):
        return None


def require_roles(*roles):
    """Decorador: verifica que el usuario autenticado tenga uno de los roles dados."""
    from functools import wraps

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Usuario no encontrado'}), 404
            if roles and user.role not in roles:
                return jsonify({'error': 'No autorizado'}), 403
            return fn(user, *args, **kwargs)
        return wrapper
    return decorator


def ensure_organizador(user, organizador_id):
    """Verifica que el user tenga acceso al organizador indicado."""
    if user.role == 'SUPERADMIN':
        return True
    return user.organizador_id == organizador_id


def ensure_torneo_organizador(user, torneo):
    """Verifica que el user pertenezca al organizador del torneo."""
    if user.role == 'SUPERADMIN':
        return True
    return user.organizador_id == torneo.organizador_id