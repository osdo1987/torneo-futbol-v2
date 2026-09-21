from marshmallow import fields, validate
from app.extensions import ma
from app.models.locacion import Locacion


class LocacionSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Locacion
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    organizador_id = fields.Int(required=True)
    nombre = fields.String(required=True, validate=validate.Length(min=1, max=200))
    direccion = fields.String(allow_none=True)
    activa = fields.Bool(load_default=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
