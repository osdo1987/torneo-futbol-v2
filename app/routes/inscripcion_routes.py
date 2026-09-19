from flask import Blueprint, request, jsonify
from app.models.equipo import Equipo
from app.models.jugador import Jugador
from app.schemas.jugador_schema import JugadorSchema
from app.services.jugador_service import JugadorService
from app.services.reglas import reglas_normalizadas

inscripcion_bp = Blueprint('inscripcion', __name__)
jugador_schema = JugadorSchema()


def _equipo_por_slug(slug):
    if not slug:
        return None
    return Equipo.query.filter_by(inscripcion_slug=slug).first()


def _abierta(torneo):
    return torneo.inscripciones_jugadores_abiertas or torneo.estado in ('CREADO', 'INSCRIPCIONES_ABIERTAS')


@inscripcion_bp.route('/<slug>', methods=['GET'])
def get_inscripcion(slug):
    """Información pública del equipo/torneo detrás de un link de inscripción."""
    equipo = _equipo_por_slug(slug)
    if not equipo:
        return jsonify({'error': 'Link de inscripción no encontrado'}), 404
    torneo = equipo.torneo
    maxj = reglas_normalizadas(torneo).get('max_jugadores') or torneo.max_jugadores_por_equipo
    activos = Jugador.query.filter_by(equipo_id=equipo.id, activo=True).count()
    return jsonify({
        'slug': slug,
        'equipo': {'id': equipo.id, 'nombre': equipo.nombre},
        'torneo': {'nombre': torneo.nombre, 'estado': torneo.estado},
        'organizador': torneo.organizador.name if torneo.organizador else None,
        'inscripciones_abiertas': _abierta(torneo),
        'max_jugadores': maxj,
        'jugadores_inscritos': activos,
        'cupo_disponible': max(0, maxj - activos),
    }), 200


@inscripcion_bp.route('/<slug>', methods=['POST'])
def crear_inscripcion(slug):
    """Registra a un jugador en el equipo del link (público, sin autenticación)."""
    equipo = _equipo_por_slug(slug)
    if not equipo:
        return jsonify({'error': 'Link de inscripción no encontrado'}), 404
    data = request.get_json() or {}
    if not (data.get('nombre') or '').strip():
        return jsonify({'error': 'El nombre es requerido'}), 400
    requeridos = {
        'documento_identidad': 'El documento de identidad es requerido',
        'fecha_nacimiento': 'La fecha de nacimiento es requerida',
        'telefono': 'El teléfono es requerido',
        'tipo_sangre': 'El tipo de sangre es requerido',
        'eps': 'La EPS / entidad de salud es requerida',
        'contacto_emergencia': 'El contacto de emergencia es requerido',
        'alergias': 'Las alergias o condiciones médicas son requeridas',
    }
    for campo, mensaje in requeridos.items():
        if not (data.get(campo) or '').strip():
            return jsonify({'error': mensaje}), 400
    data['equipo_id'] = equipo.id
    error = JugadorService.validar_inscripcion_jugador(equipo, data)
    if error:
        return jsonify({'error': error}), 400
    jugador, err = JugadorService.create(data)
    if err:
        mensaje = err.messages if hasattr(err, 'messages') else str(err)
        if isinstance(mensaje, dict):
            mensaje = '; '.join(
                f'{k}: {" ".join(map(str, v)) if isinstance(v, list) else v}' for k, v in mensaje.items())
        return jsonify({'error': mensaje}), 400
    return jsonify({
        'message': 'Inscripción registrada',
        'jugador': jugador_schema.dump(jugador),
    }), 201