# AGENTS.md — Torneo Fútbol V2

Guía rápida para sesiones futuras. Manual detallado: `docs/deploy-vm.md`.

## Infraestructura (VMs — Oracle Cloud)

| Rol | Host (público) | IP interna | Usuario | Clave SSH (local) |
|---|---|---|---|---|
| **VM App** (docker: gateway + app torneo/eshop/teams) | `159.54.175.196` | — | `ubuntu` | `C:\Users\USUARIO\Downloads\vm-app\ssh-key-2026-05-11.key` |
| **VM Base de datos** (PostgreSQL 15 en docker) | `192.9.130.203` | `10.0.0.147` | `ubuntu` | `C:\Users\USUARIO\Downloads\vm-bd\ssh-key-2026-05-11.key` |

> En el workspace local las claves están en `C:\Users\USUARIO\Downloads\vm-app\` y `C:\Users\USUARIO\Downloads\vm-bd\` (o `vm-bd`). No deben subirse al repositorio.

### Acceso

Ambos hosts ya están en `~/.ssh/known_hosts`: **no** hace falta `-o StrictHostKeyChecking=no`.

```bash
# Forma larga (siempre funciona)
ssh -i "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" ubuntu@159.54.175.196    # VM App
ssh -i "C:/Users/USUARIO/Downloads/vm-bd/ssh-key-2026-05-11.key" ubuntu@192.9.130.203    # VM BD

# Forma corta, si el alias está en ~/.ssh/config  →  ssh vm-app "sudo docker ps"
ssh vm-app
ssh vm-bd
```

Para dejar los alias (una sola vez, fuera del repo):

```bash
cat >> ~/.ssh/config <<'EOF'

Host vm-app
  HostName 159.54.175.196
  User ubuntu
  IdentityFile C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key
  IdentitiesOnly yes

Host vm-bd
  HostName 192.9.130.203
  User ubuntu
  IdentityFile C:/Users/USUARIO/Downloads/vm-bd/ssh-key-2026-05-11.key
  IdentitiesOnly yes
EOF
```

Checklist de conexión (si falla, es esto):

| Requisito | Cómo verificar |
|---|---|
| Las claves existen | `ls "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" "C:/Users/USUARIO/Downloads/vm-bd/ssh-key-2026-05-11.key"` |
| El par coincide con el de la VM | `ssh-keygen -y -f <clave>` y comparar con `~/.ssh/known_hosts` (si cambiaron las claves en la VM hay que borrar la línea del host) |
| Test rápido sin prompts | `ssh -o BatchMode=yes -o ConnectTimeout=15 vm-app "hostname"` → debe imprimir `osdosoft-app-prd` |
| Falta `~/.ssh` | `mkdir -p ~/.ssh` |

Ejecución de un comando remoto (un solo `ssh`, comillas dobles por fuera):

```bash
ssh vm-app "cd ~/torneo-futbol-v2 && git log --oneline -1"
```

### Base de datos (psql) — VM BD

El Postgres corre en docker; **no existe el rol `postgres`**, el usuario real es `teams_user`:

```bash
ssh vm-bd "sudo docker exec teams_db_prod psql -U teams_user -d torneo_futbol -c \"SELECT 1;\""
```

- Contenedor: `teams_db_prod` (postgres:15-alpine), base `torneo_futbol`.
- Socket en la VM, no abierto al host: para tocar la BD hay que entrar por SSH a la VM BD.

## Despliegue en la VM (resumen)

La VM App hace `git pull` desde `origin/main` (GitHub) y levanta con compose:

```bash
ssh vm-app
cd ~/torneo-futbol-v2
git pull origin main                       # 1º empujar los cambios locales a GitHub
docker-compose -f docker-compose.prod.yml up --build -d
docker ps | grep torneo                    # torneo_api_prod + torneo_frontend_prod
```

> **IMPORTANTE**: en la VM el binario es `docker-compose` (standalone v5.1.3). El plugin `docker compose` NO está instalado; usarlo falla con `unknown shorthand flag: 'f' in -f`.

> **IMPORTANTE (build largo)**: el `--build` del frontend tarda ~10-20 min (Vite con 1 GB de RAM) y la sesión SSH se puede caer con `Connection reset by peer` a mitad. El build **sigue adelante en la VM**, así que: relanzalo con `nohup` para que no dependa de la sesión y después consultá el log.
>
> ```bash
> ssh vm-app "cd ~/torneo-futbol-v2 && nohup docker-compose -f docker-compose.prod.yml up --build -d > /tmp/deploy.log 2>&1 & echo lanzado"
> ssh vm-app "tail -20 /tmp/deploy.log"
> ```
>
> Verificar que salió de verdad (no confíes en el exit code):
>
> ```bash
> # 1) el bundle servido tiene el código nuevo y NO el viejo
> ssh vm-app "sudo docker exec torneo_frontend_prod grep -c '<texto nuevo>' /usr/share/nginx/html/assets/index-*.js"
> # 2) el gateway responde
> curl -s -o /dev/null -w '%{http_code}\n' http://torneos.osdosoft.com
> ```

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

## Notas de estado (verificado 26-sep-2026)

- Desplegado en la VM App desde `origin/main` en `450ccd5` (Planilla: buscador con N° al agregar, fix de superposición de tarjetas/T-S, edición de jugador, DT en el diálogo de tarjetas). Bundle servido `index-JDNLLqIe.js`; gateway responde 200 en `torneos.osdosoft.com`.
- **Reloj del daemon de Docker desfasado ~9 h respecto al shell** en la VM App: `docker ps` dice "Up 9 hours" y los `CreatedAt`/`StartedAt` no cuadran con `date`. No confundir eso con un despliegue fallido — verificar el contenido del bundle, no los timestamps.
- **El API no está publicado en el host**: `curl http://localhost:5000` en la VM App da `000` (solo vive en la red `torneo_futbol-v2_torneo_network`). Para probarlo: `http://torneos.osdosoft.com/api/...` (pide token) o `docker logs torneo_api_prod`. El contenedor tampoco trae `curl`.
- `frontend/Dockerfile` fija `NODE_OPTIONS=--max-old-space-size=2048` (build de Vite moría en la VM por RAM); no quitar.
- Credenciales del SUPERADMIN de producción en la VM: `~/torneo-futbol-v2/.superadmin_credentials.txt` (no confiar valor; siempre leer desde la VM, no copiar a `/hipocrita`). No commitear nunca este archivo (¡está sin trackear en la VM!).
- **Fixture automático** (sep-2026): `POST /api/torneos/<id>/fixture` acepta además `programacion: {fecha_inicio: 'YYYY-MM-DD', hora_inicio: 'HH:MM', dias_entre_jornadas, horas_entre_partidos}` para crear los partidos ya programados (jornada +N días, partido +M horas). Body `{}` conserva el comportamiento sin fechas (lo usan `Torneos.jsx` y los seeds). La UI vive en **Partidos → «Generar Fixture»** (diálogo con resumen de equipos/jornadas y previsualización del rango de fechas).
- **Resultados cargados a mano por BD** (no hay eventos `GOL`): p. ej. partido 15 "Parceiros 2-2 Real Lucre" (jornada 2, Hexagonal Comfenalco 2026) con `resultado='EMPATE'` pero sin goleadores. `PUT /api/partidos/<id>/resultado` rechaza partidos ya finalizados, así que para corregir hay que `UPDATE partidos SET resultado='PENDIENTE'` primero.

## Comandos útiles

Usan los alias `vm-app` / `vm-bd`. Si `ssh vm-app` responde `Could not resolve hostname`, el alias no está en `~/.ssh/config`: o se crea (ver **Acceso**) o se reemplaza por la forma larga con `-i`.

```bash
# Ver estado del contenedor
ssh vm-app "sudo docker ps | grep torneo"

# Logs de la API
ssh vm-app "sudo docker logs --tail 100 torneo_api_prod"

# Reiniciar solo la API
ssh vm-app "cd ~/torneo-futbol-v2 && docker-compose -f docker-compose.prod.yml restart api"
```
