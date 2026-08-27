from marshmallow import fields, validate
from app.extensions import ma
from app.models.jugador import Jugador


class JugadorSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Jugador
        load_instance = True
        include_fk = True

    id = fields.Int(dump_only=True)
    equipo_id = fields.Int(required=True)
    nombre = fields.String(required=True, validate=validate.Length(min=1, max=200))
    numero_camiseta = fields.Int(load_default=0)
    documento_identidad = fields.String(allow_none=True, validate=validate.Length(max=50))
    activo = fields.Bool(load_default=True)

    # Datos deportivos
    POSICIONES = ['ARQUERO', 'DEFENSOR', 'MEDIOCAMPISTA', 'DELANTERO']
    PIERNAS = ['DERECHA', 'IZQUIERDA', 'AMBIDESTRO']

    posicion = fields.String(allow_none=True, validate=validate.OneOf(POSICIONES))
    fecha_nacimiento = fields.Date(allow_none=True)
    telefono = fields.String(allow_none=True, validate=validate.Length(max=30))
    pierna_habil = fields.String(allow_none=True, validate=validate.OneOf(PIERNAS))
    altura_cm = fields.Int(allow_none=True, validate=validate.Range(min=100, max=250))

    atributos = fields.Raw(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)