"""Reglas configurables por torneo (capa de reglamento).

Cada torneo guarda un JSON `reglas`; este módulo define el schema,
los valores por defecto y utilidades de edad.
"""
from datetime import date

from marshmallow import ValidationError, fields, validate, post_load

from app.extensions import ma

CRITERIOS_DESEMPATE = ['DIF_GOL', 'GOLES_FAVOR', 'MENOS_AMARILLAS', 'MENOS_ROJAS', 'GOLES_CONTRA']
DEFAULT_DESEMPATES = ['DIF_GOL', 'GOLES_FAVOR', 'MENOS_AMARILLAS', 'MENOS_ROJAS', 'GOLES_CONTRA']


class ReglasSchema(ma.Schema):
    class Meta:
        unknown = 'exclude'  # tolera claves viejas guardadas en el JSON

    formato_tipo = fields.String(load_default='ROUND_ROBIN',
                                 validate=validate.OneOf(['ROUND_ROBIN', 'ELIMINATORIA']))
    rondas = fields.Int(load_default=1, validate=validate.OneOf([1, 2]))
    clasifican_a_final = fields.Int(allow_none=True, load_default=None,
                                    validate=validate.Range(min=2, max=4))
    desempates = fields.List(
        fields.String(validate=validate.OneOf(CRITERIOS_DESEMPATE)),
        load_default=lambda: list(DEFAULT_DESEMPATES),
    )
    edad_min = fields.Int(allow_none=True, load_default=None, validate=validate.Range(min=10))
    edad_max = fields.Int(allow_none=True, load_default=None, validate=validate.Range(min=10))
    max_jugadores = fields.Int(allow_none=True, load_default=None, validate=validate.Range(min=1))
    bloquear_baja_tras_jugar = fields.Bool(load_default=False)
    comodines_cantidad = fields.Int(load_default=0, validate=validate.Range(min=0, max=5))
    comodines_edad_min = fields.Int(allow_none=True, load_default=30,
                                    validate=validate.Range(min=10))
    tolerancia_w_min = fields.Int(load_default=10, validate=validate.Range(min=0, max=60))
    marcador_w = fields.Int(load_default=3, validate=validate.Range(min=1, max=9))
    fechas_doble_amarilla = fields.Int(load_default=1, validate=validate.Range(min=0, max=10))
    fechas_roja_directa = fields.Int(load_default=2, validate=validate.Range(min=0, max=10))

    @post_load
    def _validar(self, data, **kwargs):
        ds = data.get('desempates') or []
        if len(ds) != len(set(ds)):
            raise ValidationError({'desempates': ['No se permiten criterios duplicados']})
        emin, emax = data.get('edad_min'), data.get('edad_max')
        if emin is not None and emax is not None and emin > emax:
            raise ValidationError({'edad_min': ['edad_min no puede ser mayor que edad_max']})
        return data


def reglas_default():
    """Reglas por defecto (reglamento genérico)."""
    return ReglasSchema().load({})


def reglas_normalizadas(torneo):
    """Reglas guardadas del torneo mezcladas con defaults (tolera faltantes/None)."""
    saved = dict(torneo.reglas or {})
    saved = {k: v for k, v in saved.items() if v is not None}
    return ReglasSchema().load(saved)


def edad_desde(fecha):
    """Edad en años desde date o string 'YYYY-MM-DD'. None si no parsea."""
    if fecha is None:
        return None
    if isinstance(fecha, str):
        try:
            fecha = date.fromisoformat(fecha[:10])
        except ValueError:
            return None
    hoy = date.today()
    return hoy.year - fecha.year - ((hoy.month, hoy.day) < (fecha.month, fecha.day))