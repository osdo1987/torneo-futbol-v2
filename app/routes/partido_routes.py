from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.partido_service import PartidoService
from app.services.torneo_service import TorneoService
from app.schemas.partido_schema import PartidoSchema
from app.models.partido_alineacion import PartidoAlineacion
from app.models.jugador import Jugador
from app.models.partido_en_vivo import PartidoEnVivo
from app.extensions import db
from app.routes._authz import get_current_user, ensure_torneo_organizador, ensure_management_role, ensure_planilla_role, ensure_delegado_equipo

partido_bp = Blueprint('partidos', __name__)
partido_schema = PartidoSchema()


def _error_convocatoria(user, partido, jugador, numero_camiseta):
    """Chequeos por jugador de una convocatoria. Devuelve (mensaje, status) o None si está bien.

    Compartido por el alta individual (upsert_alineacion) y la carga masiva
    (bulk_alineacion) para que no se diverjan las reglas.
    El chequeo de número de camiseta duplicado NO va acá: cada caller resuelve el
    conflicto contra una fuente distinta (filas ya en BD vs. lote en memoria).
    """
    if not ensure_delegado_equipo(user, jugador.equipo_id):
        return ('No autorizado', 403)
    if jugador.equipo_id not in (partido.equipo_local_id, partido.equipo_visitante_id):
        return ('El jugador no pertenece a ninguno de los equipos del partido', 400)
    if not jugador.activo:
        return ('El jugador está inactivo (liberado)', 400)
    from app.services.finanza_service import FinanzaService
    motivo_bloqueo = FinanzaService.bloqueo_jugador(partido.torneo, jugador)
    if motivo_bloqueo:
        return (f'Jugador bloqueado: {motivo_bloqueo}', 400)
    if numero_camiseta is not None and not (0 <= numero_camiseta <= 999):
        return ('Número de camiseta fuera de rango', 400)
    return None


def _normalizar_numero(valor):
    """Convierte el número de camiseta a int, o (None, error)."""
    if valor is None:
        return (None, None)
    try:
        return (int(valor), None)
    except (TypeError, ValueError):
        return (None, 'Número de camiseta inválido')


def _numero_libre(ocupados, preferido):
    """Primer número de camiseta libre para un equipo en un partido.

    Empieza por `preferido` (el dorsal inscrito del jugador) y sube; si el número
    preferido está tomado, se le asigna el siguiente libre escaneando hacia arriba
    (con vuelta a 1). Devuelve None si el rango 1..999 está completo.
    """
    candidato = preferido if (preferido is not None and preferido > 0) else 1
    n = candidato
    while n in ocupados:
        n += 1
        if n > 999:
            n = 1
        if n == candidato:
            return None
    return n


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


@partido_bp.route('/<int:partido_id>', methods=['PUT'])
@jwt_required()
def update_partido(partido_id):
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    partido, error = PartidoService.actualizar(partido, data)
    if error:
        return jsonify({'error': error}), 400
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
    if not ensure_management_role(user):
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
    if not ensure_management_role(user):
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
    if not ensure_management_role(user):
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


@partido_bp.route('/<int:partido_id>/acta', methods=['POST'])
@jwt_required()
def guardar_datos_acta(partido_id):
    """Guarda los datos del ACTA OFICIAL: equipo arbitral y observaciones/incidencias."""
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_planilla_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    partido.arbitro_nombre = (data.get('arbitro_nombre') or '').strip() or None
    partido.arbitro_asistente1 = (data.get('arbitro_asistente1') or '').strip() or None
    partido.arbitro_asistente2 = (data.get('arbitro_asistente2') or '').strip() or None
    partido.observaciones = (data.get('observaciones') or '').strip() or None
    db.session.commit()
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
    numero_camiseta, err = _normalizar_numero(data.get('numero_camiseta'))
    if err:
        return jsonify({'error': err}), 400
    explicit = data.get('numero_camiseta') is not None
    err = _error_convocatoria(user, partido, jugador, numero_camiseta)
    if err:
        return jsonify({'error': err[0]}), err[1]
    titular = bool(data.get('titular', False))

    # Números ya ocupados por otros convocados del mismo equipo en este partido
    otros = PartidoAlineacion.query.filter(
        PartidoAlineacion.partido_id == partido_id,
        PartidoAlineacion.equipo_id == jugador.equipo_id,
        PartidoAlineacion.jugador_id != jugador_id,
    ).all()
    otros_ids = [o.jugador_id for o in otros]
    inscritos_otros = {i.id: i.numero_camiseta for i in Jugador.query.filter(Jugador.id.in_(otros_ids)).all()}
    ocupados = {o.numero_camiseta if o.numero_camiseta is not None else inscritos_otros.get(o.jugador_id)
                for o in otros if (o.numero_camiseta if o.numero_camiseta is not None else inscritos_otros.get(o.jugador_id)) is not None}

    item = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=jugador_id).first()
    prev_custom = item.numero_camiseta if item else None

    if explicit:
        if numero_camiseta is not None and numero_camiseta in ocupados:
            return jsonify({'error': f'El número {numero_camiseta} ya está siendo usado por otro jugador de este equipo'}), 400
        numero_efectivo = numero_camiseta
    else:
        # Número implícito: conserva el número real ya asignado a este jugador si
        # sigue libre; si no, usa el dorsal inscrito o el siguiente libre del equipo.
        if prev_custom is not None and prev_custom not in ocupados:
            numero_efectivo = prev_custom
        else:
            numero_efectivo = _numero_libre(ocupados, jugador.numero_camiseta)
        if numero_efectivo is None:
            return jsonify({'error': 'No hay números de camiseta libres para este equipo'}), 400

    if not item:
        item = PartidoAlineacion(partido_id=partido_id, equipo_id=jugador.equipo_id, jugador_id=jugador_id,
                                 titular=titular, numero_camiseta=None)
        db.session.add(item)
    else:
        item.titular = titular

    # Banco: None significa "usar el dorsal inscrito"; solo se guarda número propio
    # cuando difiere del inscrito (auto-asignado) o fue explícito.
    if explicit:
        item.numero_camiseta = numero_camiseta
    else:
        item.numero_camiseta = None if jugador.numero_camiseta == numero_efectivo else numero_efectivo

    db.session.commit()
    return jsonify({'id': item.id, 'jugador_id': item.jugador_id, 'equipo_id': item.equipo_id,
                    'titular': item.titular, 'numero_camiseta': item.numero_camiseta}), 200


@partido_bp.route('/<int:partido_id>/alineacion/bulk', methods=['POST'])
@jwt_required()
def bulk_alineacion(partido_id):
    """Convoca/actualiza varios jugadores en una sola llamada.

    body: { jugadores: [{jugador_id, titular?, numero_camiseta?, posicion_tactica?, posicion_orden?}] }

    Es el atajo que usa la Planilla para cargar la lista de un saque (plantel activo
    o XI del partido anterior) en lugar de ~22 requests individuales. Es de éxito
    parcial: un jugador inválido no aborta el resto, se devuelve en `omitidos`.
    """
    user = get_current_user()
    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if partido.resultado != 'PENDIENTE':
        return jsonify({'error': 'No se puede modificar la alineación de un partido jugado'}), 400

    jugadores = (request.get_json() or {}).get('jugadores')
    if not isinstance(jugadores, list) or not jugadores:
        return jsonify({'error': 'jugadores debe ser una lista no vacía'}), 400
    if len(jugadores) > 60:
        return jsonify({'error': 'Máximo 60 jugadores por llamada'}), 400

    # --- Validación contra el ESTADO FINAL (no secuencial) ---
    # Se permite reasignar números en el mismo lote (swaps y renumeración): cada
    # jugador libera su dorsal anterior al pasar a otro. Solo choca si el número
    # pedido queda repetido en el conjunto final del equipo.
    inscritos = {j.id: j.numero_camiseta for j in Jugador.query.filter(
        Jugador.id.in_([d.get('jugador_id') for d in jugadores if d.get('jugador_id')])).all()}
    filas_db = {f.jugador_id: f for f in PartidoAlineacion.query.filter_by(partido_id=partido_id).all()}

    entradas, omitidos = [], []
    for dato in jugadores:
        jugador_id = dato.get('jugador_id')
        if not jugador_id:
            omitidos.append({'jugador_id': jugador_id, 'motivo': 'jugador_id es requerido'})
            continue
        jugador = Jugador.query.get(jugador_id)
        if not jugador:
            omitidos.append({'jugador_id': jugador_id, 'motivo': 'Jugador no encontrado'})
            continue
        numero, err = _normalizar_numero(dato.get('numero_camiseta'))
        if err:
            omitidos.append({'jugador_id': jugador_id, 'nombre': jugador.nombre, 'motivo': err})
            continue
        falla = _error_convocatoria(user, partido, jugador, numero)
        if falla:
            omitidos.append({'jugador_id': jugador_id, 'nombre': jugador.nombre, 'motivo': falla[0]})
            continue
        entradas.append({
            'jugador': jugador, 'numero': numero,
            'explicito': dato.get('numero_camiseta') is not None,
            'titular': bool(dato.get('titular', False)),
            'posicion_tactica': dato.get('posicion_tactica'),
            'posicion_orden': dato.get('posicion_orden'),
        })

    # Dedupe por jugador (gana la última entrada): el lote no debe crear dos filas
    # de alineación para el mismo jugador en el partido.
    unicos = {}
    for e in entradas:
        unicos[e['jugador'].id] = e
    entradas = list(unicos.values())

    en_lote = {e['jugador'].id for e in entradas}

    # Números tomados (no se tocan en este lote) + se liberan los que cambian.
    conjunto = {}
    for jid, f in filas_db.items():
        if jid in en_lote:
            continue
        n = f.numero_camiseta if f.numero_camiseta is not None else inscritos.get(jid)
        if n is not None:
            conjunto.setdefault(f.equipo_id, set()).add(n)

    resueltos = []

    # 1º explícitos: si el número pedido ya está tomado, se omite (no se adivina).
    for e in entradas:
        if not e['explicito'] or e['numero'] is None:
            continue
        s = conjunto.setdefault(e['jugador'].equipo_id, set())
        if e['numero'] in s:
            f = filas_db.get(e['jugador'].id)
            if f is not None:
                onum = f.numero_camiseta if f.numero_camiseta is not None else inscritos.get(f.jugador_id)
                if onum is not None:
                    s.add(onum)
            omitidos.append({'jugador_id': e['jugador'].id, 'nombre': e['jugador'].nombre,
                             'motivo': f'El número {e["numero"]} ya está siendo usado por otro jugador de este equipo'})
            continue
        s.add(e['numero'])
        e['efectivo'] = e['numero']
        resueltos.append(e)

    # 2º implícitos: conserva el número real ya guardado si sigue libre; si no,
    # auto-asigna el dorsal inscrito o el siguiente libre.
    for e in entradas:
        if e['explicito']:
            continue
        s = conjunto.setdefault(e['jugador'].equipo_id, set())
        fprev = filas_db.get(e['jugador'].id)
        prev_custom = fprev.numero_camiseta if fprev is not None else None
        if prev_custom is not None and prev_custom not in s:
            efectivo = prev_custom
        else:
            deseado = e['numero'] if e['numero'] is not None else inscritos.get(e['jugador'].id)
            efectivo = _numero_libre(s, deseado)
        if efectivo is None:
            omitidos.append({'jugador_id': e['jugador'].id, 'nombre': e['jugador'].nombre,
                             'motivo': 'No hay números de camiseta libres para este equipo'})
            continue
        s.add(efectivo)
        e['efectivo'] = efectivo
        resueltos.append(e)

    agregados = []
    for e in resueltos:
        jugador_id = e['jugador'].id
        item = filas_db.get(jugador_id)
        nuevo = item is None
        if nuevo:
            item = PartidoAlineacion(partido_id=partido_id, equipo_id=e['jugador'].equipo_id, jugador_id=jugador_id)
            db.session.add(item)
        item.titular = e['titular']
        inscrito = inscritos.get(jugador_id)
        if not e['explicito'] and e['efectivo'] == inscrito and inscrito is not None:
            item.numero_camiseta = None
        else:
            item.numero_camiseta = e['efectivo']
        if e['posicion_tactica'] is not None:
            item.posicion_tactica = e['posicion_tactica']
        if e['posicion_orden'] is not None:
            item.posicion_orden = e['posicion_orden']
        agregados.append({'jugador_id': jugador_id, 'nombre': e['jugador'].nombre, 'nuevo': nuevo,
                          'titular': item.titular, 'numero_camiseta': item.numero_camiseta})

    db.session.commit()
    return jsonify({'agregados': agregados, 'omitidos': omitidos,
                    'total_agregados': len(agregados), 'total_omitidos': len(omitidos)}), 200


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
    if not ensure_delegado_equipo(user, item.equipo_id):
        return jsonify({'error': 'No autorizado'}), 403
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
    if not ensure_delegado_equipo(user, equipo_id):
        return jsonify({'error': 'No autorizado'}), 403
    posiciones = {'POR', 'DEF', 'MED', 'DEL', 'OTROS'}
    for it in items:
        jugador_id = it.get('jugador_id')
        if not jugador_id:
            return jsonify({'error': 'jugador_id es requerido en cada item'}), 400
        fila = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=jugador_id).first()
        if not fila:
            return jsonify({'error': f'El jugador {jugador_id} no está en la alineación'}), 400
        jj = Jugador.query.get(jugador_id)
        if jj:
            from app.services.finanza_service import FinanzaService
            motivo_bloqueo = FinanzaService.bloqueo_jugador(partido.torneo, jj)
            if motivo_bloqueo:
                return jsonify({'error': f'Jugador bloqueado: {motivo_bloqueo}'}), 400
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
    return jsonify({'partido_id': vivo.partido_id, 'seg': vivo.seg_actual(), 'running': vivo.running, 'iniciado': vivo.iniciado}), 200


@partido_bp.route('/<int:partido_id>/stream')
def stream_en_vivo(partido_id):
    """Server-Sent Events para cronómetro y eventos en tiempo real (público)."""
    from flask import Response, stream_with_context
    import json
    import time

    partido = PartidoService.get_by_id(partido_id)
    if not partido:
        def not_found():
            yield f"data: {json.dumps({'error': 'Partido no encontrado'})}\n\n"
        return Response(not_found(), mimetype='text/event-stream', status=404)

    # Liberar la conexión usada en la verificación inicial: el stream dura
    # indefinidamente y no debe retener una conexión del pool.
    db.session.remove()

    @stream_with_context
    def gen():
        last_seg = -1
        last_event_count = -1
        last_marcador = (-1, -1)
        idle_ticks = 0
        while True:
            try:
                vivo = PartidoEnVivo.query.get(partido_id)
                partido_actual = PartidoService.get_by_id(partido_id)
                eventos = PartidoService.get_eventos(partido_id)
                current_seg = vivo.seg_actual() if vivo else 0
                current_event_count = len(eventos)
                current_marcador = (
                    partido_actual.goles_local if partido_actual else 0,
                    partido_actual.goles_visitante if partido_actual else 0,
                )

                payload = {}
                if current_seg != last_seg:
                    payload['seg'] = current_seg
                    payload['running'] = vivo.running if vivo else False
                    payload['iniciado'] = vivo.iniciado if vivo else False
                    last_seg = current_seg

                if current_event_count != last_event_count:
                    payload['eventos'] = [
                        {
                            'id': e.id,
                            'tipo': e.tipo,
                            'minuto': e.minuto,
                            'jugador_id': e.jugador_id,
                            'jugador_sale_id': e.jugador_sale_id,
                            'equipo_id': e.equipo_id,
                            'descripcion': e.descripcion,
                            'tipo_sancionado': e.tipo_sancionado,
                            'nombre_sancionado': e.nombre_sancionado,
                        }
                        for e in eventos
                    ]
                    last_event_count = current_event_count

                if current_marcador != last_marcador:
                    payload['marcador'] = {'local': current_marcador[0], 'visitante': current_marcador[1]}
                    last_marcador = current_marcador

                if payload:
                    payload['ts'] = time.time()
                    yield f"data: {json.dumps(payload)}\n\n"
                    idle_ticks = 0
                else:
                    # Sin cambios: enviar un comentario SSE cada ~15s para que
                    # nginx (proxy_read_timeout) no corte la conexión y el
                    # EventSource no tenga que reconectarse cada 60s.
                    idle_ticks += 1
                    if idle_ticks >= 15:
                        yield ": keepalive\n\n"
                        idle_ticks = 0

            except GeneratorExit:
                break
            except Exception:
                # Silenciar errores transitorios, seguir stream
                pass
            finally:
                # Devolver la conexión al pool entre iteraciones.
                db.session.remove()
            time.sleep(1)

    return Response(gen(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'Connection': 'keep-alive'})


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