"""Reinicia la base de datos local: la vacía por completo y deja un único usuario SUPERADMIN.

Uso (desde el contenedor de la API, donde el repo está montado en /app):
    python reset_local_db.py

Qué hace, paso a paso:
  1. DROP SCHEMA public CASCADE  -> elimina TODAS las tablas y datos, incluido el
     control de versiones de alembic.
  2. CREATE SCHEMA public          -> deja el esquema vacío.
  3. flask db upgrade              -> reconstruye el esquema desde las migraciones
     (fuente de verdad = migrations/versions), garantizando que quede idéntico
     al de origin/main (incluye partido_alineaciones, etc.).
  4. Crea un único usuario SUPERADMIN.

ADVERTENCIA: destruye TODOS los datos existentes. Úsalo solo en desarrollo local.
"""
import os
import sys
import traceback

from app import create_app
from app.extensions import db
from app.models.user import User

EMAIL = os.getenv('SUPERADMIN_EMAIL', 'superadmin@demo.com')
PASSWORD = os.getenv('SUPERADMIN_PASSWORD', 'super1234')


def run():
    app = create_app()
    with app.app_context():
        print('[1/4] Vacíando la base de datos (DROP SCHEMA public CASCADE)...')
        db.session.execute(db.text('DROP SCHEMA public CASCADE'))
        db.session.execute(db.text('CREATE SCHEMA public'))
        db.session.execute(db.text('GRANT ALL ON SCHEMA public TO postgres'))
        db.session.execute(db.text('GRANT ALL ON SCHEMA public TO public'))
        db.session.commit()
        print('      Esquema public recreado vacío.')

        print('[2/4] Aplicando migraciones (flask db upgrade)...')
        from flask_migrate import upgrade
        upgrade()
        print('      ✔ Migraciones aplicadas.')

        print('[3/4] Creando el usuario SUPERADMIN...')
        existing = User.query.filter_by(email=EMAIL).first()
        if existing:
            db.session.delete(existing)
            db.session.flush()
        superadmin = User(email=EMAIL, password_hash='', role='SUPERADMIN')
        superadmin.set_password(PASSWORD)
        db.session.add(superadmin)
        db.session.commit()
        print('      ✔ Usuario SUPERADMIN creado.')

        count = User.query.count()
        print('[4/4] Verificación:')
        print(f'      ✔ Usuarios en la base: {count}')
        print(f'      SUPERADMIN: {EMAIL} / {PASSWORD}')


if __name__ == '__main__':
    try:
        run()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
