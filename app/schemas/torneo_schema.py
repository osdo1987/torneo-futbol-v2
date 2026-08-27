from marshmallow import fields, validate
from app.extensions import ma
from app.models.torneo import Torneo, VALID_TORNEO_STATES


class TorneoSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Torneo
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    organizador_id = fields.Int(required=True)
    nombre = fields.String(required=True, validate=validate.Length(min=1, max=200))
    estado = fields.String(dump_only=True, validate=validate.OneOf(VALID_TORNEO_STATES))
    max_jugadores_por_equipo = fields.Int(load_default=18)
    puntos_victoria = fields.Int(load_default=3)
    puntos_empate = fields.Int(load_default=1)
    puntos_derrota = fields.Int(load_default=0)
    inscripciones_jugadores_abiertas = fields.Bool(load_default=False)
    reglas = fields.Raw(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)