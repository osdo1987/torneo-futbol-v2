"""Seed: torneo pequeño con fixture WITHOUT resultados para probar la planilla."""

import argparse
import random

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.organizador import Organizador
from app.models.torneo import Torneo
from app.models.partido import Partido
from app.services.fixture_service import FixtureService
from seed_masivo import crear_organizador_y_usuario, crear_equipos, crear_jugadores, programar_partidos

ESTADOS = ['CREADO', 'INSCRIPCIONES_ABIERTAS', 'INSCRIPCIONES_CERRADAS', 'SORTEADO', 'EN_JUEGO']


def main():
    parser = argparse.ArgumentParser(description='Crea un torneo sin resultados para planillar')
    parser.add_argument('equipos', type=int, nargs='?', default=8, help='Número de equipos (default 8)')
    parser.add_argument('--seed', type=int, default=None)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    app = create_app()
    with app.app_context():
        org, _ = crear_organizador_y_usuario(
            'liga.pruebas@osdosoft.com', 'pruebaliga123', 'liga-pruebas', 'Liga de Pruebas')
        previo = Torneo.query.filter_by(organizador_id=org.id, nombre='Copa Planilla').first()
        if previo:
            db.session.delete(previo)
            db.session.commit()
        t = Torneo(organizador_id=org.id, nombre='Copa Planilla',
                   max_jugadores_por_equipo=14, puntos_victoria=3, puntos_empate=1, puntos_derrota=0,
                   inscripciones_jugadores_abiertas=False,
                   reglas={'formato_tipo': 'ROUND_ROBIN', 'rondas': 1, 'clasifican_a_final': 2,
                           'desempates': ['DIF_GOL', 'GOLES_FAVOR', 'MENOS_AMARILLAS', 'MENOS_ROJAS', 'GOLES_CONTRA'],
                           'tolerancia_w_min': 10, 'marcador_w': 3})
        db.session.add(t)
        db.session.commit()
        for e in ESTADOS[1:]:
            t.estado = e
        db.session.commit()
        equipos = crear_equipos(t, args.equipos, rng)
        total_jugadores = crear_jugadores(equipos, rng)
        db.session.commit()
        resumen, err = FixtureService.generar(t, reemplazar=True)
        if err:
            print(f'Error: {err}')
            return
        partidos = Partido.query.filter_by(torneo_id=t.id).all()
        programar_partidos(partidos, rng)
        print()
        print('Torneo "Copa Planilla" creado para planillar:')
        print(f'  id={t.id} | equipos={len(equipos)} | jugadores={total_jugadores} | partidos pendientes={len(partidos)}')
        print(f'Login: liga.pruebas@osdosoft.com / pruebaliga123')
        print('Abre la pestaña Planilla en el panel para probar.')


if __name__ == '__main__':
    main()