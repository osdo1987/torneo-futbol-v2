"""Generador automático de fixture todos-contra-todos (round robin)."""
from app.extensions import db
from app.models.equipo import Equipo
from app.models.fase import Fase
from app.models.partido import Partido
from app.services.reglas import reglas_normalizadas


class FixtureService:
    @staticmethod
    def _round_robin(ids):
        """Método del círculo: devuelve rondas con pares (local, visitante)."""
        ids = list(ids)
        if len(ids) % 2:
            ids.append(None)  # libre si impar
        n = len(ids)
        rondas = []
        for r in range(n - 1):
            pares = []
            for i in range(n // 2):
                a, b = ids[i], ids[n - 1 - i]
                if a is None or b is None:
                    continue
                pares.append((a, b) if (r + i) % 2 == 0 else (b, a))
            rondas.append(pares)
            ids = [ids[0], ids[-1]] + ids[1:-1]
        return rondas

    @staticmethod
    def generar(torneo, reemplazar=False):
        """Genera el fixture según reglas del torneo. Devuelve (resumen, error)."""
        equipos = Equipo.query.filter_by(torneo_id=torneo.id).all()
        if len(equipos) < 3:
            return None, 'Se necesitan al menos 3 equipos para generar el fixture'
        reglas = reglas_normalizadas(torneo)
        if reglas['formato_tipo'] != 'ROUND_ROBIN':
            return None, 'El generador automático está disponible para formato ROUND_ROBIN'

        existentes = Partido.query.filter_by(torneo_id=torneo.id).all()
        if existentes:
            jugados = [p for p in existentes if p.resultado not in ('PENDIENTE', 'POSTERGADO')]
            if jugados:
                return None, 'Ya hay partidos con resultado; no se puede regenerar el fixture'
            if not reemplazar:
                return None, 'Ya existen partidos programados. Envía reemplazar=true para regenerarlos'
            for p in existentes:
                db.session.delete(p)
            db.session.flush()

        fase = Fase.query.filter_by(torneo_id=torneo.id).first()
        if not fase:
            fase = Fase(torneo_id=torneo.id, nombre='Todos contra todos', orden=1, tipo='ROUND_ROBIN')
            db.session.add(fase)
            db.session.flush()

        ids = [e.id for e in equipos]
        rondas = FixtureService._round_robin(ids)
        if reglas['rondas'] == 2:
            rondas = rondas + [[(v, l) for (l, v) in r] for r in rondas]

        creados = 0
        for j, pares in enumerate(rondas, start=1):
            for local_id, visitante_id in pares:
                db.session.add(Partido(
                    torneo_id=torneo.id, fase_id=fase.id,
                    equipo_local_id=local_id, equipo_visitante_id=visitante_id,
                    jornada=j, resultado='PENDIENTE', goles_local=0, goles_visitante=0,
                ))
                creados += 1
        db.session.commit()
        return {'partidos': creados, 'jornadas': len(rondas), 'fase_id': fase.id}, None

    @staticmethod
    def generar_fase_final(torneo):
        """Clasifica los primeros N (reglas) y crea el cruce final/semifinales."""
        from app.services.estadistica_service import EstadisticaService
        reglas = reglas_normalizadas(torneo)
        n = int(reglas.get('clasifican_a_final') or 0)
        if n < 2:
            return None, 'Configura "Clasifican a final" (2 o más) en el reglamento del torneo'

        filas = EstadisticaService.tabla_posiciones(torneo.id)
        if len([f for f in filas if f['PJ'] > 0]) < n:
            return None, f'Aún no hay partidos jugados suficientes para clasificar {n} equipos'

        fase = next((f for f in torneo.fases if f.tipo != 'ROUND_ROBIN'), None)
        if not fase:
            orden = max([f.orden or 0 for f in torneo.fases], default=0) + 1
            fase = Fase(torneo_id=torneo.id, nombre='Fase Final', orden=orden, tipo='ELIMINATORIA')
            db.session.add(fase)
            db.session.flush()

        ya = Partido.query.filter_by(torneo_id=torneo.id, fase_id=fase.id).count()
        if ya:
            return None, 'La fase final ya fue generada'

        semis = filas[:n]
        max_j = (db.session.query(db.func.max(Partido.jornada))
                 .filter_by(torneo_id=torneo.id).scalar()) or 0

        creados = []
        for a, b in list(zip(semis, reversed(semis)))[: n // 2]:
            db.session.add(Partido(
                torneo_id=torneo.id, fase_id=fase.id,
                equipo_local_id=a['equipo_id'], equipo_visitante_id=b['equipo_id'],
                jornada=max_j + 1, resultado='PENDIENTE', goles_local=0, goles_visitante=0,
            ))
            creados.append({'local': a['equipo'], 'visitante': b['equipo']})
        db.session.commit()
        return {'fase_id': fase.id, 'fase': fase.nombre, 'partidos': creados}, None