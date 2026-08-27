from app.models.partido import Partido
from app.models.equipo import Equipo
from app.models.evento_partido import EventoPartido
from app.models.jugador import Jugador


class EstadisticaService:
    """Cálculo on-the-fly de tabla de posiciones, goleadores y estadísticas."""

    @staticmethod
    def tabla_posiciones(torneo_id):
        equipos = Equipo.query.filter_by(torneo_id=torneo_id).all()
        partidos = Partido.query.filter(
            Partido.torneo_id == torneo_id,
            Partido.resultado.in_(['LOCAL_GANO', 'VISITANTE_GANO', 'EMPATE'])
        ).all()

        stats = {e.id: {
            'equipo_id': e.id,
            'equipo': e.nombre,
            'PJ': 0, 'PG': 0, 'PE': 0, 'PP': 0,
            'GF': 0, 'GC': 0, 'DF': 0, 'PTS': 0,
        } for e in equipos}

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

            if p.resultado == 'LOCAL_GANO':
                local['PG'] += 1
                visitante['PP'] += 1
                local['PTS'] += 3
            elif p.resultado == 'VISITANTE_GANO':
                visitante['PG'] += 1
                local['PP'] += 1
                visitante['PTS'] += 3
            else:
                local['PE'] += 1
                visitante['PE'] += 1
                local['PTS'] += 1
                visitante['PTS'] += 1

        filas = list(stats.values())
        for f in filas:
            f['DF'] = f['GF'] - f['GC']

        filas.sort(key=lambda r: (-r['PTS'], -r['DF'], -r['GF'], r['equipo']))
        for i, f in enumerate(filas, start=1):
            f['pos'] = i
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