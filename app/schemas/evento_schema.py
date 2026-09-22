from marshmallow import fields, validate
from app.extensions import ma
from app.models.evento_partido import EventoPartido, TIPO_EVENTO_PARTIDO


class EventoSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = EventoPartido
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    partido_id = fields.Int(required=True)
    jugador_id = fields.Int(allow_none=True)
    jugador_sale_id = fields.Int(allow_none=True)
    equipo_id = fields.Int(allow_none=True)
    tipo_sancionado = fields.String(load_default='JUGADOR', validate=validate.OneOf(['JUGADOR', 'TECNICO']))
    nombre_sancionado = fields.String(allow_none=True, validate=validate.Length(max=120))
    tipo = fields.String(required=True, validate=validate.OneOf(TIPO_EVENTO_PARTIDO))
    minuto = fields.Int(load_default=0)
    descripcion = fields.String(allow_none=True)
    created_at = fields.DateTime(dump_only=True)