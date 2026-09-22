from datetime import date

from sqlalchemy import or_

from app.models.partido import Partido
from app.models.equipo import Equipo
from app.models.evento_partido import EventoPartido
from app.models.jugador import Jugador
from app.models.torneo import Torneo
from app.services.reglas import reglas_normalizadas

# Resultados que cuentan como partido jugado
RESULTADOS_JUGADOS = ['LOCAL_GANO', 'VISITANTE_GANO', 'EMPATE', 'W_LOCAL', 'W_VISITANTE']


class EstadisticaService:
    """Cálculo on-the-fly de tabla de posiciones, goleadores y estadísticas."""

    # Claves de ordenamiento por criterio de desempate (de mayor a menor valor deseado)
    CRITERIOS = {
        'DIF_GOL': lambda r: -r['DF'],
        'GOLES_FAVOR': lambda r: -r['GF'],
        'MENOS_AMARILLAS': lambda r: r['TA'],
        'MENOS_ROJAS': lambda r: r['TR'],
        'GOLES_CONTRA': lambda r: r['GC'],
    }

    @staticmethod
    def tabla_posiciones(torneo_id):
        torneo = Torneo.query.get(torneo_id)
        reglas = reglas_normalizadas(torneo) if torneo else {}

        equipos = Equipo.query.filter_by(torneo_id=torneo_id).all()
        partidos = Partido.query.filter(
            Partido.torneo_id == torneo_id,
            Partido.resultado.in_(RESULTADOS_JUGADOS)
        ).all()

        stats = {e.id: {
            'equipo_id': e.id,
            'equipo': e.nombre,
            'PJ': 0, 'PG': 0, 'PE': 0, 'PP': 0,
            'GF': 0, 'GC': 0, 'DF': 0, 'PTS': 0,
            'TA': 0, 'TR': 0,
        } for e in equipos}

        # Puntos configurables del torneo (con defaults del modelo)
        pv = getattr(torneo, 'puntos_victoria', 3) if torneo else 3
        pe = getattr(torneo, 'puntos_empate', 1) if torneo else 1
        pd = getattr(torneo, 'puntos_derrota', 0) if torneo else 0

        for p in partidos:
            local = stats[p.equipo_local_id]
            visitante = stats[p.equipo_visitante_id]
            gl, gv = p.goles_local, p.goles_visitante

            local['PJ'] += 1
            visitante['PJ'] += 1
            local['GF'] += gl
            local['GC'] += gv
            visitante['GF'] += gv
            visitante['GC'] += gl

            gano_local = p.resultado in ('LOCAL_GANO', 'W_LOCAL')
            gano_visit = p.resultado in ('VISITANTE_GANO', 'W_VISITANTE')
            if gano_local:
                local['PG'] += 1
                visitante['PP'] += 1
                local['PTS'] += pv
                visitante['PTS'] += pd
            elif gano_visit:
                visitante['PG'] += 1
                local['PP'] += 1
                visitante['PTS'] += pv
                local['PTS'] += pd
            else:
                local['PE'] += 1
                visitante['PE'] += 1
                local['PTS'] += pe
                visitante['PTS'] += pe

        # Tarjetas por equipo (fair play)
        eventos = (EventoPartido.query
                   .join(Partido, EventoPartido.partido_id == Partido.id)
                   .filter(Partido.torneo_id == torneo_id,
                           EventoPartido.tipo.in_(['TARJETA_AMARILLA', 'TARJETA_ROJA']))
                   .all())
        for ev in eventos:
            equipo_id = ev.equipo_id
            if not equipo_id and ev.jugador_id:
                jugador = Jugador.query.get(ev.jugador_id)
                equipo_id = jugador.equipo_id if jugador else None
            if equipo_id in stats:
                if ev.tipo == 'TARJETA_AMARILLA':
                    stats[equipo_id]['TA'] += 1
                else:
                    stats[equipo_id]['TR'] += 1

        filas = list(stats.values())
        for f in filas:
            f['DF'] = f['GF'] - f['GC']

        # Orden: puntos, luego criterios de desempate configurables
        orden = (reglas.get('desempates') if isinstance(reglas, dict) else None) or []
        funcs = [EstadisticaService.CRITERIOS[c] for c in orden if c in EstadisticaService.CRITERIOS]
        filas.sort(key=lambda r: (-r['PTS'], *[f(r) for f in funcs], r['equipo']))
        n_final = reglas.get('clasifican_a_final') if isinstance(reglas, dict) else None
        for i, f in enumerate(filas, start=1):
            f['pos'] = i
            f['clasifica'] = bool(n_final) and i <= n_final
        return filas

    @staticmethod
    def sanciones(torneo_id):
        """Sanciones acumuladas por jugador según el reglamento.

        - Cada 2 amarillas acumuladas -> sanción de reglas.fechas_doble_amarilla fechas
        - Roja directa -> sanción de reglas.fechas_roja_directa fechas
        - Cada fecha se cumple con una jornada jugada por su equipo posterior
          a la tarjeta que generó la sanción (bloqueo hasta jornada N).
        """
        torneo = Torneo.query.get(torneo_id)
        reglas = reglas_normalizadas(torneo) if torneo else {}
        f_doble = int(reglas.get('fechas_doble_amarilla') or 0)
        f_roja = int(reglas.get('fechas_roja_directa') or 0)

        eventos = (EventoPartido.query
                   .join(Partido, EventoPartido.partido_id == Partido.id)
                   .filter(Partido.torneo_id == torneo_id,
                           EventoPartido.tipo.in_(['TARJETA_AMARILLA', 'TARJETA_ROJA']),
                           or_(EventoPartido.jugador_id.isnot(None),
                               EventoPartido.tipo_sancionado == 'TECNICO'))
                   .all())

        por_jugador = {}
        for ev in eventos:
            por_jugador.setdefault(ev.jugador_id, []).append(ev)

        filas = []
        for jugador_id, evs in por_jugador.items():
            j = Jugador.query.get(jugador_id)
            if not j:
                continue
            evs = sorted(evs, key=lambda e: (e.partido.jornada or 0, e.id))
            amarillas = sum(1 for e in evs if e.tipo == 'TARJETA_AMARILLA')
            rojas = sum(1 for e in evs if e.tipo == 'TARJETA_ROJA')

            bloqueado_hasta = 0
            acumuladas = 0
            for e in evs:
                jr = e.partido.jornada or 0
                if e.tipo == 'TARJETA_ROJA':
                    if f_roja > 0:
                        bloqueado_hasta = max(bloqueado_hasta, jr + f_roja)
                else:
                    acumuladas += 1
                    if f_doble > 0 and acumuladas % 2 == 0:
                        bloqueado_hasta = max(bloqueado_hasta, jr + f_doble)

            prox = (Partido.query
                    .filter(Partido.torneo_id == torneo_id,
                            Partido.resultado == 'PENDIENTE',
                            or_(Partido.equipo_local_id == j.equipo_id,
                                Partido.equipo_visitante_id == j.equipo_id))
                    .order_by(Partido.jornada)
                    .first())
            prox_jornada = prox.jornada if prox else None
            suspendido = bool(prox_jornada is not None and bloqueado_hasta >= prox_jornada)

            filas.append({
                'jugador_id': j.id,
                'jugador': j.nombre,
                'equipo_id': j.equipo_id,
                'equipo': j.equipo.nombre if j.equipo else 'Sin equipo',
                'amarillas': amarillas,
                'rojas': rojas,
                'suspendido_hasta_jornada': bloqueado_hasta or None,
                'suspendido': suspendido,
            })

        # Técnicos amonestados/expulsados (eventos sin jugador_id, tipo_sancionado=TECNICO)
        tecnicos = {}
        for ev in eventos:
            if ev.tipo_sancionado != 'TECNICO' or not ev.nombre_sancionado or not ev.equipo_id:
                continue
            tecnicos.setdefault((ev.equipo_id, ev.nombre_sancionado), []).append(ev)

        for (eq_id, nombre_tecnico), evs in tecnicos.items():
            equipo = Equipo.query.get(eq_id)
            if not equipo:
                continue
            evs = sorted(evs, key=lambda e: (e.partido.jornada or 0, e.id))
            amarillas = sum(1 for e in evs if e.tipo == 'TARJETA_AMARILLA')
            rojas = sum(1 for e in evs if e.tipo == 'TARJETA_ROJA')

            bloqueado_hasta = 0
            acumuladas = 0
            for e in evs:
                jr = e.partido.jornada or 0
                if e.tipo == 'TARJETA_ROJA':
                    if f_roja > 0:
                        bloqueado_hasta = max(bloqueado_hasta, jr + f_roja)
                else:
                    acumuladas += 1
                    if f_doble > 0 and acumuladas % 2 == 0:
                        bloqueado_hasta = max(bloqueado_hasta, jr + f_doble)

            prox = (Partido.query
                    .filter(Partido.torneo_id == torneo_id,
                            Partido.resultado == 'PENDIENTE',
                            or_(Partido.equipo_local_id == eq_id,
                                Partido.equipo_visitante_id == eq_id))
                    .order_by(Partido.jornada)
                    .first())
            prox_jornada = prox.jornada if prox else None
            suspendido = bool(prox_jornada is not None and bloqueado_hasta >= prox_jornada)

            filas.append({
                'jugador_id': None,
                'jugador': nombre_tecnico,
                'tipo_sancionado': 'TECNICO',
                'equipo_id': eq_id,
                'equipo': equipo.nombre,
                'amarillas': amarillas,
                'rojas': rojas,
                'suspendido_hasta_jornada': bloqueado_hasta or None,
                'suspendido': suspendido,
            })

        filas.sort(key=lambda r: (not r['suspendido'], -r['rojas'], -r['amarillas'], r['jugador']))
        return filas

    @staticmethod
    def goleadores(torneo_id, top=10):
        """Ranking de goleadores del torneo (eventos tipo GOL)."""
        resultados = (
            EventoPartido.query
            .join(Partido, EventoPartido.partido_id == Partido.id)
            .filter(EventoPartido.tipo == 'GOL', Partido.torneo_id == torneo_id)
            .all()
        )

        conteo = {}
        for ev in resultados:
            if not ev.jugador_id:
                continue
            jugador = Jugador.query.get(ev.jugador_id)
            if not jugador:
                continue
            key = jugador.id
            if key not in conteo:
                conteo[key] = {
                    'jugador_id': jugador.id,
                    'jugador': jugador.nombre,
                    'equipo_id': jugador.equipo_id,
                    'equipo': jugador.equipo.nombre if jugador.equipo else 'Sin equipo',
                    'goles': 0,
                }
            conteo[key]['goles'] += 1

        ranking = sorted(conteo.values(), key=lambda r: (-r['goles'], r['jugador']))[:top]
        for i, r in enumerate(ranking, start=1):
            r['pos'] = i
        return ranking

    @staticmethod
    def eventos_partido(partido_id):
        eventos = EventoPartido.query.filter_by(partido_id=partido_id).order_by(EventoPartido.minuto).all()
        resultado = []
        for ev in eventos:
            jugador = Jugador.query.get(ev.jugador_id) if ev.jugador_id else None
            resultado.append({
                'id': ev.id,
                'tipo': ev.tipo,
                'minuto': ev.minuto,
                'descripcion': ev.descripcion,
                'jugador': jugador.nombre if jugador else None,
                'jugador_id': ev.jugador_id,
                'equipo_id': ev.equipo_id or (jugador.equipo_id if jugador else None),
            })
        return resultado