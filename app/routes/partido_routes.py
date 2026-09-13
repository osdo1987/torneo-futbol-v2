from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.partido_service import PartidoService
from app.services.torneo_service import TorneoService
from app.schemas.partido_schema import PartidoSchema
from app.models.partido_alineacion import PartidoAlineacion
from app.models.jugador import Jugador
from app.extensions import db
from app.routes._authz import get_current_user, ensure_torneo_organizador

partido_bp = Blueprint('partidos', __name__)
partido_schema = PartidoSchema()


@partido_bp.route('', methods=['GET'])
@jwt_required()
def get_partidos():
    user = get_current_user()
    torneo_id = request.args.get('torneo_id', type=int)
    fase_id = request.args.get('fase_id', type=int)
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    partidos = PartidoService.get_all(torneo_id=torneo_id, fase_id=fase_id)
    return jsonify(partido_schema.dump(partidos, many=True)), 200


@partido_bp.route('/<int:partido_id>', methods=['GET'])
@jwt_required()
def get_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('', methods=['POST'])
@jwt_required()
def create_partido():
    user = get_current_user()
    data = request.get_json() or {}
    torneo_id = data.get('torneo_id')
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = TorneoService.get_by_id(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    partido, error = PartidoService.create(data)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 201


@partido_bp.route('/<int:partido_id>/programar', methods=['POST'])
@jwt_required()
def programar_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    partido, error = PartidoService.schedule(partido, data.get('fecha_programada'))
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/aplazar', methods=['POST'])
@jwt_required()
def aplazar_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    partido, error = PartidoService.aplazar(partido)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/resultado', methods=['POST'])
@jwt_required()
def registrar_resultado(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    try:
        gl = int(data.get('goles_local', 0))
        gv = int(data.get('goles_visitante', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Goles inválidos'}), 400
    partido, error = PartidoService.registrar_resultado(partido, gl, gv)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/marcador', methods=['POST'])
@jwt_required()
def actualizar_marcador(partido_id):
    """Actualiza el marcador en tiempo real (sin fijar resultado)."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    try:
        gl = int(data.get('goles_local', 0))
        gv = int(data.get('goles_visitante', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'Goles inválidos'}), 400
    partido, error = PartidoService.actualizar_goles_realtime(partido, gl, gv)
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200


@partido_bp.route('/<int:partido_id>/alineacion', methods=['GET'])
@jwt_required()
def get_alineacion(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    items = PartidoAlineacion.query.filter_by(partido_id=partido_id).all()
    return jsonify([{
        'id': i.id, 'jugador_id': i.jugador_id, 'equipo_id': i.equipo_id,
        'titular': i.titular, 'numero_camiseta': i.numero_camiseta,
        'posicion_tactica': i.posicion_tactica, 'posicion_orden': i.posicion_orden,
    } for i in items]), 200


@partido_bp.route('/<int:partido_id>/alineacion', methods=['POST'])
@jwt_required()
def upsert_alineacion(partido_id):
    """Convoca/actualiza un jugador al partido. body: {jugador_id, titular, numero_camiseta?}."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if partido.resultado != 'PENDIENTE':
        return jsonify({'error': 'No se puede modificar la alineación de un partido jugado'}), 400
    data = request.get_json() or {}
    jugador_id = data.get('jugador_id')
    if not jugador_id:
        return jsonify({'error': 'jugador_id es requerido'}), 400
    jugador = Jugador.query.get(jugador_id)
    if not jugador:
        return jsonify({'error': 'Jugador no encontrado'}), 404
    if jugador.equipo_id not in (partido.equipo_local_id, partido.equipo_visitante_id):
        return jsonify({'error': 'El jugador no pertenece a ninguno de los equipos del partido'}), 400
    if not jugador.activo:
        return jsonify({'error': 'El jugador está inactivo (liberado)'}), 400
    titular = bool(data.get('titular', False))
    numero_camiseta = data.get('numero_camiseta')
    if numero_camiseta is not None:
        try:
            numero_camiseta = int(numero_camiseta)
        except (TypeError, ValueError):
            return jsonify({'error': 'Número de camiseta inválido'}), 400
        if not (0 <= numero_camiseta <= 999):
            return jsonify({'error': 'Número de camiseta fuera de rango'}), 400

    item = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=jugador_id).first()
    if not item:
        item = PartidoAlineacion(partido_id=partido_id, equipo_id=jugador.equipo_id, jugador_id=jugador_id,
                                 titular=titular, numero_camiseta=numero_camiseta)
        db.session.add(item)
    else:
        item.titular = titular
        item.numero_camiseta = numero_camiseta

    # Número efectivo: usa el del partido, si no el inscrito del jugador
    numero_efectivo = numero_camiseta if numero_camiseta is not None else jugador.numero_camiseta
    otros = PartidoAlineacion.query.filter(
        PartidoAlineacion.partido_id == partido_id,
        PartidoAlineacion.equipo_id == jugador.equipo_id,
        PartidoAlineacion.jugador_id != jugador_id,
    ).all()
    if otros and numero_efectivo is not None:
        otros_ids = [o.jugador_id for o in otros]
        inscritos = {i.id: i.numero_camiseta for i in Jugador.query.filter(Jugador.id.in_(otros_ids)).all()}
        for o in otros:
            onum = o.numero_camiseta if o.numero_camiseta is not None else inscritos.get(o.jugador_id)
            if onum == numero_efectivo:
                db.session.rollback()
                return jsonify({'error': f'El número {numero_efectivo} ya está siendo usado por otro jugador de este equipo'}), 400

    db.session.commit()
    return jsonify({'id': item.id, 'jugador_id': item.jugador_id, 'equipo_id': item.equipo_id,
                    'titular': item.titular, 'numero_camiseta': item.numero_camiseta}), 200


@partido_bp.route('/<int:partido_id>/alineacion/<int:jugador_id>', methods=['DELETE'])
@jwt_required()
def delete_alineacion(partido_id, jugador_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    item = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=jugador_id).first()
    if not item:
        return jsonify({'error': 'El jugador no está en la alineación'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Jugador removido de la alineación'}), 200


@partido_bp.route('/<int:partido_id>/alineacion/orden', methods=['POST'])
@jwt_required()
def guardar_orden_alineacion(partido_id):
    """Guarda la formación táctica de un equipo. body: {equipo_id, items:[{jugador_id, posicion, orden}]}."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if partido.resultado != 'PENDIENTE':
        return jsonify({'error': 'No se puede modificar la formación de un partido jugado'}), 400
    data = request.get_json() or {}
    items = data.get('items')
    if not isinstance(items, list):
        return jsonify({'error': 'items es requerido'}), 400
    equipo_id = data.get('equipo_id')
    posiciones = {'POR', 'DEF', 'MED', 'DEL', 'OTROS'}
    for it in items:
        jugador_id = it.get('jugador_id')
        if not jugador_id:
            return jsonify({'error': 'jugador_id es requerido en cada item'}), 400
        fila = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=jugador_id).first()
        if not fila:
            return jsonify({'error': f'El jugador {jugador_id} no está en la alineación'}), 400
        pos = it.get('posicion')
        if pos not in posiciones:
            return jsonify({'error': 'Posición inválida'}), 400
        fila.posicion_tactica = pos
        fila.posicion_orden = it.get('orden', 0)
    db.session.commit()
    items = PartidoAlineacion.query.filter_by(partido_id=partido_id, equipo_id=equipo_id).all() if equipo_id else []
    return jsonify([{
        'jugador_id': i.jugador_id, 'equipo_id': i.equipo_id,
        'titular': i.titular, 'posicion_tactica': i.posicion_tactica, 'posicion_orden': i.posicion_orden,
    } for i in items]), 200


@partido_bp.route('/<int:partido_id>/en_vivo', methods=['GET'])
@jwt_required()
def get_en_vivo(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    return jsonify(PartidoService.en_vivo_dict(partido_id)), 200


@partido_bp.route('/<int:partido_id>/en_vivo', methods=['POST'])
@jwt_required()
def guardar_en_vivo(partido_id):
    """Persiste el cronómetro del partido en vivo. body: {seg, running, iniciado}."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    vivo, error = PartidoService.guardar_en_vivo(
        partido,
        seg=data.get('seg', 0),
        running=data.get('running', False),
        iniciado=data.get('iniciado', False),
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'partido_id': vivo.partido_id, 'seg': vivo.seg, 'running': vivo.running, 'iniciado': vivo.iniciado}), 200


@partido_bp.route('/<int:partido_id>/w', methods=['POST'])
@jwt_required()
def registrar_walkover(partido_id):
    """W por inasistencia (marcador configurable en el reglamento del torneo)."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    partido, error = PartidoService.registrar_walkover(partido, (data.get('bando') or '').upper())
    if error:
        return jsonify({'error': error}), 400
    return jsonify(partido_schema.dump(partido)), 200