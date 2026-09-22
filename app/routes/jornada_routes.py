from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.torneo import Torneo
from app.services.torneo_service import TorneoService
from app.routes._authz import get_current_user

jornada_bp = Blueprint('jornadas', __name__)


def _jornada_from_torneo(torneo):
    return {
        'id': torneo.id,
        'nombre': torneo.nombre,
        'estado': torneo.estado,
        'organizador_id': torneo.organizador_id,
        'organizador_nombre': torneo.organizador.nombre if torneo.organizador else None,
        'fecha_creacion': torneo.fecha_creacion.isoformat() if torneo.fecha_creacion else None,
        'fecha_inicio': torneo.fecha_inicio.isoformat() if hasattr(torneo, 'fecha_inicio') and torneo.fecha_inicio else None,
        'fecha_fin': torneo.fecha_fin.isoformat() if torneo.fecha_fin else None,
    }


@jornada_bp.route('', methods=['GET'])
@jwt_required()
def get_jornadas():
    """Lista los torneos como jornadas. SUPERADMIN ve todos; los demás solo los de su organizador."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    if user.role == 'SUPERADMIN':
        torneos = TorneoService.get_all()
    else:
        torneos = TorneoService.get_all(organizador_id=user.organizador_id)

    return jsonify([_jornada_from_torneo(t) for t in torneos]), 200