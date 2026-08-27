from marshmallow import fields, validate
from app.extensions import ma
from app.models.equipo import Equipo


class EquipoSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Equipo
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    torneo_id = fields.Int(required=True)
    nombre = fields.String(required=True, validate=validate.Length(min=1, max=200))
    delegado_email = fields.String(allow_none=True, validate=validate.Length(max=120))
    delegado_documento = fields.String(allow_none=True, validate=validate.Length(max=50))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)