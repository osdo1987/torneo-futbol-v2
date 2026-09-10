"""Seed masivo de prueba: organizador, torneo grande, equipos, jugadores, fixture y resultados."""

import argparse
import random
from datetime import date, datetime, timedelta

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.organizador import Organizador
from app.models.landing import OrganizadorLanding
from app.models.torneo import Torneo
from app.models.equipo import Equipo
from app.models.jugador import Jugador
from app.models.partido import Partido
from app.models.evento_partido import EventoPartido
from app.services.fixture_service import FixtureService
from app.services.partido_service import PartidoService

NOMBRES_EQUIPOS = [
    'Atlético Norte', 'Real del Valle', 'Los Diablos Rojos', 'Fénix FC', 'Deportivo Central',
    'Unión Litoral', 'Independiente Sur', 'Estrella Azul', 'Once Dorados', 'Santa Fe Athletic',
    'Huracanes FC', 'Leones del Este', 'Racing Villa', 'Cóndores Andinos', 'Tigres Metropolitanos',
    'Pumas del Oeste', 'Ciclones FC', 'Garzas Blancas', 'Dragones FC', 'Toros Bravos',
]

NOMBRES_PILA = [
    'Juan', 'Carlos', 'Andrés', 'Luis', 'Miguel', 'Pedro', 'Diego', 'Javier', 'Fernando',
    'Ricardo', 'Santiago', 'Sebastián', 'Camilo', 'Rodrigo', 'Mauricio', 'Óscar', 'Daniel',
    'Cristian', 'Eduardo', 'José', 'Rafael', 'Alejandro', 'Manuel', 'Hugo', 'Mario', 'Ramiro',
    'Nelson', 'Gustavo', 'Fabian', 'Leonardo', 'Iván', 'Sergio', 'Álvaro', 'Julian', 'Pablo',
]

NOMBRES_APELLIDO = [
    'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez',
    'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Ortiz', 'Mendoza',
    'Castillo', 'Vargas', 'Rojas', 'Castro', 'Herrera', 'Vega', 'Fuentes', 'Cabrera', 'Peña',
    'Ibarra', 'Salazar', 'Medina', 'Aguirre', 'Campos', 'Reyes', 'Núñez', 'Moreno', 'Silva',
]

POSICIONES = ['ARQUERO', 'DEFENSOR', 'DEFENSOR', 'MEDIOCAMPISTA', 'MEDIOCAMPISTA', 'DELANTERO']
PIERNAS = ['DERECHA', 'IZQUIERDA', 'AMBIDESTRO']


def crear_organizador_y_usuario(email, password, slug, name):
    org = Organizador.query.filter_by(slug=slug).first()
    if not org:
        org = Organizador(slug=slug, name=name,
                          description=f'Organización de prueba para validar funcionalidades ({name}).',
                          primary_color='#0ea5e9', welcome_message='Bienvenido a la liga de prueba')
        db.session.add(org)
        db.session.flush()
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, role='ORGANIZADOR', organizador_id=org.id)
        user.set_password(password)
        db.session.add(user)
    else:
        user.organizador_id = org.id
        user.role = 'ORGANIZADOR'
    landing = OrganizadorLanding.query.filter_by(organizador_id=org.id).first()
    if not landing:
        db.session.add(OrganizadorLanding(
            organizador_id=org.id, hero_title=name,
            hero_subtitle='Torneos masivos de prueba',
            about_text='Organización con datos generados automáticamente para probar todas las funcionalidades del sistema.',
            show_registration=False,
        ))
    db.session.commit()
    return org, user


def crear_torneo(org, n_equipos, rondas):
    previo = Torneo.query.filter_by(organizador_id=org.id, nombre='Copa Mega Test').first()
    if previo:
        db.session.delete(previo)
        db.session.commit()
    torneo = Torneo(
        organizador_id=org.id,
        nombre='Copa Mega Test',
        max_jugadores_por_equipo=16,
        puntos_victoria=3, puntos_empate=1, puntos_derrota=0,
        inscripciones_jugadores_abiertas=True,
        reglas={
            'formato_tipo': 'ROUND_ROBIN',
            'rondas': rondas,
            'clasifican_a_final': 4,
            'desempates': ['DIF_GOL', 'GOLES_FAVOR', 'MENOS_AMARILLAS', 'MENOS_ROJAS', 'GOLES_CONTRA'],
            'edad_min': None,
            'edad_max': None,
            'max_jugadores': 16,
            'bloquear_baja_tras_jugar': True,
            'comodines_cantidad': 3,
            'comodines_edad_min': 30,
            'tolerancia_w_min': 10,
            'marcador_w': 3,
            'fechas_doble_amarilla': 1,
            'fechas_roja_directa': 2,
        },
    )
    db.session.add(torneo)
    db.session.commit()
    return torneo


def avanzar_hasta(torneo, objetivo):
    cadena = ['CREADO', 'INSCRIPCIONES_ABIERTAS', 'INSCRIPCIONES_CERRADAS', 'SORTEADO', 'EN_JUEGO', 'FINALIZADO']
    desde = cadena.index(torneo.estado)
    hasta = cadena.index(objetivo)
    for estado in cadena[desde + 1:hasta + 1]:
        torneo.estado = estado
        db.session.commit()


def crear_equipos(torneo, n, rng):
    equipos = []
    nombres_disponibles = list(NOMBRES_EQUIPOS)
    nombres_disponibles += [f'{origen} {i}' for i in range(1, 10) for origen in NOMBRES_EQUIPOS]
    for i in range(n):
        nombre = nombres_disponibles[i % len(nombres_disponibles)]
        if i >= len(NOMBRES_EQUIPOS):
            nombre = f'{nombre} {i + 1}'
        equipo = Equipo(torneo_id=torneo.id, nombre=nombre,
                        delegado_email=f'delegado{i + 1}@test.com',
                        delegado_documento=f'10{rng.randint(1000000, 9999999)}')
        db.session.add(equipo)
        equipos.append(equipo)
    db.session.flush()
    return equipos


def crear_jugadores(equipos, rng):
    contador = 0
    total = 0
    for equipo in equipos:
        cantidad = rng.randint(14, 16)
        for _ in range(cantidad):
            contador += 1
            activo = rng.random() < 0.93
            nombre = f'{rng.choice(NOMBRES_PILA)} {rng.choice(NOMBRES_APELLIDO)} {rng.choice(NOMBRES_APELLIDO)}'
            edad = rng.randint(18, 40)
            fecha_nac = date.today() - timedelta(days=edad * 365 + rng.randint(0, 340))
            jugador = Jugador(
                equipo_id=equipo.id,
                nombre=nombre,
                numero_camiseta=rng.randint(1, 99),
                documento_identidad=f'11{rng.randint(10000000, 99999999)}',
                activo=activo,
                posicion=rng.choice(POSICIONES),
                fecha_nacimiento=fecha_nac,
                telefono=f'3{rng.randint(100000000, 399999999)}',
                pierna_habil=rng.choice(PIERNAS),
                altura_cm=rng.randint(162, 195),
            )
            db.session.add(jugador)
            total += 1
    db.session.flush()
    return total


def programar_partidos(partidos, rng):
    base = datetime.now().replace(hour=19, minute=0, second=0, microsecond=0) + timedelta(days=3)
    por_jornada = {}
    for p in partidos:
        por_jornada.setdefault(p.jornada, []).append(p)
    for jornada, lista in sorted(por_jornada.items()):
        fecha = base + timedelta(days=(jornada - 1) * 7)
        for i, p in enumerate(lista):
            horario = 19 if i % 2 == 0 else 21
            candela = fecha.replace(hour=horario, minute=rng.choice([0, 30]))
            p.fecha_programada = candela
    db.session.commit()


def jugar_equipo(partido, jugadores_local, jugadores_visitantes, rng, con_eventos):
    goles_local = rng.choices([0, 1, 2, 3, 4], weights=[15, 25, 30, 20, 10])[0]
    goles_visitante = rng.choices([0, 1, 2, 3, 4], weights=[15, 25, 30, 20, 10])[0]
    if con_eventos:
        equipos = {
            'L': (goles_local, jugadores_local),
            'V': (goles_visitante, jugadores_visitantes),
        }
        for lado, (goles, plantel) in equipos.items():
            for _ in range(goles):
                jugador = rng.choice(plantel)
                db.session.add(EventoPartido(
                    partido_id=partido.id,
                    jugador_id=jugador.id,
                    equipo_id=jugador.equipo_id,
                    tipo='GOL',
                    minuto=rng.randint(1, 90),
                ))
        amarillas = rng.randint(0, 2)
        for _ in range(amarillas):
            lado = rng.choice(['L', 'V'])
            jugador = rng.choice(jugadores_local if lado == 'L' else jugadores_visitantes)
            db.session.add(EventoPartido(
                partido_id=partido.id,
                jugador_id=jugador.id,
                equipo_id=jugador.equipo_id,
                tipo='TARJETA_AMARILLA',
                minuto=rng.randint(1, 90),
            ))
        if rng.random() < 0.03:
            lado = rng.choice(['L', 'V'])
            jugador = rng.choice(jugadores_local if lado == 'L' else jugadores_visitantes)
            db.session.add(EventoPartido(
                partido_id=partido.id,
                jugador_id=jugador.id,
                equipo_id=jugador.equipo_id,
                tipo='TARJETA_ROJA',
                minuto=rng.randint(1, 90),
            ))
    partido.goles_local = goles_local
    partido.goles_visitante = goles_visitante
    if goles_local > goles_visitante:
        partido.resultado = 'LOCAL_GANO'
    elif goles_visitante > goles_local:
        partido.resultado = 'VISITANTE_GANO'
    else:
        partido.resultado = 'EMPATE'


def jugar_fase_final(torneo, con_resultados, con_eventos, n_equipos, rng):
    resumen, err = FixtureService.generar_fase_final(torneo)
    if err:
        return None, err
    fase = Partido.query.filter(Partido.torneo_id == torneo.id, Partido.resultado == 'PENDIENTE')
    partidos_semis = list(fase.all())
    if not con_resultados:
        return {'fase': resumen, 'semis': partidos_semis}, None

    planteles = {e.id: Jugador.query.filter_by(equipo_id=e.id, activo=True).all() for e in torneo.equipos}
    ganadores = []
    for p in partidos_semis:
        g = rng.randrange(1, 4)
        if rng.random() < 0.5:
            p.goles_local, p.goles_visitante, p.resultado = g, 0, 'LOCAL_GANO'
            ganador = p.equipo_local_id
        else:
            p.goles_local, p.goles_visitante, p.resultado = 0, g, 'VISITANTE_GANO'
            ganador = p.equipo_visitante_id
        ganadores.append(ganador)
        if con_eventos:
            for _ in range(g):
                j = rng.choice(planteles[ganador])
                db.session.add(EventoPartido(
                    partido_id=p.id, jugador_id=j.id, equipo_id=j.equipo_id, tipo='GOL', minuto=rng.randint(1, 90)))
    db.session.commit()

    final = Partido(
        torneo_id=torneo.id,
        fase_id=resumen['fase_id'],
        equipo_local_id=ganadores[0],
        equipo_visitante_id=ganadores[1],
        jornada=(partidos_semis[0].jornada or 1) + 1,
        resultado='PENDIENTE', goles_local=0, goles_visitante=0,
    )
    db.session.add(final)
    db.session.commit()
    return {'fase': resumen, 'semis': partidos_semis, 'final': final}, None


def main():
    parser = argparse.ArgumentParser(description='Genera un torneo de prueba masivo')
    parser.add_argument('equipos', type=int, nargs='?', default=16, help='Número de equipos (default 16)')
    parser.add_argument('--seed', type=int, default=None, help='Semilla aleatoria (default: aleatoria)')
    parser.add_argument('--sin-resultados', action='store_true', help='Solo crea fixture, sin jugar partidos')
    parser.add_argument('--sin-eventos', action='store_true', help='Resultados sin goleadores ni tarjetas')
    parser.add_argument('--final', action='store_true', help='Genera y juega fase final (requiere resultados)')
    parser.add_argument('--estado-final', action='store_true', help='Deja el torneo en FINALIZADO')
    parser.add_argument('--email', default='liga.pruebas@osdosoft.com')
    parser.add_argument('--password', default='pruebaliga123')
    parser.add_argument('--nombre-organizador', default='Liga de Pruebas')
    args = parser.parse_args()

    rng = random.Random(args.seed)
    rondas = 2 if args.equipos <= 16 else 1
    app = create_app()
    with app.app_context():
        org, user = crear_organizador_y_usuario(
            args.email, args.password, 'liga-pruebas', args.nombre_organizador)
        torneo = crear_torneo(org, args.equipos, rondas)
        avanzar_hasta(torneo, 'EN_JUEGO')
        equipos = crear_equipos(torneo, args.equipos, rng)
        total_jugadores = crear_jugadores(equipos, rng)
        db.session.commit()

        resumen, err = FixtureService.generar(torneo, reemplazar=True)
        if err:
            print(f'Error generando fixture: {err}')
            return
        partidos = Partido.query.filter_by(torneo_id=torneo.id).all()
        programar_partidos(partidos, rng)

        jugados = 0
        if not args.sin_resultados:
            planteles = {e.id: Jugador.query.filter_by(equipo_id=e.id).all() for e in equipos}
            for p in partidos:
                jugar_equipo(p, planteles[p.equipo_local_id], planteles[p.equipo_visitante_id], rng, not args.sin_eventos)
                jugados += 1
            db.session.commit()
            from app.models.evento_partido import EventoPartido as EP
            eventos = EP.query.join(Partido).filter(Partido.torneo_id == torneo.id).count()

        fase_final = None
        if args.final and not args.sin_resultados:
            rr, err = jugar_fase_final(torneo, not args.sin_resultados, not args.sin_eventos, args.equipos, rng)
            if err:
                print(f'Fase final omitida: {err}')
            fase_final = rr

        if args.estado_final and not args.sin_resultados:
            if fase_final and 'final' in (fase_final or {}):
                guitarra = fase_final['final']
                g = rng.randrange(1, 4)
                guitarra.goles_local = g if rng.random() < 0.5 else 0
                guitarra.goles_visitante = 0 if guitarra.goles_local else g
                guitarra.resultado = 'LOCAL_GANO' if guitarra.goles_local else 'VISITANTE_GANO'
                db.session.commit()
            avanzar_hasta(torneo, 'FINALIZADO')

        print()
        print('================ DATOS DE PRUEBA GENERADOS ================')
        print(f'Organizador:  {org.name}  (id={org.id}, slug={org.slug})')
        print(f'  Landing pública: http://localhost:5173/l/{org.slug}')
        print(f'  Usuario login:   {user.email} / {args.password}')
        print(f'Torneo:       {torneo.nombre}  (id={torneo.id}) [estado={torneo.estado}]')
        print(f'  Equipos:        {len(equipos)}')
        print(f'  Jugadores:      {total_jugadores}')
        print(f'  Partidos:       {len(partidos)}  (rondas={rondas})')
        if not args.sin_resultados:
            print(f'  Resultados:     {jugados} partidos jugados')
            print(f'  Eventos:        {eventos} (goles/tarjetas)')
        if fase_final:
            print(f'  Fase final:     generada (semis + final)')
        print('===========================================================')


if __name__ == '__main__':
    main()