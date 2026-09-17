from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.fase import Fase
from app.models.torneo import Torneo
from app.schemas.fase_schema import FaseSchema
from app.routes._authz import get_current_user, ensure_torneo_organizador, ensure_management_role

fase_bp = Blueprint('fases', __name__)
fase_schema = FaseSchema()


@fase_bp.route('', methods=['GET'])
@jwt_required()
def get_fases():
    user = get_current_user()
    torneo_id = request.args.get('torneo_id', type=int)
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = Torneo.query.get(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    fases = Fase.query.filter_by(torneo_id=torneo_id).order_by(Fase.orden).all()
    return jsonify(fase_schema.dump(fases, many=True)), 200


@fase_bp.route('', methods=['POST'])
@jwt_required()
def create_fase():
    user = get_current_user()
    data = request.get_json() or {}
    torneo_id = data.get('torneo_id')
    if not torneo_id:
        return jsonify({'error': 'torneo_id es requerido'}), 400
    torneo = Torneo.query.get(torneo_id)
    if not torneo:
        return jsonify({'error': 'Torneo no encontrado'}), 404
    if not ensure_torneo_organizador(user, torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    try:
        fase = fase_schema.load(data)
        db.session.add(fase)
        db.session.commit()
        return jsonify(fase_schema.dump(fase)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@fase_bp.route('/<int:fase_id>', methods=['PUT'])
@jwt_required()
def update_fase(fase_id):
    user = get_current_user()
    fase = Fase.query.get(fase_id)
    if not fase:
        return jsonify({'error': 'Fase no encontrada'}), 404
    if not ensure_torneo_organizador(user, fase.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    for key, value in data.items():
        if key in ('id', 'torneo_id', 'partidos'):
            continue
        setattr(fase, key, value)
    db.session.commit()
    return jsonify(fase_schema.dump(fase)), 200


@fase_bp.route('/<int:fase_id>', methods=['DELETE'])
@jwt_required()
def delete_fase(fase_id):
    user = get_current_user()
    fase = Fase.query.get(fase_id)
    if not fase:
        return jsonify({'error': 'Fase no encontrada'}), 404
    if not ensure_torneo_organizador(user, fase.torneo):
        return jsonify({'error': 'No autorizado'}), 403
    if not ensure_management_role(user):
        return jsonify({'error': 'No autorizado'}), 403
    db.session.delete(fase)
    db.session.commit()
    return jsonify({'message': 'Fase eliminada'}), 200