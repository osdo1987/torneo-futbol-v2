# Torneo Futbol V2

Plataforma de gestión de **torneos de fútbol**, reescrita con la misma arquitectura y stack de **e-shop**:
backend **Flask + PostgreSQL** y frontend **React + Vite**. La app original era **Spring Boot (Java)**;
esta versión la reemplaza por completo manteniendo el mismo dominio de negocio.

## Stack

### Backend
- **Python 3.11** + **Flask 3.0**
- **PostgreSQL 15** + SQLAlchemy (ORM)
- **Flask-Migrate / Alembic** para migraciones
- **Flask-JWT-Extended** (autenticación JWT, 24h)
- **Marshmallow** para schemas/serialización
- **Flasgger** (Swagger UI en `/apidocs`)

### Frontend
- **React 19** + **Vite**
- **Material UI (MUI)** — temas light/dark
- **React Router DOM**
- **TanStack Query** para data fetching

## Estructura del frontend

```
frontend/
├── src/
│   ├── App.jsx              # Rutas + sesión + torneo seleccionado
│   ├── main.jsx             # Providers (Theme, Query, Router, Toast)
│   ├── theme.js             # Temas light/dark
│   ├── api.js               # Cliente fetch con token JWT
│   ├── components/
│   │   ├── AdminLayout.jsx  # Sidebar / menu por rol
│   │   └── Toast.jsx
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── Torneos.jsx      # CRUD + ciclo de estados
│       ├── Equipos.jsx      # Equipos + jugadores
│       ├── Partidos.jsx     # Programar + resultados
│       ├── Tabla.jsx        # Posiciones
│       ├── Estadisticas.jsx # Goleadores
│       ├── SuperAdmin.jsx   # Gestionar organizadores
│       └── Config.jsx       # Tema / cuenta
```

## Estructura

```
torneo-futbol-v2/
├── app/
│   ├── __init__.py          # create_app() factory
│   ├── config.py            # Configuración
│   ├── extensions.py        # db, migrate, jwt, ma, bcrypt, swagger, cors
│   ├── models/              # Modelos SQLAlchemy
│   │   ├── organizador.py   # Tenant (≈ Store en e-shop)
│   │   ├── user.py          # Roles: SUPERADMIN / ORGANIZADOR / STAFF
│   │   ├── torneo.py        # Estados del torneo
│   │   ├── fase.py          # GRUPOS / ELIMINATORIA / ROUND_ROBIN
│   │   ├── equipo.py, jugador.py
│   │   ├── partido.py
│   │   └── evento_partido.py
│   ├── routes/              # Blueprints REST
│   ├── schemas/             # Marshmallow
│   └── services/            # Lógica de negocio
├── migrations/              # Flask-Migrate / Alembic
├── seed.py                  # Datos de ejemplo
├── run.py, requirements.txt, Dockerfile, docker-compose.yml
```

## Instalación

### 1. Configurar `.env`
```bash
cp .env.example .env
```

### 2. Con Docker
```bash
docker-compose up -d
# backend: http://localhost:5000  (Swagger: /apidocs)
# PostgreSQL: localhost:5432
```

### 3. Backend manual
```bash
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
flask db upgrade                 # aplicar migraciones
python seed.py                   # datos de ejemplo
python run.py                    # http://localhost:5000
```

### 4. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

- El dev server hace **proxy** de `/api` → `http://localhost:5000` (configurado en `vite.config.js`), así que no hace falta CORS en desarrollo.
- Si el backend corre en otro host/puerto, define `VITE_API_URL` en `frontend/.env.local` (ej.: `VITE_API_URL=http://localhost:5000/api`).
- Build de producción: `npm run build` (salida en `frontend/dist/`) y `npm run preview` para servirla.

## Credenciales de prueba (tras `seed.py`)

| Rol | Email | Contraseña |
|---|---|---|
| SUPERADMIN | `superadmin@demo.com` | `super1234` |
| ORGANIZADOR | `manager@demo.com` | `manager123` |

El seed crea el organizador **Liga Osdosoft FC** con 2 torneos (*Copa Osdosoft 2026* — EN_JUEGO con equipos, jugadores y partidos; *Copa Primavera 2026* — INSCRIPCIONES_ABIERTAS).

## Frontend: páginas principales

- **Login** — autenticación JWT (token en `localStorage`, interceptor 401 → logout).
- **Dashboard** — resumen del torneo seleccionado (equipos, partidos, goles).
- **Torneos** — CRUD + ciclo de estados (`CREADO → INSCRIPCIONES_ABIERTAS → EN_JUEGO → FINALIZADO`).
- **Equipos / Jugadores** — alta, edición, baja y liberación de jugadores con límite por equipo.
- **Partidos** — programación (jornada/fecha), aplazamientos y carga de resultados/marcador.
- **Tabla** — posiciones calculadas con los puntos configurados del torneo.
- **Estadísticas** — tabla de goleadores desde eventos GOL.
- **SuperAdmin** — gestión de organizadores (solo rol SUPERADMIN).
- **Config** — tema light/dark y cuenta.

El menú lateral (`AdminLayout`) se adapta al rol del usuario autenticado.

## Roles

- **SUPERADMIN**: crea organizadores y usuarios ORGANIZADOR.
- **ORGANIZADOR**: gestiona sus torneos, equipos, jugadores y partidos (tenant).
- **STAFF**: miembros del organizador con acceso a sus datos.

## Endpoints principales

- `POST /api/auth/login`
- `POST /api/auth/register-organizador` (SUPERADMIN)
- `GET/POST/PUT/DELETE /api/organizadores`
- `GET/POST/PUT/DELETE /api/torneos` y `POST /api/torneos/<id>/estado`
- `GET/POST/PUT/DELETE /api/equipos` y `/api/equipos/<id>/jugadores`
- `GET/POST/PUT/DELETE /api/jugadores` y `POST /api/jugadores/<id>/liberar`
- `GET/POST /api/partidos`, `POST /api/partidos/<id>/programar|aplazar|resultado|marcador`
- `GET/POST /api/fases`
- `GET/POST /api/eventos`
- `GET /api/panel/<torneo_id>/tabla|goleadores|resumen`

Toda la documentación interactiva está disponible en `/apidocs`.