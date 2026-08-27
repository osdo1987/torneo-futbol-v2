"""Script de seed para torneo-futbol-v2.

Uso:
    python seed.py

Crea:
    - Un SUPERADMIN (superadmin@demo.com / super1234)
    - Un organizador de ejemplo con su usuario ORGANIZADOR
    - Dos torneos con equipos, jugadores, fases y partidos
"""
import os
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
            address='Cancha Central'
        )
        db.session.add(org)
        db.session.flush()

        manager = User(email='manager@demo.com', password_hash='', role='ORGANIZADOR', organizador_id=org.id)
        manager.set_password('manager123')
        db.session.add(manager)

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
        for nombre, email in [
            ('Leones', 'leones@demo.com'), ('Tigres', 'tigres@demo.com'),
            ('Halcones', 'halcones@demo.com'), ('Lobos', 'lobos@demo.com'),
        ]:
            eq = Equipo(torneo_id=t1.id, nombre=nombre, delegado_email=email)
            db.session.add(eq)
            db.session.flush()
            if nombre == 'Leones':
                for jname, num in [('Carlos Rivas', 1), ('Mateo Silva', 2), ('Luis Prado', 3)]:
                    db.session.add(Jugador(equipo_id=eq.id, nombre=jname, numero_camiseta=num, documento_identidad=f'DOC-{num}'))
            equipos_t1.append(eq)

        # Partidos de la fase
        db.session.add(Partido(torneo_id=t1.id, fase_id=fase1.id,
                                equipo_local_id=equipos_t1[0].id, equipo_visitante_id=equipos_t1[1].id,
                                jornada=1, goles_local=2, goles_visitante=1, resultado='LOCAL_GANO'))
        db.session.add(Partido(torneo_id=t1.id, fase_id=fase1.id,
                                equipo_local_id=equipos_t1[2].id, equipo_visitante_id=equipos_t1[3].id,
                                jornada=1, goles_local=0, goles_visitante=0, resultado='EMPATE'))
        db.session.add(Partido(torneo_id=t1.id, fase_id=fase1.id,
                                equipo_local_id=equipos_t1[1].id, equipo_visitante_id=equipos_t1[2].id,
                                jornada=2))

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


if __name__ == '__main__':
    run()