# Funcionalidades de la App — Torneo Fútbol V2

Plataforma **multi-tenant** de gestión de torneos de fútbol: backend **Flask + PostgreSQL**, frontend **React + Vite + Material UI**.

---

## 1. Arquitectura general

```
SUPERADMIN
 ├── Organizador A (Liga/Cancha A)
 │    ├── Usuario ORGANIZADOR
 │    ├── Usuario STAFF
 │    └── Torneos, equipos, jugadores, partidos...
 ├── Organizador B
 │    └── ...
 └── ...
```

- **Organizador** = liga/cancha (tenant) que gestiona sus propios datos de forma **aislada**.
- **SUPERADMIN** administra toda la plataforma y los organizadores.
- Cada organizador tiene su **landing pública** configurable (`/l/{slug}`) y su **login propio**.

---

## 2. Roles y permisos

| Rol | Alcance | Funcionalidades |
|---|---|---|
| **SUPERADMIN** | Toda la plataforma | Crear/editar/eliminar organizadores, ver torneos de todos, configurar landings |
| **ORGANIZADOR** | Su tenant | Gestionar torneos, equipos, jugadores, partidos, estadísticas, landing. Crear usuarios STAFF |
| **STAFF** | Su tenant (limitado) | Registrar partidos, eventos y resultados (soporte backend; sin UI diferenciada aún) |

- Autenticación: login con email + contraseña → token **JWT** de 24 h.
- El menú lateral se adapta al rol del usuario autenticado.

---

## 3. Módulo de Autenticación

- `POST /api/auth/login` — inicio de sesión (email + contraseña).
- `POST /api/auth/register-organizador` — criação de organizador + usuario ORGANIZADOR (solo SUPERADMIN).
- `POST /api/auth/register-staff` — creación de usuario STAFF dentro del organizador.
- `GET /api/auth/me` — datos del usuario autenticado.
- Manejo de sesión en `localStorage` (token + usuario), auto-logout ante errores 401.
- Interceptor de respuestas: si el token expira se cierra la sesión automáticamente.

---

## 4. Gestión de Organizadores (tenants) — SuperAdmin

- **CRUD completo** de organizadores: nombre, slug (URL), WhatsApp, dirección, descripción, color principal, mensaje de bienvenida, logo.
- Al crear un organizador se crea **automáticamente su usuario ORGANIZADOR**.
- El slug genera la URL pública de la landing: `{origin}/l/{slug}`.
- Borrado en cascada de todos los datos asociados (usuarios, torneos, equipos...).
- Vista de torneos de cada organizador con enlace directo y copia de URL.

---

## 5. Gestión de Torneos

### 5.1. CRUD y ciclo de vida

- Crear torneo: nombre, máx. jugadores por equipo (default 18), puntos de victoria/empate/derrota (3/1/0).
- Editar y eliminar torneo.
- **Máquina de estados** (`POST /torneos/{id}/estado`):

```
CREADO → INSCRIPCIONES_ABIERTAS → INSCRIPCIONES_CERRADAS → SORTEADO → EN_JUEGO → FINALIZADO
              (se puede reabrir)              ↕            (Iniciar)
```

### 5.2. Reglamento configurable (`PUT /torneos/{id}/reglas`)

- **Formato**: ROUND_ROBIN (todos contra todos) o ELIMINATORIA.
- **Rondas**: 1 (ida) o 2 (ida y vuelta).
- **Clasifican a final**: número de equipos que pasan a la fase final (2–4).
- **Desempates** (orden configurables): diferencia de gol, goles a favor, menos amarillas, menos rojas, goles en contra.
- **Categoría por edades**: edad mínima/máxima.
- **Plantilla**: máx. jugadores, **comodines** (cantidad y edad mínima), "no permitir baja tras jugar".
- **Inasistencia (W)**: tolerancia en minutos y **marcador por W**.
- **Sanciones**: fechas por doble amarilla y por roja directa.

### 5.3. Generación de fixture (`POST /torneos/{id}/fixture`)

- Fixture automático **todos-contra-todos** (método del círculo) en jornadas.
- 1 o 2 rondas según reglas; opción de `reemplazar=true` para regenerar.
- Requiere al menos 3 equipos; bloqueado si ya hay partidos jugados.

### 5.4. Fase final (`POST /torneos/{id}/fase-final`)

- Clasifica los primeros **N** (según reglas) y crea los cruces de semifinales/final (ELIMINATORIA).
- Requiere que ya haya suficientes partidos jugados.

---

## 6. Equipos y Jugadores

### 6.1. Equipos

- **CRUD de equipos** (solo con inscripciones abiertas/creado): nombre, email y documento del delegado.
- Listado de jugadores por equipo y por torneo.
- **Link público de inscripción de jugadores** (`POST /equipos/{id}/link`): genera un token único que apunta a `{origin}/r/{slug}`.

### 6.2. Jugadores

- **CRUD de jugadores** con perfil deportivo completo:
  - Datos básicos: nombre, Nº camiseta, documento de identidad, activo.
  - Datos deportivos: posición (Arquero/Defensor/Centrocampista/Delantero), fecha de nacimiento, teléfono, pierna hábil, altura.
  - Datos médicos: tipo de sangre, EPS, contacto de emergencia, alergias.
  - **Foto de jugador** (PNG/JPG/WebP, base64 hasta 1 MB).
- **Reglas de inscripción validadas** en backend:
  - Cupo máximo por equipo (regla del torneo).
  - No duplicados por documento en el mismo equipo.
  - Categoría por edad (edad mín/máx) y comodines con límite.
- **Liberar jugador** (baja lógica, `activo=false`); bloqueado si ya jugó y la regla lo impide.
- **Importación masiva de plantillas** (`POST /equipos/{id}/jugadores/importar`): carga Excel/CSV con mapeo inteligente de encabezados, fechas y alias; reporte de creados y errores por fila.
- **Carnet de jugador**: componente que genera un carnet tipo tarjeta CR80 (85,6 × 53,98 mm) con **impresión** y **descarga PDF/PNG**.

---

## 7. Inscripción pública de jugadores (`/r/:slug`)

- Página pública (sin login) alcanzada desde el link del equipo.
- Muestra información del equipo/torneo y el **cupo disponible**.
- Formulario de auto-registro del jugador (perfil completo + foto).
- Validaciones del reglamento (cupo, documento duplicado, edad/comodines) aplicadas también aquí.
- Pantalla de éxito con **"Ver mi carnet"**, "Registrar otro jugador" e "Ir al panel".

---

## 8. Partidos

### 8.1. Programación y resultados

- Crear partido (local, visitante, jornada).
- **Programar** fecha/hora (`datetime`).
- **Aplazar** (estado POSTERGADO) y reprogramar.
- **Registrar resultado** (goles local/visitante → LOCAL_GANO / VISITANTE_GANO / EMPATE).
- **Walkover (W)** por inasistencia: gana el bando presente con **marcador configurable** del reglamento (W_LOCAL / W_VISITANTE).

### 8.2. Alineaciones

- **Convocar jugadores** al partido (titular/suplente), Nº de camiseta con **validación de duplicados**.
- Máximo 11 titulares.
- **Formación táctica**: posiciones POR/DEF/MED/DEL/OTROS con orden, editable por **drag & drop** sobre una cancha.
- Solo editable mientras el partido está PENDIENTE.

### 8.3. Eventos del partido

- Tipos: **GOL, AUTOGOL, TARJETA_AMARILLA, TARJETA_ROJA, CAMBIO**.
- Cada evento con minuto y descripción.
- Lógica de **cambios**: jugador que sale y entra (mismo equipo), no se permite cambio de expulsados.
- **Expulsados automáticos**: 2 amarillas o roja directa → fuera del partido.

### 8.4. Partido en vivo

- **Cronómetro** (máx 90:00), iniciar/reanudar/pausar/reiniciar, sincronizado con el backend (`en_vivo`).
- **Marcador en tiempo real** actualizado desde los eventos GOL/AUTOGOL.
- Estado público consultable por la landing sin login.

---

## 9. Planilla de juego (módulo Planilla)

Registro **minuto a minuto** del partido:

- Selector de partido y marcador grande estilo TV.
- Cronómetro en vivo con publicación a la landing.
- Botones rápidos por equipo: GOL, TARJETA, CAMBIO.
- Alineación en vista **Lista** o **Formación** (cancha con filas tácticas).
- Registro de acciones con hora automática (derivada del cronómetro).
- Panel "Anular último gol", cambios realizados y **resumen cronológico** del partido con color por tipo.
- **Finalizar partido** fija el resultado con el marcador actual y pasa a modo solo lectura.

---

## 10. Panel de estadísticas

### 10.1. Tabla de posiciones (`/panel/{id}/tabla`)

- PJ, PG, PE, PP, GF, GC, DF, TA, TR, PTS (puntos configurables del torneo).
- Orden por puntos y **criterios de desempate del reglamento**.
- Marcado `clasifica` para los equipos que entran a la fase final (fila verde).

### 10.2. Goleadores (`/panel/{id}/goleadores`)

- Ranking de goleadores desde eventos GOL (top por defecto 10).

### 10.3. Sanciones (`/panel/{id}/sanciones`)

- **Acumulación de tarjetas** por jugador y equipo.
- **Suspensiones automáticas**: cada 2 amarillas → N fechas; cada roja directa → N fechas (N configurable).
- Muestra "Suspendido hasta la jornada N" / "Disponible".

### 10.4. Resumen (`/panel/{id}/resumen`)

- Cantidad de equipos, partidos, partidos jugados, líder/goleador.
- KPIs del dashboard y de la landing.

---

## 11. Landing pública (`/l/{slug}`)

### 11.1. Configuración (organizador)

Editor completo de la landing (`/landing`):

- **Identidad**: nombre, slug, mensaje de bienvenida, color principal, logo, WhatsApp, descripción, dirección.
- **Hero/Banner**: título, subtítulo, imagen.
- **Nosotros**: título, texto, imagen.
- **Servicios/Features**: lista dinámica (icono, título, descripción).
- **Galería**: lista dinámica de imágenes con leyenda.
- **Contacto**: email, teléfono, dirección.
- **Redes sociales**: Facebook, Instagram, WhatsApp, Twitter/X, YouTube, texto de footer.
- **Visibilidad**: mostrar/ocultar cada sección y el botón "Registrarse".
- **Subida de imágenes** (hasta 5 MB; png/jpg/jpeg/gif/webp/svg), con copiado de URL.

### 11.2. Vista pública

Sitio estilo TV premium (tema oscuro) **sin necesidad de login**:

- Header con logo, nombre, insignia "En vivo" cuando el torneo está EN_JUEGO.
- Selector de torneos.
- **Partido destacado**: partido en vivo (marcador y minuto), próximo o último resultado.
- Pestañas: **Resultados, Posiciones, Estadísticas, Calendario** (agrupadas por jornada o fecha).
- **Posiciones** con zonas de color: clasificación directa (verde), play-offs (amarillo), eliminados (rojo).
- **Estadísticas**: KPIs globales, Goleadores (top con barras) y Sanciones.
- Diálogo de **formación y cambios** por partido (cancha con filas tácticas y badge de formación como "4-3-3").
- Auto-refresco del partido en vivo cada pocos segundos.
- Favoritos de grupos/partidos guardados en localStorage.

---

## 12. Configuración de cuenta

- **Modo oscuro/claro** persistido en localStorage.
- Info de cuenta: email, rol, organizador.
- Cierre de sesión.

---

## 13. Endpoints principales (resumen)

| Recurso | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/register-organizador`, `POST /auth/register-staff`, `GET /auth/me` |
| Organizadores | `GET/POST /organizadores`, `GET/PUT/DELETE /organizadores/{id}` |
| Torneos | `GET/POST /torneos`, `GET/PUT/DELETE /torneos/{id}`, `POST /torneos/{id}/estado`, `PUT /torneos/{id}/reglas`, `POST /torneos/{id}/fixture`, `POST /torneos/{id}/fase-final`, `GET /torneos/{id}/equipos\|partidos\|fases` |
| Equipos | `GET/POST /equipos`, `GET/PUT/DELETE /equipos/{id}`, `GET /equipos/{id}/jugadores`, `POST /equipos/{id}/link`, `POST /equipos/{id}/jugadores/importar` |
| Jugadores | `GET/POST /jugadores`, `GET/PUT/DELETE /jugadores/{id}`, `POST /jugadores/{id}/foto`, `POST /jugadores/{id}/liberar` |
| Partidos | `GET/POST /partidos`, `GET /partidos/{id}`, `POST /partidos/{id}/programar\|aplazar\|resultado\|marcador\|w`, `GET/POST /partidos/{id}/alineacion`, `DELETE /partidos/{id}/alineacion/{jugador}`, `POST /partidos/{id}/alineacion/orden`, `GET/POST /partidos/{id}/en_vivo` |
| Fases | `GET/POST /fases`, `PUT/DELETE /fases/{id}` |
| Eventos | `GET/POST /eventos`, `DELETE /eventos/{id}` |
| Panel | `GET /panel/{id}/tabla\|goleadores\|sanciones\|resumen` |
| Landing pública | `GET /landing/{slug}`, `GET /landing/torneo/{id}/tabla\|goleadores\|partidos\|sanciones\|resumen`, `GET /landing/partido/{id}/eventos\|alineaciones\|vivo` |
| Editor landing | `GET/PUT/DELETE /landing/manage`, `POST /landing/upload-image` |
| Inscripción pública | `GET/POST /inscripcion/{slug}` |

---

## 14. Datos de prueba (seed)

| Rol | Email | Contraseña |
|---|---|---|
| SUPERADMIN | `superadmin@demo.com` | `super1234` |
| ORGANIZADOR | `manager@demo.com` | `manager123` |

Documentación interactiva de la API: `/apidocs` (Swagger).