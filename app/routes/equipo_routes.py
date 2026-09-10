from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.equipo_service import EquipoService
from app.services.torneo_service import TorneoService
from app.schemas.equipo_schema import EquipoSchema
from app.schemas.jugador_schema import JugadorSchema
from app.routes._authz import get_current_user, ensure_torneo_organizador

equipo_bp = Blueprint('equipos', __name__)
equipo_schema = EquipoSchema()
jugador_schema = JugadorSchema()


def _get_torneo(torneo_id):
    return TorneoService.get_by_id(torneo_id)


@equipo_bp.route('', methods=['GET'])
@jwt_required()
def get_equipos():
    user = get_current_user()
    torneo_id = request.args.get('torneo_id', type=int)
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = _get_torneo(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    equipos = EquipoService.get_all(torneo_id)
    return jsonify(equipo_schema.dump(equipos, many=True)), 200


@equipo_bp.route('/<int:equipo_id>', methods=['GET'])
@jwt_required()
def get_equipo(equipo_id):
    user = get_current_user()
    equipo = EquipoService.get_by_id(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(equipo_schema.dump(equipo)), 200


@equipo_bp.route('', methods=['POST'])
@jwt_required()
def create_equipo():
    user = get_current_user()
    data = request.get_json() or {}
    torneo_id = data.get('torneo_id')
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = _get_torneo(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if torneo.estado not in ('CREADO', 'INSCRIPCIONES_ABIERTAS'):
        return jsonify({'error': 'Solo se pueden inscribir equipos con inscripciones abiertas'}), 400
    equipo, error = EquipoService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(equipo_schema.dump(equipo)), 201


@equipo_bp.route('/<int:equipo_id>', methods=['PUT'])
@jwt_required()
def update_equipo(equipo_id):
    user = get_current_user()
    equipo = EquipoService.get_by_id(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    equipo, error = EquipoService.update(equipo, data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(equipo_schema.dump(equipo)), 200


@equipo_bp.route('/<int:equipo_id>', methods=['DELETE'])
@jwt_required()
def delete_equipo(equipo_id):
    user = get_current_user()
    equipo = EquipoService.get_by_id(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    EquipoService.delete(equipo)
    return jsonify({'message': 'Equipo eliminado'}), 200


@equipo_bp.route('/<int:equipo_id>/jugadores', methods=['GET'])
@jwt_required()
def get_equipo_jugadores(equipo_id):
    user = get_current_user()
    equipo = EquipoService.get_by_id(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    from app.services.jugador_service import JugadorService
    jugadores = JugadorService.get_all(equipo_id=equipo_id)
    return jsonify(jugador_schema.dump(jugadores, many=True)), 200


@equipo_bp.route('/<int:equipo_id>/link', methods=['POST'])
@jwt_required()
def generar_link_inscripcion(equipo_id):
    """Genera (o devuelve) el link público de inscripción de jugadores del equipo."""
    from app.extensions import db
    import secrets
    user = get_current_user()
    equipo = EquipoService.get_by_id(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not equipo.inscripcion_slug:
        from app.models.equipo import Equipo
        while True:
            slug = secrets.token_urlsafe(8)[:12]
            if not Equipo.query.filter_by(inscripcion_slug=slug).first():
                break
        equipo.inscripcion_slug = slug
        db.session.commit()
    abierta = equipo.torneo.inscripciones_jugadores_abiertas or equipo.torneo.estado in ('CREADO', 'INSCRIPCIONES_ABIERTAS')
    return jsonify({
        'slug': equipo.inscripcion_slug,
        'equipo': equipo.nombre,
        'torneo': equipo.torneo.nombre,
        'inscripciones_abiertas': abierta,
    }), 200


@equipo_bp.route('/<int:equipo_id>/jugadores/importar', methods=['POST'])
@jwt_required()
def importar_plantilla(equipo_id):
    user = get_current_user()
    equipo = EquipoService.get_by_id(equipo_id)
    if not equipo:
        return jsonify({'error': 'Equipo no encontrado'}), 404
    if not ensure_torneo_organizador(user, equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    torneo = equipo.torneo
    if not torneo.inscripciones_jugadores_abiertas and torneo.estado not in ('CREADO', 'INSCRIPCIONES_ABIERTAS'):
        return jsonify({'error': 'Inscripciones de jugadores cerradas'}), 400
    data = request.get_json() or {}
    lista = data.get('jugadores') or []
    if not isinstance(lista, list) or not lista:
        return jsonify({'error': 'No se recibieron jugadores'}), 400
    from app.services.jugador_service import JugadorService
    resumen = JugadorService.importar_masivo(equipo, lista)
    return jsonify(resumen), 200