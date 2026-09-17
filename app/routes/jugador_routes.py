from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.jugador_service import JugadorService
from app.services.equipo_service import EquipoService
from app.schemas.jugador_schema import JugadorSchema
from app.routes._authz import get_current_user, ensure_torneo_organizador, ensure_management_role
from app.models.evento_partido import EventoPartido
from app.models.jugador import Jugador
from app.models.partido import Partido
from app.services.estadistica_service import RESULTADOS_JUGADOS
from app.services.reglas import reglas_normalizadas

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
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403

    error = JugadorService.validar_inscripcion_jugador(equipo, data)
    if error:
        return jsonify({'error': error}), 400

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
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    jugador, error = JugadorService.update(jugador, data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(jugador_schema.dump(jugador)), 200


@jugador_bp.route('/<int:jugador_id>/foto', methods=['POST'])
@jwt_required()
def set_jugador_foto(jugador_id):
    user = get_current_user()
    jugador = JugadorService.get_by_id(jugador_id)
    if not jugador:
        return jsonify({'error': 'Jugador no encontrado'}), 404
    if not ensure_torneo_organizador(user, jugador.equipo.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    foto = data.get('foto_url')
    if foto:
        import re
        m = re.match(r'^data:image/(png|jpeg|webp|jpg);base64,', foto or '')
        if not m:
            return jsonify({'error': 'Formato de imagen no válido (se admite PNG, JPEG o WebP)'}), 400
        if len(foto) > 1_000_000:
            return jsonify({'error': 'La imagen supera el tamaño máximo (1 MB)'}), 400
        jugador.foto_url = foto
    else:
        jugador.foto_url = None
    from app.extensions import db
    db.session.commit()
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
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    # Regla configurable: no dar de baja a quien ya disputó un partido
    reglas = reglas_normalizadas(jugador.equipo.torneo)
    if reglas.get('bloquear_baja_tras_jugar'):
        jugo = (EventoPartido.query.join(Partido)
                .filter(EventoPartido.jugador_id == jugador.id,
                        Partido.resultado.in_(RESULTADOS_JUGADOS))
                .first())
        if jugo:
            return jsonify({'error': 'No se puede dar de baja: el jugador ya disputó un partido'}), 400
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
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    JugadorService.delete(jugador)
    return jsonify({'message': 'Jugador eliminado'}), 200