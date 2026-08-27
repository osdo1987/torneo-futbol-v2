# Schemas Marshmallow

from app.schemas.user_schema import UserSchema, LoginSchema
from app.schemas.organizador_schema import OrganizadorSchema
from app.schemas.torneo_schema import TorneoSchema
from app.schemas.fase_schema import FaseSchema
from app.schemas.equipo_schema import EquipoSchema
from app.schemas.jugador_schema import JugadorSchema
from app.schemas.partido_schema import PartidoSchema
from app.schemas.evento_schema import EventoSchema

__all__ = [
    'UserSchema',
    'LoginSchema',
    'OrganizadorSchema',
    'TorneoSchema',
    'FaseSchema',
    'EquipoSchema',
    'JugadorSchema',
    'PartidoSchema',
    'EventoSchema',
]