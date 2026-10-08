"""Módulo financiero: valores del reglamento, deudas y pagos por equipo/jugador."""
from app.extensions import db
from app.models.equipo import Equipo
from app.models.evento_partido import EventoPartido
from app.models.jugador import Jugador
from app.models.pago import Pago, CONCEPTOS_PAGO
from app.models.partido import Partido
from app.services.reglas import reglas_normalizadas


def _f(valor):
    """Decimal (Numeric) -> float para JSON."""
    return round(float(valor or 0), 2)


def eventos_tarjetas(torneo_id, jugador_id):
    """Eventos de tarjetas del jugador en el torneo, en orden cronológico."""
    eventos = (EventoPartido.query
               .join(Partido, EventoPartido.partido_id == Partido.id)
               .filter(Partido.torneo_id == torneo_id,
                       EventoPartido.jugador_id == jugador_id,
                       EventoPartido.tipo.in_(['TARJETA_AMARILLA', 'TARJETA_ROJA']))
               .all())
    return sorted(eventos, key=lambda e: (e.partido.jornada or 0, e.id))


def cargos_tarjetas(evs):
    """Cargos de pago generados por las tarjetas de un jugador.

    Reglas de cobro (agrupando por partido, en orden cronológico):
    - 2+ amarillas en el mismo partido -> un solo cargo TARJETA_ROJA
      (se paga como si fuera roja) que cubre esas amarillas.
    - Amarilla suelta -> cargo TARJETA_AMARILLA.
    - Cada roja directa -> cargo TARJETA_ROJA.
    - Amarilla + roja en el mismo partido -> se cobran ambos cargos.

    Devuelve lista de {'concepto', 'eventos': [ids], 'partido_id'}.
    """
    orden, por_partido = [], {}
    for e in evs:
        pid = e.partido_id
        if pid not in por_partido:
            por_partido[pid] = {'amarillas': [], 'rojas': []}
            orden.append(pid)
        clave = 'rojas' if e.tipo == 'TARJETA_ROJA' else 'amarillas'
        por_partido[pid][clave].append(e.id)

    cargos = []
    for pid in orden:
        grupo = por_partido[pid]
        if len(grupo['amarillas']) >= 2:
            cargos.append({'concepto': 'TARJETA_ROJA',
                           'eventos': list(grupo['amarillas']),
                           'partido_id': pid})
        else:
            for eid in grupo['amarillas']:
                cargos.append({'concepto': 'TARJETA_AMARILLA',
                               'eventos': [eid], 'partido_id': pid})
        for eid in grupo['rojas']:
            cargos.append({'concepto': 'TARJETA_ROJA',
                           'eventos': [eid], 'partido_id': pid})
    return cargos


def aplicar_pagos(cargos, pagado, valor_amarilla, valor_roja):
    """Aplica el total pagado a los cargos, del más antiguo al más reciente (FIFO).

    Devuelve {valor_total, deuda, eventos_pagados (set), amarillas_pagadas,
    rojas_pagadas, pendientes}.
    """
    pagado = float(pagado or 0)
    pool = pagado
    valor_total = 0.0
    eventos_pagados = set()
    amarillas_pagadas = rojas_pagadas = 0
    pendientes = []

    for c in cargos:
        bruto = valor_roja if c['concepto'] == 'TARJETA_ROJA' else valor_amarilla
        valor = round(float(bruto or 0), 2)
        valor_total += valor
        if valor > 0 and pool >= valor - 1e-9:
            pool -= valor
            eventos_pagados.update(c['eventos'])
            if c['concepto'] == 'TARJETA_ROJA':
                rojas_pagadas += 1
            else:
                amarillas_pagadas += 1
        else:
            pendientes.append(c)

    return {
        'valor_total': round(valor_total, 2),
        'deuda': round(max(0.0, valor_total - pagado), 2),
        'eventos_pagados': eventos_pagados,
        'amarillas_pagadas': amarillas_pagadas,
        'rojas_pagadas': rojas_pagadas,
        'pendientes': pendientes,
    }


class FinanzaService:
    CAMPOS_CONFIG = [
        'valor_tarjeta_amarilla', 'valor_tarjeta_roja',
        'modalidad_pago', 'valor_inscripcion',
        'bloquear_por_inscripcion_pendiente', 'bloquear_por_tarjetas_no_pagadas',
    ]

    @staticmethod
    def config(torneo):
        reglas = reglas_normalizadas(torneo)
        return {c: reglas.get(c) for c in FinanzaService.CAMPOS_CONFIG}

    @staticmethod
    def deuda_jugador(torneo, jugador):
        """Estado financiero de un jugador.

        Devuelve {inscripcion_pendiente, deuda_tarjetas, bloqueado, motivos}.
        """
        cfg = FinanzaService.config(torneo)
        motivos = []

        if cfg['modalidad_pago'] == 'GRUPAL':
            pagada = db.session.query(Pago.id).filter(
                Pago.torneo_id == torneo.id,
                Pago.concepto == 'INSCRIPCION',
                Pago.equipo_id == jugador.equipo_id,
                Pago.jugador_id.is_(None),
            ).first() is not None
            inscripcion_pendiente = not pagada and bool(_f(cfg['valor_inscripcion']) > 0)
        else:
            pagada = db.session.query(Pago.id).filter(
                Pago.torneo_id == torneo.id,
                Pago.concepto == 'INSCRIPCION',
                Pago.jugador_id == jugador.id,
            ).first() is not None
            inscripcion_pendiente = not pagada and bool(_f(cfg['valor_inscripcion']) > 0)

        eventos = eventos_tarjetas(torneo.id, jugador.id)
        amarillas = sum(1 for e in eventos if e.tipo == 'TARJETA_AMARILLA')
        rojas = sum(1 for e in eventos if e.tipo == 'TARJETA_ROJA')
        pagado_tarjetas = _f(db.session.query(
            db.func.coalesce(db.func.sum(Pago.monto), 0)
        ).filter(
            Pago.torneo_id == torneo.id,
            Pago.jugador_id == jugador.id,
            Pago.concepto.in_(['TARJETA_AMARILLA', 'TARJETA_ROJA']),
        ).scalar())
        cargos = cargos_tarjetas(eventos)
        resumen = aplicar_pagos(cargos, pagado_tarjetas,
                                _f(cfg['valor_tarjeta_amarilla']),
                                _f(cfg['valor_tarjeta_roja']))
        deuda_tarjetas = resumen['deuda']

        bloqueado = False
        if cfg['bloquear_por_inscripcion_pendiente'] and inscripcion_pendiente:
            bloqueado = True
            motivos.append('Inscripción pendiente')
        if cfg['bloquear_por_tarjetas_no_pagadas'] and deuda_tarjetas > 0:
            bloqueado = True
            motivos.append(f'Deuda por tarjetas (${deuda_tarjetas:,.0f})')

        return {
            'inscripcion_pendiente': inscripcion_pendiente,
            'deuda_tarjetas': deuda_tarjetas,
            'amarillas': amarillas,
            'rojas': rojas,
            'bloqueado': bloqueado,
            'motivos': motivos,
        }

    @staticmethod
    def bloqueo_jugador(torneo, jugador):
        """Motivo de bloqueo (string) o None si el jugador puede jugar."""
        estado = FinanzaService.deuda_jugador(torneo, jugador)
        if estado['bloqueado']:
            return '; '.join(estado['motivos'])
        return None

    @staticmethod
    def listar_pagos(torneo_id):
        pagos = (Pago.query.filter_by(torneo_id=torneo_id)
                 .order_by(Pago.created_at.desc())
                 .all())
        return [{
            'id': p.id,
            'torneo_id': p.torneo_id,
            'equipo_id': p.equipo_id,
            'equipo': p.equipo.nombre if p.equipo else None,
            'jugador_id': p.jugador_id,
            'jugador': p.jugador.nombre if p.jugador else None,
            'concepto': p.concepto,
            'monto': _f(p.monto),
            'nota': p.nota,
            'created_at': p.created_at.isoformat() if p.created_at else None,
        } for p in pagos]

    @staticmethod
    def registrar(torneo, concepto, monto, jugador_id=None, equipo_id=None, nota=None, user=None):
        """Registra un pago. Devuelve (pago, error)."""
        if concepto not in CONCEPTOS_PAGO:
            return None, f'Concepto inválido ({", ".join(CONCEPTOS_PAGO)})'
        try:
            monto = float(monto)
        except (TypeError, ValueError):
            return None, 'Monto inválido'
        if monto < 0:
            return None, 'El monto no puede ser negativo'

        cfg = FinanzaService.config(torneo)
        jugador = None
        equipo = None

        if concepto == 'INSCRIPCION':
            if cfg['modalidad_pago'] == 'GRUPAL':
                equipo = Equipo.query.get(equipo_id) if equipo_id else None
                if not equipo or equipo.torneo_id != torneo.id:
                    return None, 'Selecciona el equipo de la inscripción grupal'
            else:
                jugador = Jugador.query.get(jugador_id) if jugador_id else None
                if not jugador or jugador.equipo.torneo_id != torneo.id:
                    return None, 'Selecciona el jugador de la inscripción'
                equipo = jugador.equipo
        else:
            jugador = Jugador.query.get(jugador_id) if jugador_id else None
            if not jugador or jugador.equipo.torneo_id != torneo.id:
                return None, 'Selecciona el jugador de la sanción'
            equipo = jugador.equipo

        pago = Pago(
            torneo_id=torneo.id,
            equipo_id=equipo.id,
            jugador_id=jugador.id if jugador else None,
            concepto=concepto,
            monto=monto,
            nota=nota or None,
            registrado_por=user.id if user else None,
        )
        db.session.add(pago)
        db.session.commit()
        return pago, None

    @staticmethod
    def reporte(torneo):
        """Reporte completo de tesorería del torneo."""
        cfg = FinanzaService.config(torneo)
        equipos = Equipo.query.filter_by(torneo_id=torneo.id).all()
        pagos = FinanzaService.listar_pagos(torneo.id)

        total_tarjetas = sum(_f(p['monto']) for p in pagos
                             if p['concepto'] in ('TARJETA_AMARILLA', 'TARJETA_ROJA'))
        total_inscripcion = sum(_f(p['monto']) for p in pagos if p['concepto'] == 'INSCRIPCION')

        por_jugador = []
        total_deuda_tarjetas = 0
        jugadores_sin_inscripcion = 0
        bloqueados = []
        for eq in equipos:
            jugadores = Jugador.query.filter_by(equipo_id=eq.id, activo=True).all()
            for j in jugadores:
                est = FinanzaService.deuda_jugador(torneo, j)
                total_deuda_tarjetas += est['deuda_tarjetas']
                if est['inscripcion_pendiente']:
                    jugadores_sin_inscripcion += 1
                if est['bloqueado']:
                    bloqueados.append(j.id)
                por_jugador.append({
                    'jugador_id': j.id,
                    'jugador': j.nombre,
                    'numero': j.numero_camiseta,
                    'equipo_id': eq.id,
                    'equipo': eq.nombre,
                    'inscripcion_pendiente': est['inscripcion_pendiente'],
                    'deuda_tarjetas': est['deuda_tarjetas'],
                    'amarillas': est['amarillas'],
                    'rojas': est['rojas'],
                    'bloqueado': est['bloqueado'],
                    'motivos': est['motivos'],
                })

        if cfg['modalidad_pago'] == 'GRUPAL':
            equipos_sin_pago = {j['equipo_id'] for j in por_jugador if j['inscripcion_pendiente']}
            deuda_inscripcion = cfg['valor_inscripcion'] * len(equipos_sin_pago)
        else:
            deuda_inscripcion = cfg['valor_inscripcion'] * jugadores_sin_inscripcion

        return {
            'torneo': torneo.nombre,
            'config': cfg,
            'resumen': {
                'recaudado': round(total_inscripcion + total_tarjetas, 2),
                'recaudado_inscripcion': round(total_inscripcion, 2),
                'recaudado_tarjetas': round(total_tarjetas, 2),
                'deuda_inscripcion': round(deuda_inscripcion, 2),
                'deuda_tarjetas': round(total_deuda_tarjetas, 2),
                'jugadores_sin_inscripcion': jugadores_sin_inscripcion,
                'jugadores_bloqueados': len(bloqueados),
            },
            'jugadores': por_jugador,
            'pagos': pagos,
        }