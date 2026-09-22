from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.pago import Pago
from app.models.torneo import Torneo
from app.routes._authz import get_current_user, ensure_torneo_organizador, ensure_management_role
from app.services.finanza_service import FinanzaService

finanza_bp = Blueprint('finanza', __name__)


def _torneo_autorizado(user, torneo_id):
    torneo = Torneo.query.get(torneo_id)
    if not torneo:
        return None, None, ('Torneo no encontrado', 404)
    if not ensure_torneo_organizador(user, torneo) or not ensure_management_role(user):
        return torneo, None, ('No autorizado', 403)
    return torneo, None, None


@finanza_bp.route('/torneos/<int:torneo_id>/finanzas', methods=['GET'])
@jwt_required()
def get_finanzas(torneo_id):
    user = get_current_user()
    torneo, _, err = _torneo_autorizado(user, torneo_id)
    if err:
        return jsonify({'error': err[0]}), err[1]
    return jsonify(FinanzaService.reporte(torneo)), 200


@finanza_bp.route('/torneos/<int:torneo_id>/pagos', methods=['GET'])
@jwt_required()
def get_pagos(torneo_id):
    user = get_current_user()
    torneo, _, err = _torneo_autorizado(user, torneo_id)
    if err:
        return jsonify({'error': err[0]}), err[1]
    return jsonify(FinanzaService.listar_pagos(torneo.id)), 200


@finanza_bp.route('/torneos/<int:torneo_id>/pagos', methods=['POST'])
@jwt_required()
def registrar_pago(torneo_id):
    user = get_current_user()
    torneo, _, err = _torneo_autorizado(user, torneo_id)
    if err:
        return jsonify({'error': err[0]}), err[1]
    data = request.get_json() or {}
    pago, error = FinanzaService.registrar(
        torneo,
        concepto=data.get('concepto'),
        monto=data.get('monto'),
        jugador_id=data.get('jugador_id'),
        equipo_id=data.get('equipo_id'),
        nota=data.get('nota'),
        user=user,
    )
    if error:
        return jsonify({'error': error}), 400
    return jsonify({
        'message': 'Pago registrado',
        'pago': {
            'id': pago.id,
            'equipo_id': pago.equipo_id,
            'equipo': pago.equipo.nombre if pago.equipo else None,
            'jugador_id': pago.jugador_id,
            'jugador': pago.jugador.nombre if pago.jugador else None,
            'concepto': pago.concepto,
            'monto': float(pago.monto),
            'nota': pago.nota,
        },
    }), 201


@finanza_bp.route('/pagos/<int:pago_id>', methods=['DELETE'])
@jwt_required()
def eliminar_pago(pago_id):
    user = get_current_user()
    pago = Pago.query.get(pago_id)
    if not pago:
        return jsonify({'error': 'Pago no encontrado'}), 404
    torneo = pago.torneo
    if not ensure_torneo_organizador(user, torneo) or not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    db.session.delete(pago)
    db.session.commit()
    return jsonify({'message': 'Pago eliminado'}), 200