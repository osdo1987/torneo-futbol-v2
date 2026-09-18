from marshmallow import fields, validate
from app.extensions import ma
from app.models.user import User


class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True
        exclude = ('password_hash', 'reset_token', 'reset_token_expiry')

    id = fields.Int(dump_only=True)
    email = fields.Email(required=True, validate=validate.Email())
    role = fields.String(required=True, validate=validate.OneOf(['SUPERADMIN', 'ORGANIZADOR', 'ADMIN', 'STAFF', 'REFEREE', 'DELEGADO']))
    organizador_id = fields.Int(allow_none=True)
    equipo_id = fields.Int(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class LoginSchema(ma.Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))