from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.evento_partido import EventoPartido
from app.models.partido import Partido
from app.models.jugador import Jugador
from app.models.partido_alineacion import PartidoAlineacion
from app.schemas.evento_schema import EventoSchema
from app.routes._authz import get_current_user, ensure_torneo_organizador, ensure_planilla_role, ensure_delegado_equipo

evento_bp = Blueprint('eventos', __name__)
evento_schema = EventoSchema()


def _puede_ser_convocado(user, partido, jugador):
    """Un jugador que todavía no está en la lineup igual tiene que pasar los controles
    de convocatoria (equipo del partido, activo, sin bloqueo por finanzas). Los mismos
    que aplica partido_routes._error_convocatoria, que no se puede importar acá por
    evitar una dependencia circular entre blueprints."""
    if not ensure_delegado_equipo(user, jugador.equipo_id):
        return False
    if jugador.equipo_id not in (partido.equipo_local_id, partido.equipo_visitante_id):
        return False
    if not jugador.activo:
        return False
    from app.services.finanza_service import FinanzaService
    return not FinanzaService.bloqueo_jugador(partido.torneo, jugador)


@evento_bp.route('', methods=['GET'])
@jwt_required()
def get_eventos():
    user = get_current_user()
    partido_id = request.args.get('partido_id', type=int)
    if not partido_id:
        return jsonify({'error': 'partido_id es requerido'}), 400
    partido = Partido.query.get(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    eventos = EventoPartido.query.filter_by(partido_id=partido_id).order_by(EventoPartido.minuto).all()
    return jsonify(evento_schema.dump(eventos, many=True)), 200


@evento_bp.route('', methods=['POST'])
@jwt_required()
def create_evento():
    user = get_current_user()
    data = request.get_json() or {}
    partido_id = data.get('partido_id')
    if not partido_id:
        return jsonify({'error': 'partido_id es requerido'}), 400
    partido = Partido.query.get(partido_id)
    if not partido:
        return jsonify({'error': 'Partido no encontrado'}), 404
    if not ensure_torneo_organizador(user, partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_planilla_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    if partido.resultado != 'PENDIENTE':
        return jsonify({'error': 'No se pueden registrar eventos de un partido finalizado'}), 400

    # Si viene jugador_id, inferir equipo_id del jugador.
    if not data.get('equipo_id') and data.get('jugador_id'):
        jugador = Jugador.query.get(data['jugador_id'])
        if jugador:
            data['equipo_id'] = jugador.equipo_id

    # Tarjetas a técnicos: sin jugador_id, requieren equipo + nombre del sancionado.
    tipo_sancionado = str(data.get('tipo_sancionado') or 'JUGADOR').upper()
    if tipo_sancionado not in ('JUGADOR', 'TECNICO'):
        return jsonify({'error': 'tipo_sancionado inválido (JUGADOR o TECNICO)'}), 400
    if tipo_sancionado == 'TECNICO':
        if data.get('tipo') not in ('TARJETA_AMARILLA', 'TARJETA_ROJA'):
            return jsonify({'error': 'Un técnico solo puede recibir tarjeta amarilla o roja'}), 400
        if not data.get('equipo_id'):
            return jsonify({'error': 'equipo_id es requerido para sancionar a un técnico'}), 400
        if not (data.get('nombre_sancionado') or '').strip():
            return jsonify({'error': 'nombre_sancionado es requerido para sancionar a un técnico'}), 400
        if int(data['equipo_id']) not in (partido.equipo_local_id, partido.equipo_visitante_id):
            return jsonify({'error': 'El equipo no participa en este partido'}), 400
        data['jugador_id'] = None
        data['jugador_sale_id'] = None
    else:
        data['tipo_sancionado'] = 'JUGADOR'
        data['nombre_sancionado'] = None
        if data.get('tipo') in ('TARJETA_AMARILLA', 'TARJETA_ROJA') and not data.get('jugador_id'):
            return jsonify({'error': 'Tarjeta inválida: indica jugador_id o tipo_sancionado=TECNICO'}), 400
        if data.get('jugador_id') and not data.get('equipo_id'):
            return jsonify({'error': 'No se pudo determinar el equipo del jugador'}), 400

    if data.get('tipo') == 'CAMBIO':
        if not data.get('jugador_id') or not data.get('jugador_sale_id'):
            return jsonify({'error': 'Un cambio requiere jugador_id (entra) y jugador_sale_id (sale)'}), 400
        entra = Jugador.query.get(data['jugador_id'])
        sale = Jugador.query.get(data['jugador_sale_id'])
        if not entra or not sale:
            return jsonify({'error': 'Jugador no encontrado'}), 400
        if entra.equipo_id != sale.equipo_id:
            return jsonify({'error': 'El jugador que sale y el que entra deben pertenecer al mismo equipo'}), 400
        if entra.equipo_id not in (partido.equipo_local_id, partido.equipo_visitante_id):
            return jsonify({'error': 'El equipo no participa en este partido'}), 400
        if entra.id == sale.id:
            return jsonify({'error': 'El jugador que sale y el que entra deben ser distintos'}), 400
        data['equipo_id'] = entra.equipo_id

        # Un cambio también mueve la alineación: el que sale deja de ser titular y el
        # que entra toma su lugar. Sin esto, partido_alineaciones queda con el XI
        # inicial y el acta oficial (que lee titular) imprime el XI errado. Va en la
        # misma transacción que el evento, así que no queda a medias.
        #
        # El número NO se hereda: cada jugador conserva el suyo (el de la camiseta
        # con la que sale a la cancha, que es el inscrito o el que se le haya
        # asignado en este partido). Por eso hay que validar que no choque con el
        # de otro titular que sigue en cancha, igual que en upsert_alineacion.
        if not PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=entra.id).first() \
                and not _puede_ser_convocado(user, partido, entra):
            return jsonify({'error': 'El jugador que entra no puede ser convocado a este partido'}), 400

        numero_entra = entra.numero_camiseta
        otros = PartidoAlineacion.query.filter(
            PartidoAlineacion.partido_id == partido_id,
            PartidoAlineacion.equipo_id == entra.equipo_id,
            PartidoAlineacion.jugador_id != entra.id,
        ).all()
        if numero_entra is not None:
            otros_ids = [o.jugador_id for o in otros]
            inscritos = {i.id: i.numero_camiseta for i in Jugador.query.filter(Jugador.id.in_(otros_ids)).all()}
            for o in otros:
                onum = o.numero_camiseta if o.numero_camiseta is not None else inscritos.get(o.jugador_id)
                if onum == numero_entra:
                    return jsonify({'error': f'El número {numero_entra} ya está siendo usado por otro '
                                             f'convocado de este equipo. Asignale otro número antes del cambio.'}), 409

        sale_item = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=sale.id).first()
        if sale_item:
            sale_item.titular = False
        entra_item = PartidoAlineacion.query.filter_by(partido_id=partido_id, jugador_id=entra.id).first()
        if entra_item is None:
            entra_item = PartidoAlineacion(partido_id=partido_id, equipo_id=entra.equipo_id, jugador_id=entra.id)
            db.session.add(entra_item)
        entra_item.titular = True
        if sale_item is not None:
            # La posición en la cancha sí se hereda: el que entra ocupa el lugar
            # de quien sale, que es lo que espera el resto de la UI.
            entra_item.posicion_tactica = sale_item.posicion_tactica
            entra_item.posicion_orden = sale_item.posicion_orden
    elif data.get('jugador_sale_id'):
        return jsonify({'error': 'jugador_sale_id solo aplica a cambios'}), 400

    try:
        evento = evento_schema.load(data)
        db.session.add(evento)
        db.session.commit()
        return jsonify(evento_schema.dump(evento)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@evento_bp.route('/<int:evento_id>', methods=['DELETE'])
@jwt_required()
def delete_evento(evento_id):
    user = get_current_user()
    evento = EventoPartido.query.get(evento_id)
    if not evento:
        return jsonify({'error': 'Evento no encontrado'}), 404
    if not ensure_torneo_organizador(user, evento.partido.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_planilla_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    db.session.delete(evento)
    db.session.commit()
    return jsonify({'message': 'Evento eliminado'}), 200