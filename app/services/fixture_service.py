"""Generador automático de fixture todos-contra-todos (round robin)."""
from datetime import datetime, timedelta

from app.extensions import db
from app.models.equipo import Equipo
from app.models.fase import Fase
from app.models.locacion import Locacion
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
    def _base_programacion(fecha_inicio, hora_inicio):
        """Combina fecha (YYYY-MM-DD) y hora (HH:MM) de inicio.

        Devuelve (datetime|None, error). Sin fecha_inicio no se programan partidos.
        """
        if not fecha_inicio:
            return None, None
        try:
            fecha = datetime.strptime(str(fecha_inicio).strip()[:10], '%Y-%m-%d').date()
        except ValueError:
            return None, 'Fecha de inicio inválida (usa AAAA-MM-DD)'
        try:
            hora = datetime.strptime(str(hora_inicio or '08:00').strip(), '%H:%M').time()
        except ValueError:
            return None, 'Hora de inicio inválida (usa HH:MM)'
        return datetime.combine(fecha, hora), None

    @staticmethod
    def _normalizar_espacios(espacios):
        """Valida y ordena los espacios de juego [{fecha, hora, locacion_id}].

        Devuelve (lista, error). Cada espacio es un cupo concreto: día, hora y sede.
        """
        normalizados = []
        for i, esp in enumerate(espacios):
            if not isinstance(esp, dict):
                return None, f'Espacio #{i + 1}: se esperaba un objeto con fecha, hora y locacion_id'
            base, error = FixtureService._base_programacion(esp.get('fecha'), esp.get('hora'))
            if error:
                return None, f'Espacio #{i + 1}: {error}'
            loc = esp.get('locacion_id')
            try:
                loc = int(loc) if loc not in (None, '') else None
            except (TypeError, ValueError):
                return None, f'Espacio #{i + 1}: locacion_id inválido'
            normalizados.append({'fecha': base, 'locacion_id': loc})
        normalizados.sort(key=lambda e: (e['fecha'], e['locacion_id'] or 0))
        return normalizados, None

    @staticmethod
    def generar(torneo, reemplazar=False, fecha_inicio=None, hora_inicio=None,
                dias_entre_jornadas=7, horas_entre_partidos=2, espacios=None):
        """Genera el fixture según reglas del torneo. Devuelve (resumen, error).

        Programación (opcional, dos modos excluyentes):
        - `espacios`: lista de cupos concretos [{fecha: 'YYYY-MM-DD', hora: 'HH:MM',
          locacion_id}] que se asignan en orden a los partidos. Permite fijar de una
          vez día, hora y sede de cada partido.
        - `fecha_inicio` + `dias_entre_jornadas` + `horas_entre_partidos`: modo simple
          (jornada +N días, partido +M horas) sin sede.
        Sin ninguno de los dos los partidos quedan sin fecha (comportamiento histórico).
        """
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

        try:
            dias = int(dias_entre_jornadas)
            horas = int(horas_entre_partidos)
        except (TypeError, ValueError):
            return None, 'Días entre jornadas y horas entre partidos deben ser números enteros'
        if dias < 0 or horas < 0:
            return None, 'Días entre jornadas y horas entre partidos no pueden ser negativos'
        base, error = FixtureService._base_programacion(fecha_inicio, hora_inicio)
        if error:
            return None, error
        cupos, error = FixtureService._normalizar_espacios(espacios or [])
        if error:
            return None, error
        if cupos:
            ids_loc = {c['locacion_id'] for c in cupos if c['locacion_id'] is not None}
            if ids_loc:
                validas = {l.id for l in Locacion.query.filter(
                    Locacion.id.in_(ids_loc),
                    Locacion.organizador_id == torneo.organizador_id).all()}
                invalidas = sorted(ids_loc - validas)
                if invalidas:
                    return None, f'Locaciones no válidas para este organizador: {invalidas}'

        fase = Fase.query.filter_by(torneo_id=torneo.id).first()
        if not fase:
            fase = Fase(torneo_id=torneo.id, nombre='Todos contra todos', orden=1, tipo='ROUND_ROBIN')
            db.session.add(fase)
            db.session.flush()

        ids = [e.id for e in equipos]
        rondas = FixtureService._round_robin(ids)
        if reglas['rondas'] == 2:
            rondas = rondas + [[(v, l) for (l, v) in r] for r in rondas]

        total = sum(len(pares) for pares in rondas)
        if cupos and len(cupos) < total:
            return None, (f'Faltan espacios de juego: se necesitan {total} y solo hay {len(cupos)}. '
                          'Agrega más días, horarios, locaciones o semanas.')

        creados = 0
        programados = 0
        ultima_fecha = None
        locaciones_usadas = set()
        for j, pares in enumerate(rondas, start=1):
            for i, (local_id, visitante_id) in enumerate(pares):
                fecha_programada = None
                locacion_id = None
                if cupos:
                    cupo = cupos[creados]
                    fecha_programada = cupo['fecha']
                    locacion_id = cupo['locacion_id']
                elif base is not None:
                    fecha_programada = base + timedelta(days=(j - 1) * dias, hours=i * horas)
                if fecha_programada is not None:
                    programados += 1
                    ultima_fecha = fecha_programada
                if locacion_id is not None:
                    locaciones_usadas.add(locacion_id)
                db.session.add(Partido(
                    torneo_id=torneo.id, fase_id=fase.id,
                    equipo_local_id=local_id, equipo_visitante_id=visitante_id,
                    jornada=j, resultado='PENDIENTE', goles_local=0, goles_visitante=0,
                    fecha_programada=fecha_programada, locacion_id=locacion_id,
                ))
                creados += 1
        db.session.commit()
        resumen = {'partidos': creados, 'jornadas': len(rondas), 'fase_id': fase.id}
        if programados:
            resumen['programados'] = programados
            resumen['primera_fecha'] = (cupos[0]['fecha'] if cupos else base).isoformat()
            resumen['ultima_fecha'] = ultima_fecha.isoformat() if ultima_fecha else None
        if locaciones_usadas:
            resumen['locaciones'] = len(locaciones_usadas)
        return resumen, None

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