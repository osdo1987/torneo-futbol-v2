# Manual de despliegue y operación — Torneo Fútbol V2 (VMs Oracle Cloud)

Procedimiento completo para desplegar la app en producción y operar la infraestructura.
Resumen rápido en `AGENTS.md`.

---

## 1. Infraestructura

| VM | Rol | IP pública | IP interna | Usuario | SSH |
|---|---|---|---|---|---|
| **VM App** | Aplica todo: gateway nginx + contenedores de las apps (torneo, e-shop, teams) | `159.54.175.196` | — | `ubuntu` | `vm-app` |
| **VM BD** | PostgreSQL 15 (docker) para todas las apps | `192.9.130.203` | `10.0.0.147` | `ubuntu` | `vm-bd` |

### Claves SSH (locales, NO se suben al repo)

| Destino | Ruta |
|---|---|
| VM App | `C:\Users\USUARIO\Downloads\vm-app\ssh-key-2026-05-11.key` |
| VM BD | `C:\Users\USUARIO\Downloads\vm-bd\ssh-key-2026-05-11.key` |

### Acceso

```bash
# VM App
ssh -i "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" ubuntu@159.54.175.196

# VM BD
ssh -i "C:/Users/USUARIO/Downloads/vm-bd/ssh-key-2026-05-11.key" ubuntu@192.9.130.203
```

> En Windows con Git Bash las rutas con `/` funcionan bien. Si `ssh` pide password a pesar de
> la clave, revisar permisos del `.key` (derecho de solo lectura para el usuario).

---

## 2. Despliegue del torneo (paso a paso)

Flujo: **cambios locales → push a GitHub → pull en la VM → rebuild con compose**.

### 2.1. Preparar los cambios (local)

```bash
cd "C:\personal proyect\torneo-futbol-v2"
git add .
git commit -m "descripción del cambio"
git push origin main
```

> **Importante:** no pushear `.env`, claves SSH ni `*.key`. El `.gitignore` ya los cubre.

### 2.2. Actualizar y desplegar en la VM App

```bash
ssh -i "C:/Users/USUARIO/Downloads/vm-app/ssh-key-2026-05-11.key" ubuntu@159.54.175.196

cd ~/torneo-futbol-v2
git pull origin main

docker compose -f docker-compose.prod.yml up --build -d
```

### 2.3. Verificar

```bash
docker ps | grep torneo
#   torneo_api_prod       torneo-futbol-v2-api        Up X days      5000/tcp
#   torneo_frontend_prod  torneo-futbol-v2-frontend   Up X days      80/tcp
```

- Web pública: `http://torneos.osdosoft.com`
- Swagger de la API: `http://torneos.osdosoft.com/apidocs`
- Salida de la API: `sudo docker logs --tail 100 torneo_api_prod`
- Salud API: `curl http://localhost:5000/health` (dentro de la VM) o prueba un login en `/api/auth/login`.

---

## 3. Detalles del despliegue

### 3.1. Composición (docker-compose.prod.yml)

- **api**: imagen `torneo-futbol-v2-api`, contenedor `torneo_api_prod`, gunicorn en `:5000`.
  - `entrypoint.prod.sh` ejecuta `flask db upgrade` (migraciones automáticas) y `seed.py` solo si `SEED_DEMO=1` (en producción es `0`, por lo que el seed NO corre).
- **frontend**: contenedor `torneo_frontend_prod`, nginx sirviendo `frontend/dist` en `:80`.
  - `frontend/nginx/default.conf` proxya `/api` → `torneo_api_prod:5000`, sirve Swagger `/apidocs` y `/flasgger_static`, límite `10M`.
- **redes**:
  - `torneo-futbol-v2_torneo_network` (interna, entre api y frontend).
  - `osdosoft_public` (externa, requerida para que el gateway alcance el frontend).

### 3.2. Variables de entorno (`.env` de la VM, en `~/torneo-futbol-v2/.env`)

| Variable | Uso | Valor actual (masked) |
|---|---|---|
| `FLASK_APP` | Nombre de la app | `run.py` |
| `FLASK_ENV` | Entorno | `production` |
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://...@10.0.0.147:5432/torneo_futbol` |
| `JWT_SECRET_KEY` | Firma de tokens JWT | (secreto) |
| `SECRET_KEY` | Clave de Flask | (secreto) |
| `SEED_DEMO` | Seed en cada arranque | `0` |

> No confiar valores desde este doc; leerlos desde la VM: `sudo docker inspect torneo_api_prod`.

---

## 4. Base de datos (VM BD)

- Contenedor: `teams_db_prod` (`postgres:15-alpine`), puerto `5432` expuesto en `0.0.0.0`.
- IP interna del host: `10.0.0.147`.
- Base de datos del torneo: **`torneo_futbol`**.

### Acceso dentro de la VM BD

```bash
ssh -i "C:/Users/USUARIO/Downloads/vm-bd/ssh-key-2026-05-11.key" ubuntu@192.9.130.203

sudo docker ps | grep postgres
sudo docker exec -it teams_db_prod psql -U <usuario> -d torneo_futbol
```

### Migraciones

Se aplican solas en cada arranque de la API (`flask db upgrade`). Si se quiere aplicar manualmente:

```bash
# Dentro de la VM App, proyecto torneo
docker compose -f docker-compose.prod.yml exec api flask db upgrade
```

---

## 5. Gateway (nginx) — VM App

- Carpeta: `~/osdosoft-gateway` (`default.conf` + `docker-compose.yml`).
- Contenedor: `osdosoft_gateway` (`nginx:alpine`), puerto `80`, red `osdosoft_public`.
- Reenvío por dominio:

| Dominio | Destino |
|---|---|
| `torneos.osdosoft.com` | `torneo_frontend_prod:80` |
| `e-shop.osdosoft.com` / `eshop.osdosoft.com` | `eshop_frontend_prod:80` |
| `club-manager.osdosoft.com` / `osdosoft.com` | `teams_frontend_prod:80` |

- Si se cambia `default.conf`, reiniciar:
  ```bash
  cd ~/osdosoft-gateway
  docker compose up -d
  docker exec osdosoft_gateway nginx -s reload
  ```

> Para que un dominio apunte a un contenedor, ese contenedor debe estar conectado a `osdosoft_public`.

---

## 6. Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `502 Bad Gateway` en la web | Frontend no alcanzable por el gateway | Verificar que `torneo_frontend_prod` esté en `osdosoft_public` (`docker inspect`). |
| API caída o error | Falla al arrancar (migración/env) | `docker compose ... logs api`; revisar `DATABASE_URL` y JWT/SECRET en `.env`. |
| No se crean tablas | Migración falló en el entrypoint | `flask db upgrade` manual (sección 4). |
| El seed no corre | `SEED_DEMO` en `0` | Valor intencional en producción; el entrypoint solo siembra con `=1`. |
| Contenedor viejo sin cambios nuevos | Rebuild no ejecutado | Re-ejecutar `docker compose -f docker-compose.prod.yml up --build -d`. |

---

## 7. Estado conocido (verificado 14-sep-2026)

- VM App → `origin/main` en commit `b14d730` (sincronizada con el repo remoto).
- Cambios **locales** no commiteados ni pusheados (por lo tanto ausentes en la VM):
  - `frontend/src/pages/RegistroJugador.jsx`
  - `frontend/vite.config.js`
  - Docs y CSVs sin trackear en `docs/` (incluidos `funcionalidades.md`, `deploy-vm.md`, `datos-prueba-manual.md`, etc.)
- Credenciales del SUPERADMIN de producción: `~/torneo-futbol-v2/.superadmin_credentials.txt` en la VM App. **Leer siempre desde la VM**, nunca copiar/commitear el archivo.
- Hay otras apps en la misma VM App (e-shop, teams) con sus propios contenedores; **no tocar** salvo necesidad.

---

## 8. Checklist rápido de despliegue

1. [ ] `git push origin main` desde local.
2. [ ] SSH a VM App.
3. [ ] `cd ~/torneo-futbol-v2 && git pull origin main`.
4. [ ] `docker compose -f docker-compose.prod.yml up --build -d`.
5. [ ] `docker ps | grep torneo` → ambos en `Up`.
6. [ ] Probar `http://torneos.osdosoft.com` y `/apidocs`.