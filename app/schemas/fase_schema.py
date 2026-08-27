from marshmallow import fields, validate
from app.extensions import ma
from app.models.fase import Fase, TIPO_FASE


class FaseSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Fase
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    torneo_id = fields.Int(required=True)
    nombre = fields.String(required=True, validate=validate.Length(min=1, max=200))
    orden = fields.Int(load_default=1)
    tipo = fields.String(load_default='ROUND_ROBIN', validate=validate.OneOf(TIPO_FASE))
    completada = fields.Bool(load_default=False)