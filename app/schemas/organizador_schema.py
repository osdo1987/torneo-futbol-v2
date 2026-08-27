from marshmallow import fields, validate
from app.extensions import ma
from app.models.organizador import Organizador


class OrganizadorSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Organizador
        load_instance = True

    id = fields.Int(dump_only=True)
    slug = fields.String(required=True, validate=validate.Length(min=3, max=100))
    name = fields.String(required=True, validate=validate.Length(min=1, max=200))
    whatsapp = fields.String(allow_none=True, validate=validate.Length(max=20))
    address = fields.String(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)