from marshmallow import fields, validate
from app.extensions import ma
from app.models.partido import Partido, RESULTADO_PARTIDO
from app.schemas.locacion_schema import LocacionSchema


class PartidoSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Partido
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    torneo_id = fields.Int(required=True)
    fase_id = fields.Int(allow_none=True)
    equipo_local_id = fields.Int(required=True)
    equipo_visitante_id = fields.Int(required=True)
    jornada = fields.Int(load_default=1)
    fecha_programada = fields.DateTime(allow_none=True)
    locacion_id = fields.Int(allow_none=True)
    locacion = fields.Nested(LocacionSchema, dump_only=True)
    goles_local = fields.Int(load_default=0)
    goles_visitante = fields.Int(load_default=0)
    resultado = fields.String(dump_only=True, validate=validate.OneOf(RESULTADO_PARTIDO))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
