"""Script de seed para torneo-futbol-v2.

Uso:
    python seed.py

Crea:
    - Un SUPERADMIN (superadmin@demo.com / super1234)
    - Un organizador de ejemplo con su usuario ORGANIZADOR
    - Dos torneos con equipos, jugadores, fases y partidos
"""
import os
from datetime import date, datetime, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.organizador import Organizador
from app.models.torneo import Torneo
from app.models.fase import Fase
from app.models.equipo import Equipo
from app.models.jugador import Jugador
from app.models.partido import Partido
from app.models.evento_partido import EventoPartido
from app.models.landing import OrganizadorLanding

app = create_app()


def run():
    with app.app_context():
        if User.query.filter_by(email='superadmin@demo.com').first():
            print('Seed ya aplicado. Anulando...')
            return

        # SUPERADMIN
        superadmin = User(email='superadmin@demo.com', password_hash='', role='SUPERADMIN')
        superadmin.set_password('super1234')
        db.session.add(superadmin)

        # Organizador 1
        org = Organizador(
            slug='liga-osdosoft',
            name='Liga Osdosoft FC',
            whatsapp='+5491100000000',
            address='Cancha Central',
            description='Liga de fútbol amateur organizando torneos de calidad para la comunidad.',
            primary_color='#004ac6',
            welcome_message='Bienvenido a la Liga Osdosoft FC',
        )
        db.session.add(org)
        db.session.flush()

        db.session.add(OrganizadorLanding(
            organizador_id=org.id,
            hero_title='Liga Osdosoft FC',
            hero_subtitle='Torneos de fútbol amateur',
            about_title='Sobre nosotros',
            about_text='Organizamos torneos de fútbol para toda la comunidad con reglamento claro, '
                       'regateo de resultados y la mejor organización.',
            features_title='Nuestros servicios',
            features=[
                {'icon': 'award', 'title': 'Torneos anuales', 'description': 'Copas y ligas durante todo el año.'},
                {'icon': 'users', 'title': 'Inscripción de equipos', 'description': 'Equipos y jugadores con ficha completa.'},
                {'icon': 'trending', 'title': 'Tablas en vivo', 'description': 'Posiciones, goleadores y sanciones al día.'},
            ],
            gallery_images=[],
            contact_email='liga@osdosoft.com',
            contact_phone='+5491100000000',
            social_facebook='https://facebook.com/osdosoft',
            social_instagram='https://instagram.com/osdosoft',
            social_whatsapp='https://wa.me/5491100000000',
            footer_text='¿Querés sumar tu equipo? Escribinos.',
        ))

        manager = User(email='manager@demo.com', password_hash='', role='ORGANIZADOR', organizador_id=org.id)
        manager.set_password('manager123')
        db.session.add(manager)

        staff = User(email='staff@demo.com', password_hash='', role='STAFF', organizador_id=org.id)
        staff.set_password('staff123')
        db.session.add(staff)

        admin = User(email='admin@demo.com', password_hash='', role='ADMIN', organizador_id=org.id)
        admin.set_password('admin123')
        db.session.add(admin)

        referee = User(email='referee@demo.com', password_hash='', role='REFEREE', organizador_id=org.id)
        referee.set_password('referee123')
        db.session.add(referee)

        delegado = None  # se completa al crear los equipos del torneo 1 (ver abajo)

        # Torneo 1 - EN_JUEGO
        t1 = Torneo(
            organizador_id=org.id, nombre='Copa Osdosoft 2026', estado='EN_JUEGO',
            max_jugadores_por_equipo=18, puntos_victoria=3, puntos_empate=1, puntos_derrota=0,
        )
        db.session.add(t1)
        db.session.flush()

        fase1 = Fase(torneo_id=t1.id, nombre='Fase de Grupos', orden=1, tipo='GRUPOS')
        db.session.add(fase1)
        db.session.flush()

        equipos_t1 = []
        jugadores_leones = []
        for nombre, email in [
            ('Leones', 'leones@demo.com'), ('Tigres', 'tigres@demo.com'),
            ('Halcones', 'halcones@demo.com'), ('Lobos', 'lobos@demo.com'),
        ]:
            eq = Equipo(torneo_id=t1.id, nombre=nombre, delegado_email=email)
            db.session.add(eq)
            db.session.flush()
            if nombre == 'Leones':
                if delegado is None:
                    delegado = User(email='delegado@demo.com', password_hash='', role='DELEGADO',
                                    organizador_id=org.id, equipo_id=eq.id)
                    delegado.set_password('delegado123')
                    db.session.add(delegado)
                jugadores_demo = [
                    {'nombre': 'Carlos Rivas', 'numero_camiseta': 1, 'documento_identidad': 'DOC-1',
                     'posicion': 'ARQUERO', 'fecha_nacimiento': date(1998, 3, 15),
                     'telefono': '+5491122334401', 'pierna_habil': 'DERECHA', 'altura_cm': 185},
                    {'nombre': 'Mateo Silva', 'numero_camiseta': 2, 'documento_identidad': 'DOC-2',
                     'posicion': 'DEFENSOR', 'fecha_nacimiento': date(2000, 7, 22),
                     'telefono': '+5491122334402', 'pierna_habil': 'IZQUIERDA', 'altura_cm': 178},
                    {'nombre': 'Luis Prado', 'numero_camiseta': 3, 'documento_identidad': 'DOC-3',
                     'posicion': 'DELANTERO', 'fecha_nacimiento': date(1995, 11, 30),
                     'telefono': '+5491122334403', 'pierna_habil': 'DERECHA', 'altura_cm': 181},
                ]
                for jd in jugadores_demo:
                    jugador = Jugador(equipo_id=eq.id, **jd)
                    db.session.add(jugador)
                    jugadores_leones.append(jugador)
            equipos_t1.append(eq)

        # Partidos de la fase
        p1 = Partido(torneo_id=t1.id, fase_id=fase1.id,
                     equipo_local_id=equipos_t1[0].id, equipo_visitante_id=equipos_t1[1].id,
                     jornada=1, goles_local=2, goles_visitante=1, resultado='LOCAL_GANO',
                     fecha_programada=datetime.utcnow() - timedelta(days=7))
        db.session.add(p1)
        db.session.flush()
        if len(jugadores_leones) >= 3:
            db.session.add(EventoPartido(partido_id=p1.id, tipo='GOL', jugador_id=jugadores_leones[2].id, equipo_id=equipos_t1[0].id, minuto=23))
            db.session.add(EventoPartido(partido_id=p1.id, tipo='GOL', jugador_id=jugadores_leones[1].id, equipo_id=equipos_t1[0].id, minuto=55))
            db.session.add(EventoPartido(partido_id=p1.id, tipo='GOL', jugador_id=jugadores_leones[2].id, equipo_id=equipos_t1[0].id, minuto=78))
            db.session.add(EventoPartido(partido_id=p1.id, tipo='TARJETA_AMARILLA', jugador_id=jugadores_leones[0].id, equipo_id=equipos_t1[0].id, minuto=40))
            db.session.add(EventoPartido(partido_id=p1.id, tipo='TARJETA_AMARILLA', jugador_id=jugadores_leones[1].id, equipo_id=equipos_t1[0].id, minuto=63))
            db.session.add(EventoPartido(partido_id=p1.id, tipo='TARJETA_ROJA', jugador_id=jugadores_leones[1].id, equipo_id=equipos_t1[0].id, minuto=85))
        db.session.add(Partido(torneo_id=t1.id, fase_id=fase1.id,
                                equipo_local_id=equipos_t1[2].id, equipo_visitante_id=equipos_t1[3].id,
                                jornada=1, goles_local=0, goles_visitante=0, resultado='EMPATE',
                                fecha_programada=datetime.utcnow() - timedelta(days=7)))
        db.session.add(Partido(torneo_id=t1.id, fase_id=fase1.id,
                                equipo_local_id=equipos_t1[1].id, equipo_visitante_id=equipos_t1[2].id,
                                jornada=2, fecha_programada=datetime.utcnow() + timedelta(days=2)))
        # Partido pendiente del equipo del DELEGADO (Leones) para gestionar su alineación.
        db.session.add(Partido(torneo_id=t1.id, fase_id=fase1.id,
                                equipo_local_id=equipos_t1[0].id, equipo_visitante_id=equipos_t1[3].id,
                                jornada=2, fecha_programada=datetime.utcnow() + timedelta(days=5)))

        # Torneo 2 - INSCRIPCIONES_ABIERTAS
        t2 = Torneo(
            organizador_id=org.id, nombre='Copa Primavera 2026', estado='INSCRIPCIONES_ABIERTAS',
            max_jugadores_por_equipo=20, puntos_victoria=3, puntos_empate=1, puntos_derrota=0,
        )
        db.session.add(t2)

        db.session.commit()
        print('Seed completado correctamente.')
        print('  SUPERADMIN: superadmin@demo.com / super1234')
        print('  ORGANIZADOR: manager@demo.com / manager123')
        print('  ADMIN: admin@demo.com / admin123')
        print('  STAFF: staff@demo.com / staff123')
        print('  REFEREE: referee@demo.com / referee123')
        print('  DELEGADO: delegado@demo.com / delegado123')


if __name__ == '__main__':
    run()