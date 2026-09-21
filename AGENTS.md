# AGENTS.md — Torneo Fútbol V2

Guía rápida para sesiones futuras. Manual detallado: `docs/deploy-vm.md`.

## Infraestructura (VMs — Oracle Cloud)

| Rol | Host (público) | IP interna | Usuario | Clave SSH (local) |
|---|---|---|---|---|
| **VM App** (docker: gateway + app torneo/eshop/teams) | `159.54.175.196` | — | `ubuntu` | `C:\Users\USUARIO\Downloads\vm-app\ssh-key-2026-05-11.key` |
| **VM Base de datos** (PostgreSQL 15 en docker) | `192.9.130.203` | `10.0.0.147` | `ubuntu` | `C:\Users\USUARIO\Downloads\vm-bd\ssh-key-2026-05-11.key` |

> En el workspace local las claves están en `C:\Users\USUARIO\Downloads\vm-app\` y `C:\Users\USUARIO\Downloads\vm-bd\` (o `vm-bd`). No deben subirse al repositorio.

### Acceso
```bash
ssh -i "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" ubuntu@159.54.175.196     # VM App
ssh -i "C:/Users/USUARIO/Downloads/vm-bd/ssh-key-2026-05-11.key" ubuntu@192.9.130.203     # VM BD
```

## Despliegue en la VM (resumen)

La VM App hace `git pull` desde `origin/main` (GitHub) y levanta con compose:

```bash
ssh -i "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" ubuntu@159.54.175.196
cd ~/torneo-futbol-v2
git pull origin main                       # 1º empujar los cambios locales a GitHub
docker-compose -f docker-compose.prod.yml up --build -d
docker ps | grep torneo                    # torneo_api_prod + torneo_frontend_prod
```

> **IMPORTANTE**: en la VM el binario es `docker-compose` (standalone v5.1.3). El plugin `docker compose` NO está instalado; usarlo falla con `unknown shorthand flag: 'f' in -f`.

- Proyecto compose: `torneo-futbol-v2` (raíz `~/torneo-futbol-v2`). Red interna `torneo-futbol-v2_torneo_network`.
- Contenedores: `torneo_api_prod` (gunicorn :5000), `torneo_frontend_prod` (nginx :80).
- `entrypoint.prod.sh` corre `flask db upgrade` y `seed.py` solo si `SEED_DEMO=1` (actualmente `0`).
- Env vars requeridas (definidas en `.env` de la VM): `DATABASE_URL`, `JWT_SECRET_KEY`, `SECRET_KEY`, `FLASK_ENV=production`, `SEED_DEMO`, `FLASK_APP=run.py`.
- DB: `DATABASE_URL=postgresql://…@10.0.0.147:5432/torneo_futbol` (VM BD, contenedor `teams_db_prod` postgres:15-alpine).
- **Build del frontend en la VM**: la VM tiene ~1 GB de RAM y el build de Vite puede morir con `Reached heap limit`. `frontend/Dockerfile` fija `NODE_OPTIONS=--max-old-space-size=2048` (usa swap). No quitar esa línea.

## Gateway (nginx) en la VM App

- Carpeta `~/osdosoft-gateway` (`default.conf` + `docker-compose.yml`).
- Contenedor `osdosoft_gateway` (nginx:alpine), puerto `80`, red `osdosoft_public`.
- Reenvío por dominio (`server_name`):
  - `torneos.osdosoft.com` → `torneo_frontend_prod:80`
  - `e-shop.osdosoft.com` / `eshop.osdosoft.com` → `eshop_frontend_prod:80`
  - `club-manager.osdosoft.com` / `osdosoft.com` → `teams_frontend_prod:80`
- Los frontends deben estar en la red externa `osdosoft_public` para ser alcanzados por el gateway.
- URL pública del torneo: `http://torneos.osdosoft.com` (Swagger en `/apidocs`).

## Notas de estado (verificado 15-sep-2026)

- Desplegado en la VM App desde `origin/main` en `ff1ca66` (Dashboard, Equipos c/grilla+drawer, Torneos, Partidos, Planilla, tema). Gateway responde 200 en `torneos.osdosoft.com` y `/apidocs`.
- `frontend/Dockerfile` fija `NODE_OPTIONS=--max-old-space-size=2048` (build de Vite moría en la VM por RAM); no quitar.
- Credenciales del SUPERADMIN de producción en la VM: `~/torneo-futbol-v2/.superadmin_credentials.txt` (no confiar valor; siempre leer desde la VM, no copiar a `/hipocrita`). No commitear nunca este archivo (¡está sin trackear en la VM!).
- **Fixture automático** (sep-2026): `POST /api/torneos/<id>/fixture` acepta además `programacion: {fecha_inicio: 'YYYY-MM-DD', hora_inicio: 'HH:MM', dias_entre_jornadas, horas_entre_partidos}` para crear los partidos ya programados (jornada +N días, partido +M horas). Body `{}` conserva el comportamiento sin fechas (lo usan `Torneos.jsx` y los seeds). La UI vive en **Partidos → «Generar Fixture»** (diálogo con resumen de equipos/jornadas y previsualización del rango de fechas).

## Comandos útiles

```bash
# Ver estado del contenedor
ssh -i "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" ubuntu@159.54.175.196 "sudo docker ps | grep torneo"

# Logs de la API
… "sudo docker logs --tail 100 torneo_api_prod"

# Reiniciar solo la API
… "cd ~/torneo-futbol-v2 && docker-compose -f docker-compose.prod.yml restart api"
```