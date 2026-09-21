#!/bin/bash
set -e

echo "Running database migrations..."
python -m flask db upgrade || echo "WARNING: Migration skipped (tables already created by seed)"

if [ "$SEED_DEMO" = "1" ]; then
  echo "Running demo seed..."
  python seed.py
fi

echo "Starting application with gunicorn..."
# Worker class gthread: cada request corre en un thread del pool, de modo que las
# conexiones SSE de larga duración (/api/partidos/<id>/stream) NO bloquean el
# heartbeat del worker (con workers sync, cada stream clavaba al worker hasta el
# WORKER TIMEOUT de 120s, matándolo en bucle y dejando la API congelada).
exec gunicorn --bind 0.0.0.0:5000 \
    --worker-class gthread \
    --workers 2 --threads 8 \
    --timeout 120 --graceful-timeout 30 \
    --worker-tmp-dir /dev/shm \
    run:app