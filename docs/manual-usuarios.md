# Manual del Usuario — Torneo Fútbol V2

Plataforma multi-tenant de gestión de torneos de fútbol (Flask + React).

Este manual explica los dos conceptos fundamentales de la aplicación: **Autenticación y Roles** (el "quién eres" y "qué puedes hacer") y **Organizadores** (el "qué gestionas"). Entender la diferencia entre ambos es clave para usar la plataforma y para planificar nuevas funcionalidades.

---

## 1. Concepto general

La plataforma permite que **múltiples ligas o canchas** gestionen sus torneos de forma independiente, desde la misma instalación.

A cada liga/cancha se la llama **Organizador** (tenant). Cada organizador tiene:
- Su propio login y usuarios (ORGANIZADOR y STAFF).
- Sus propios torneos, equipos, jugadores, partidos y estadísticas (**aislados** de los demás).
- Su branding y su landing pública.

Por encima de todos los organizadores está el **SUPERADMIN**, que administra la plataforma completa.

```
SUPERADMIN
 ├── Organizador A (Liga Cancha Central)
 │    ├── Usuario ORGANIZADOR (manager@...)
 │    ├── Usuario STAFF
 │    └── Torneos, equipos, partidos...
 ├── Organizador B (Liga Osdosoft FC)
 │    ├── Usuario ORGANIZADOR (manager2@...)
 │    └── Torneos, equipos, partidos...
 └── Organizador C ...
```

---

## 2. Autenticación y Roles (Auth/Roles)

### 2.1. ¿Qué es?

El sistema de **autenticación y roles** define **quién eres** y **qué puedes hacer** dentro de la plataforma:

- **Autenticación**: login con email + contraseña → se emite un **token JWT** válido por 24 horas.
- **Autorización**: cada petición valida el token y comprueba el **rol** del usuario para permitir o denegar la acción.

### 2.2. Los 6 roles

| Rol | Alcance | Puede hacer |
|---|---|---|
| **SUPERADMIN** | Toda la plataforma | Gestionar organizadores (crear/editar/eliminar), ver todos los torneos, gestionar torneos de cualquier organizador, configurar landings y gestionar usuarios de cualquier tenant |
| **ORGANIZADOR** | Su propio tenant (dueño) | Todo el manejo del tenant: torneos, equipos, jugadores, partidos, planilla, estadísticas, landing y la gestión de usuarios y roles desde **Usuarios** (crear/cambiar rol/restablecer clave/eliminar) |
| **ADMIN** | Su propio tenant (co-gestor) | Igual manejo de datos que ORGANIZADOR, más la gestión de usuarios **STAFF / Árbitro / Delegado**. No puede crear ni tocar cuentas ORGANIZADOR, otros ADMIN ni SUPERADMIN |
| **STAFF** | Su propio tenant | Colaborador con gestión completa de datos (sin gestión de usuarios) |
| **REFEREE** | Su propio tenant (solo planilla) | Árbitro: opera únicamente en la **planilla de juego** (anotaciones de goles, tarjetas, cambios, cronómetro y finalización del partido) |
| **DELEGADO** | Su propio equipo | Mesero: carga la **alineación** (convocatoria, titulares, números) de los partidos de su equipo. Ve sus partidos, posiciones y estadísticas. No anota ni homologuea |

### 2.3. Cómo se aplica en la práctica

- **Frontend**: la interfaz decide qué mostrar según `user.role`. Ejemplo: solo `SUPERADMIN` ve la sección **Organizadores**; los demás ven sus torneos.
- **Backend**: cada endpoint está protegido con decoradores de autorización:
  - `@require_roles('SUPERADMIN')` → solo SuperAdmin.
  - `@require_roles('SUPERADMIN', 'ORGANIZADOR')` → SuperAdmin u Organizador.
  - `ensure_organizador()` → valida que un usuario NO superadmin solo acceda a datos de **su** organizador.

### 2.4. Usuarios de ejemplo (seed)

| Email | Contraseña | Rol |
|---|---|---|
| `superadmin@demo.com` | `super1234` | SUPERADMIN |
| `manager@demo.com` | `manager123` | ORGANIZADOR (Liga Osdosoft FC) |
| `admin@demo.com` | `admin123` | ADMIN (Liga Osdosoft FC) |
| `staff@demo.com` | `staff123` | STAFF (Liga Osdosoft FC) |
| `referee@demo.com` | `referee123` | REFEREE (Liga Osdosoft FC) |
| `delegado@demo.com` | `delegado123` | DELEGADO del equipo Leones |

---

## 3. Organizadores (tenants)

### 3.1. ¿Qué es?

Un **Organizador** es una entidad de negocio: una liga, cancha o comunidad que organiza torneos. Es el "espacio de trabajo" que agrupa todos sus datos.

### 3.2. Datos que tiene un organizador

| Campo | Descripción |
|---|---|
| `name` | Nombre de la liga/cancha |
| `slug` | Identificador único para la URL pública de su landing (ej. `liga-osdosoft`) |
| `whatsapp` | Número de contacto |
| `address` | Dirección de la cancha |
| `description` | Descripción corta |
| `primary_color` | Color principal de la landing |
| `welcome_message` | Mensaje de bienvenida |

### 3.3. Quién los gestiona

Solo el **SUPERADMIN** puede **crear, editar y eliminar** organizadores (endpoints en `/api/organizadores`). El SUPERADMIN no pertenece a ningún organizador; los administra a todos.

### 3.4. Relación organizador ↔ usuario

- Al **crear un organizador** se crea automáticamente su usuario **ORGANIZADOR** (login propio con su email y contraseña).
- El **ORGANIZADOR** (y el **SUPERADMIN**) gestionan los usuarios del tenant desde la sección **Usuarios**: crean cuentas con rol `ORGANIZADOR` (co-dueños), `ADMIN`, `STAFF`, `REFEREE` o `DELEGADO`, cambian roles, restablecen contraseñas y eliminan accesos (`/api/auth/users*`).
- El **ADMIN** gestiona solo STAFF / Árbitro / Delegado; no puede tocar cuentas de Organizador, otros Admin ni Super Admin.
- Crear un **DELEGADO** exige asignarle su `equipo_id` (se elige en la pantalla Usuarios).
- Cada usuario (ORGANIZADOR, ADMIN, STAFF, REFEREE o DELEGADO) tiene `organizador_id` → pertenece a un único organizador.

### 3.5. Aislamiento de datos

Cada organizador solo ve y opera sobre **sus propios** datos:
- Torneos, equipos, jugadores, partidos, eventos y estadísticas.
- Su landing page configurable (pública, sin login, bajo su `slug`).

Un ORGANIZADOR no puede ver ni modificar los datos de otro organizador (la autorización lo bloquea en backend).

---

## 4. Diferencia clave entre Auth/Roles y Organizadores

| Aspecto | Auth / Roles | Organizadores |
|---|---|---|
| **Es** | Mecanismo de acceso y permisos | Entidad de negocio (tenant) |
| **Responde a** | ¿Quién eres y qué puedes hacer? | ¿Qué gestionas? |
| **Se aplica** | De forma transversal en toda la app | De forma específica a cada tenant |
| **Se gestiona** | Login, token JWT, decoradores de rol | Sólo SUPERADMIN (CRUD) |
| **Datos** | Roles: SUPERADMIN, ORGANIZADOR, STAFF | Nombre, slug, branding, contacto, torneos |
| **Analogía** | La llave y la cerradura | Las puertas que abre la llave |
| **Ejemplo** | Un ORGANIZADOR no puede eliminar otro organizador | La "Liga Cancha Central" tiene su propio login y sus torneos |

**Regla de oro:** *los roles deciden si puedes entrar y qué puedo tocar; el organizador decide qué trozo de datos es tuyo.*

---

## 5. Ejemplos prácticos

1. **El SUPERADMIN crea una liga nueva**: entra, va a *Organizadores*, crea "Liga Cancha Central" (con slug `cancha-central`) y el sistema genera el login del ORGANIZADOR (`manager@canchacentral.com`). Ese manager ya puede crear torneos en su liga.
2. **El manager invita a un STAFF**: desde su sesión, crea un usuario STAFF que podrá cargar partidos y resultados de su liga — pero no verá el resto.
3. **Un ORGANIZADOR intenta ver torneos de otra liga**: el backend lo rechaza (los torneos están filtrados por `organizador_id`).

---

## 6. Preguntas frecuentes

**¿El SUPERADMIN tiene organizador?**
No. Es dueño de la plataforma y no está limitado a ningún tenant.

**¿Puede un ORGANIZADOR crear otro organizador?**
No. Solo el SUPERADMIN.

**¿Los torneos de una liga son visibles para otra?**
No. Están aislados por organización.

**¿Dónde entra la gente que solo ve resultados?**
En la landing pública de cada organizador (`/l/{slug}`), que no requiere login.

---

## 7. Notas de desarrollo (para planificar nuevas funcionalidades)

- Nuevas funcionalidades sobre *permisos* se agregan en `app/routes/_authz.py` y con decoradores `@require_roles`.
- Nuevos *tipos de tenant* o campos del organizador: modelos en `app/models/organizador.py` + migración Alembic.
- La gestión de usuarios y roles vive en `app/services/auth_service.py` y `app/routes/auth_routes.py` (`/api/auth/users*`), con pantalla en `frontend/src/pages/Usuarios.jsx`.
- La jerarquía de permisos se apoya en `app/routes/_authz.py`: `MANAGEMENT_ROLES` (SUPERADMIN, ORGANIZADOR, ADMIN, STAFF) gobierna las escrituras organizacionales; `ensure_planilla_role()` permite anotar a REFEREE y gestión; `ensure_delegado_equipo()` limita las alineaciones al equipo del DELEGADO (`users.equipo_id`).
- El rol ADMIN se define por restricciones en `AuthService` (`ADMIN_MANAGEABLE_ROLES` = STAFF/REFEREE/DELEGADO) y por frontend (`Usuarios.jsx` limita sus selecciones). El DELEGADO edita su alineación desde `frontend/src/pages/MiEquipo.jsx`.
- El flujo de **reset de contraseña** tiene los campos en el modelo `User` (`reset_token`, `reset_token_expiry`) pero no tiene endpoints ni pantalla: también es candidato.