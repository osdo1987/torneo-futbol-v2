from marshmallow import ValidationError
from app.extensions import db
from app.models.jugador import Jugador
from app.schemas.jugador_schema import JugadorSchema


class JugadorService:
    @staticmethod
    def get_all(equipo_id=None):
        q = Jugador.query
        if equipo_id:
            q = q.filter_by(equipo_id=equipo_id)
        return q.order_by(Jugador.nombre).all()

    @staticmethod
    def get_by_id(jugador_id):
        return Jugador.query.get(jugador_id)

    @staticmethod
    def create(data):
        try:
            jugador = JugadorSchema().load(data)
            db.session.add(jugador)
            db.session.commit()
            return jugador, None
        except ValidationError as e:
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update(jugador, data):
        try:
            for key, value in data.items():
                if key in ('id', 'equipo_id', 'created_at', 'updated_at', 'activo'):
                    continue
                setattr(jugador, key, value)
            db.session.commit()
            return jugador, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def importar_masivo(equipo, lista):
        """Crea jugadores en lote para un equipo respetando cupo, edad/categoría,
        comodines y duplicados por documento. Devuelve {'creados', 'errores', 'total'}."""
        from app.services.reglas import edad_desde, reglas_normalizadas
        torneo = equipo.torneo
        reglas = reglas_normalizadas(torneo)
        maxj = reglas.get('max_jugadores') or torneo.max_jugadores_por_equipo
        emin, emax = reglas.get('edad_min'), reglas.get('edad_max')
        comp = reglas.get('comodines_cantidad') or 0
        cmin = reglas.get('comodines_edad_min')

        def cumple_cat(e):
            return (emin is None or e >= emin) and (emax is None or e <= emax)

        activos = Jugador.query.filter_by(equipo_id=equipo.id, activo=True).all()
        cupo_usado = len(activos)
        comodines_usados = 0
        if emin is not None or emax is not None:
            for j in activos:
                ej = edad_desde(j.fecha_nacimiento)
                if ej is not None and not cumple_cat(ej):
                    comodines_usados += 1

        creados = 0
        errores = []
        try:
            for raw in lista:
                fila = raw.get('_fila') or 1
                data = {k: v for k, v in raw.items() if k != '_fila'}
                if cupo_usado >= maxj:
                    errores.append({'fila': fila, 'error': f'Cupo de jugadores alcanzado (máximo {maxj})'})
                    continue

                doc = (data.get('documento_identidad') or '').strip()
                if doc:
                    existente = Jugador.query.filter_by(
                        equipo_id=equipo.id, documento_identidad=doc, activo=True).first()
                    if existente:
                        errores.append({'fila': fila, 'error': f'El documento {doc} ya pertenece a {existente.nombre}'})
                        continue

                try:
                    jugador = JugadorSchema().load({**data, 'equipo_id': equipo.id})
                except ValidationError as exc:
                    msgs = []
                    for k, v in exc.messages.items():
                        msgs.append(f'{k}: {" ".join(map(str, v)) if isinstance(v, list) else v}')
                    errores.append({'fila': fila, 'error': '; '.join(msgs)})
                    continue

                if emin is not None or emax is not None:
                    edad = edad_desde(data.get('fecha_nacimiento'))
                    if edad is None:
                        errores.append({'fila': fila, 'error': 'Se requiere fecha de nacimiento (categoría con límite de edad)'})
                        continue
                    if not cumple_cat(edad):
                        if not (comp > 0 and cmin is not None and edad > cmin):
                            errores.append({'fila': fila, 'error': f'Edad no permitida en esta categoría ({edad} años)'})
                            continue
                        if comodines_usados >= comp:
                            errores.append({'fila': fila, 'error': f'Cupo de comodines agotado (máximo {comp})'})
                            continue
                        comodines_usados += 1

                db.session.add(jugador)
                cupo_usado += 1
                creados += 1
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return {'creados': 0, 'errores': [{'fila': 0, 'error': f'Error inesperado: {e}'}], 'total': len(lista)}
        return {'creados': creados, 'errores': errores, 'total': len(lista)}

    @staticmethod
    def liberar(jugador):
        """Libera a un jugador (equivalente a set activo = False en el dominio original)."""
        jugador.activo = False
        db.session.commit()
        return jugador, None

    @staticmethod
    def delete(jugador):
        db.session.delete(jugador)
        db.session.commit()
        return True