# Propuesta de simplificación — Pantalla Planilla

Análisis de usabilidad y plan de mejora del flujo de carga de partidos.

- **Alcance de este documento**: propuestas, priorización y **estado de implementación**. Los sprints 1 a 3 ya están aplicados en el working tree (sin commit); ver §9.
- **Archivo analizado**: `frontend/src/pages/Planilla.jsx` (1.879 líneas, 18 `useState` + 3 `useRef` en un solo componente).
- **Fecha**: 28-sep-2026.

---

## 1. Resumen ejecutivo

El problema de la Planilla **no es la cantidad de controles, es el costo de armar la lista de convocados**. De las ~100 interacciones necesarias para registrar un partido completo, **88 son agregar jugadores de a uno** (11 por lado × 4 toques cada uno). Solo eso.

Consecuencias medibles del estado actual:

| Métrica | Hoy |
|---|---|
| Interacciones por partido (11+11, 3 goles, 1 cambio, 1 tarjeta) | **~100-115** |
| Requests HTTP solo por armado de alineación | **~33** |
| Interacciones para convocar | **~88** (81% del total) |
| Bugs que bloquean el flujo | **3** (ver §5) |
| Estado que se pierde al cambiar de partido | **3 stores** (§3) |

**El 80% de la fricción se resuelve con una sola feature**: cargar la lista de un saque.

---

## 2. El flujo actual, paso a paso

### 2.1 Armado de la lista (el cuello de botella)

Por cada jugador, en cada uno de los dos equipos (`Planilla.jsx:1079-1183`):

| # | Interacción | Ubicación |
|---|---|---|
| 1 | Click en el input "Agregar jugador" | `:1104-1120` |
| 2 | Escribir nombre / N° / posición | `:1086-1096` |
| 3 | Click en la opción del dropdown | `:1122-1140` |
| 4 | Click en **"Agregar"** | `:1150-1183` |

**Mínimo 4 toques × 22 jugadores = 88 toques.** Con plantillas de 16-18 (los valores `s/n` del modelo `Jugador`) son 130-150.

Fricciones acumuladas en este paso:

- El botón "Agregar" se deshabilita durante la request (`alinearMut.isPending`, `:1152`), así que **no se puede encolar el siguiente jugador**. El armado se siente secuencial.
- Cada alta son **3 requests**: `POST /alineacion` → `invalidate(['alineacion'])` → `GET /alineacion` → `invalidate(['jugadores', eq.id])` → `GET /jugadores` (`:402`, `:1180`).
- El filtro del `Autocomplete` **solo busca jugadores todavía no convocados** (`:980`). No hay forma de encontrar un titular ya cargado.
- El backend bloquea por Tesorería (`partido_routes.py:226-228`) pero el frontend **no lo anticipa**: el jugador se ve seleccionable y falla recién al enviar.
- ElJugador número 12+ entra como suplente automáticamente (`esTitular = titulares < MAX_TITULARES`, `:1174`). Si se agregó en desorden, hay que corregir con el toggle T/S uno por uno (`:1341-1357`).

### 2.2 Armado de la formación

Opcional. Solo en la vista "Formación" (`:1070`), y **exclusivamente con HTML5 drag & drop** (`:1207-1228`).

- Mínimo 0 drops si el reparto 4-3-3 por defecto sirve; típico 3-8.
- Cada drop manda el **array completo de los 11 titulares** (`moverJugador`, `:1045-1047`). No hay botón "Guardar formación".
- Si un POST falla, `ordenMut.onError` **descarta todo el reordenamiento optimista** de ese equipo (`:479-482`).
- Una vez persistido, un `posicion_tactica` incorrecto pasa a ser la fuente de verdad al recargar (`app/models/partido_alineacion.py:17-18`). **No hay "restablecer automático".**

### 2.3 Registro de acciones

Cada tipo tiene su propio camino, y **el diálogo se cierra solo tras cada evento** (`eventoMut.onSuccess` → `setAccion(null)`, `:351`):

| Acción | Secuencia | Toques |
|---|---|---|
| Gol | Click ⚽ del equipo → [Click "Autogol"] → Click jugador | 2-3 |
| Autogol | Click ⚽ → Click "Autogol" → Click jugador | 3 |
| Amarilla | Click 🟨 → Click jugador | 2 |
| Roja | Click 🟨 → Click "Roja" → Click jugador | 3 |
| Tarjeta al DT | Click 🟨 → Click DT → `window.confirm` | 3-4 |
| Cambio | Click ⇄ → Click el que sale → Click el que entra → "Confirmar" | 4 |
| Anular gol | Click ↩ del header → `window.confirm` | 2 |

Con 3 goles son **3 aperturas de diálogo** porque el cierre es automático.

### 2.4 Cierre

- **"Finalizar" está duplicado**: header (`:735`) y barra oscura (`:924-929`), separados por ~600px de scroll.
- El diálogo de confirmación (`:1711`) **no valida nada**: ni que el partido haya iniciado, ni que haya 11 en cancha por lado, ni que el número de eventos coincida con el marcador.
- `partido_service.py:190-204` solo chequea `resultado === 'PENDIENTE'` y que los goles no sean negativos.

---

## 3. Estado: 18 `useState` + 3 `useRef` en un solo componente

| Estado | Línea | Problema |
|---|---|---|
| `formEquipo` | `:189` | Indexado por `eq.id`, **no** por `selId`. No se limpia al cambiar de partido: el texto queda pegado. |
| `ordenLocal` | `:191` | Igual. Peor: el override optimista de la formación **sobrevive** al cambio de partido y se superpone a los datos del servidor. |
| `vistaEquipo` | `:190` | Igual (menor gravedad). |
| `adicion` | `:194` | **100% efímera**: no se manda a `/en_vivo` ni a `/eventos`, no se lee del servidor. El chip es decorativo. |
| `crono` | `:187` | Nunca se sincroniza desde SSE. `lib/sse.js:33-37` escribe `seg`/`running`/`iniciado` en `['partido', id]` y **`Planilla.jsx` nunca lo lee** (0 coincidencias de `partido.seg`). Con dos dispositivos abiertos, cada uno corre su `setInterval` y ambos sobrescriben `seg`. |
| `dragJugador` (ref) | `:198` | Se escribe en `:1210` y **nunca se lee**: código muerto. |
| `hoverKey` | `:192` | Solo se limpia en `onDrop`/`onDragEnd`. Un drag abandonado deja el highlight pegado. |
| `marcador` | `:184` | Doble fuente de verdad junto con `marcadorEventos` (`:267-274`): uno se deriva por conteo de eventos, el otro se persiste. |

**Relaciones no obvias:**

- `selId` alimenta 6 `queryKey`, el SSE y 7 mutations. Cambiar de partido dispara 7 fetches pero **no limpia `formEquipo`, `ordenLocal` ni `adicion`**.
- `accion` + `accForm.equipo_id` se fijan juntos en `abrirAccion` (`:588-589`): el equipo queda **bloqueado** durante el diálogo. No hay forma de cambiarlo sin cerrar y reabrir.
- `equipoTab` (intra-marcador, breakpoint `sm`=600px) y `mobileTab` (entre secciones, breakpoint `md`=900px) son **ortogonales y con breakpoints distintos** → en tablet (600-900px) las pestañas internas están visibles pero las dos tarjetas de equipo se muestran a la vez.

---

## 4. Propuestas priorizadas por esfuerzo / impacto

Escala de esfuerzo: **S** < 1 día · **M** 1-3 días · **L** > 3 días.
Impacto: sobre el tiempo real del usuario por partido.

### 4.1 Prioridad 1 — Alto impacto

| # | Propuesta | Esfuerzo | Impacto | Rompe? |
|---|---|---|---|---|
| **P1** | **Cargar la lista de un saque** (plantel activo o XI del partido anterior) | M | **★★★★★** | No |
| **P2** | **Que el diálogo de acción no se cierre** tras cada evento | S | **★★★★☆** | No |
| **P3** | **Contador permanente de titulares faltantes** + salto al equipo incompleto | S | **★★★☆☆** | No |
| **P4** | **Minuto visible y editable**, recalculado al enviar | S | **★★★☆☆** | No |
| **P5** | **Tap-to-swap táctil** para reemplazar el drag & drop en la formación | M | **★★★★☆** (móvil) | No |

### 4.2 Prioridad 2 — Corrección (bugs que invalidan el trabajo)

| # | Propuesta | Esfuerzo | Impacto | Rompe? |
|---|---|---|---|---|
| **P6** | **Arreglar `POST /acta`** (`NameError`, §5.1) | **S** | **★★★★★** | No |
| **P7** | **Un cambio debe actualizar la alineación** (§5.3) | M | **★★★★★** | Sí (backend) |
| **P8** | **Arreglar el botón de tarjeta al DT** (§5.2) | **S** | **★★★☆☆** | No |
| **P9** | **Limpiar `formEquipo` / `ordenLocal` / `adicion` al cambiar de partido** | S | **★★★☆☆** | No |
| **P10** | **Sincronizar el cronómetro desde SSE** | M | **★★★☆☆** | Sí (backend) |

### 4.3 Prioridad 3 — Ordenar la interfaz

| # | Propuesta | Esfuerzo | Impacto |
|---|---|---|---|
| **P11** | Un solo selector de equipo (hoy hay dos idénticos, `:773-790` y `:959-974`) | S | ★★★☆☆ |
| **P12** | Un solo botón "Finalizar" (hoy hay dos, `:735` y `:924-929`) | S | ★★☆☆☆ |
| **P13** | `Select` de partido buscable + agrupado por jornada (`:716-723`) | S | ★★★☆☆ |
| **P14** | Diálogo de Cambio en un solo paso, sin scroll anidado (`:1554-1614`) | M | ★★★☆☆ |
| **P15** | Reemplazar los 5 `window.confirm` por diálogos propios (`:627,674,1360,1436,1513`) | M | ★★☆☆☆ |
| **P16** | Quitar o hacer funcional el chip de "+N' ADICIÓN" (`:194`, `:855-857`) | S | ★★☆☆☆ |
| **P17** | Teclado: `Enter` selecciona la primera opción, `Enter` agrega | S | ★★☆☆☆ |
| **P18** | Recordar el último equipo usado al abrir una acción | S | ★★☆☆☆ |

### 4.4 Prioridad 4 — Deuda técnica

| # | Propuesta | Esfuerzo | Impacto |
|---|---|---|---|
| **P19** | Partir `Planilla.jsx` en subcomponentes (`usePlanillaPartido`, `PanelEquipo`, `DialogoAccion`, `Cancha`) | L | ★★☆☆☆ (mantenibilidad) |
| **P20** | Eliminar `dragJugador` (código muerto) | S | — |
| **P21** | Quitar el límite de titulares hardcodeado (`MAX_TITULARES = 11`, `:99`); hoy solo existe en el frontend | M | — |
| **P22** | Unificar `equipoTab` y `mobileTab` bajo un mismo breakpoint | S | ★★☆☆☆ |
| **P23** | "Deshacer" para borrados de eventos y de alineación (§6) | M | ★★☆☆☆ |

---

## 5. Bugs que bloquean el flujo

### 5.1 `POST /partidos/<id>/acta` devuelve 500 siempre

`app/routes/partido_routes.py:150` llama a `ensure_planilla_role`, que **no está importado** en `partido_routes.py:10`:

```python
# partido_routes.py:10 — imports actuales
from app.routes._authz import get_current_user, ensure_torneo_organizador, ensure_management_role, ensure_delegado_equipo
# falta ensure_planilla_role, que sí existe en app/routes/_authz.py:63
```

`NameError` en runtime → **el paso final del flujo ("Datos del acta": árbitros y observaciones) no se puede guardar nunca**. Es el diálogo de `Planilla.jsx:361-369` / `:1760-1792`.

**Es un import.** Máximo impacto / mínimo esfuerzo de toda la lista.

### 5.2 La tarjeta al DT falla siempre si el equipo no tiene `tecnico_nombre`

El botón se muestra (`:1651`) pero el POST manda `null`:

```js
// Planilla.jsx:634
nombre_sancionado: tecnicoDe(equipoId) === 'DT' ? null : tecnicoDe(equipoId)
```

`app/routes/evento_routes.py:62-63` rechaza `nombre_sancionado` vacío con 400. Botón visible que nunca funciona. Igual con el nombre literal `"DT"`.

### 5.3 Un cambio no actualiza la alineación

`CAMBIO` **solo crea un evento**; `partido_alineaciones.titular` queda congelado en el XI inicial. Consecuencias:

- El toggle T/S de la lista (`:1341-1357`) sigue mostrando el XI inicial aunque 3 jugadores ya se hayan sustituido.
- El **acta oficial pública** lee `i.titular` y ordena por ese campo (`app/services/landing_service.py:207` y `:214`) → **imprime el XI inicial, no el final**.

El técnico trabaja de más y el documento oficial sale mal, sin aviso.

**No existe endpoint para resolverlo.** Hoy haría falta tocar `partido_alineaciones` en la misma operación: o 2 llamadas (`POST /alineacion` para cada jugador) o un endpoint nuevo dedicado.

### 5.4 Inconsistencias de permisos (menor, no bloquean la UI)

| Endpoint | Chequea rol | Chequea `PENDIENTE` |
|---|---|---|
| `POST /partidos/<id>/resultado` | **solo** `ensure_torneo_organizador` (`:126-127`) | Sí |
| `POST /partidos/<id>/acta` | `ensure_planilla_role` (**roto**) | Sí |
| `POST /eventos` | `ensure_planilla_role` | Sí (`:45-46`) |
| `DELETE /eventos/<id>` | `ensure_planilla_role` | **No** (`evento_routes.py:102-115`) |
| `DELETE /partidos/<id>/alineacion/<jugador_id>` | `ensure_torneo_organizador` + `ensure_delegado_equipo` | **No** (`partido_routes.py:269-285`) |
| `GET /partidos/<id>/stream` | **ninguno** (público) | — |

La UI oculta los botones con `editable`, pero la API permite reescribir un partido ya finalizado.

---

## 6. Detalle de las propuestas de Prioridad 1

### P1 — Cargar la lista de un saque

**Estado actual**: los dos planteles **ya están en la cache de react-query** (`GET /jugadores?equipo_id=`, `Planilla.jsx:246` y `:251`). La data está descargada; solo falta el botón.

Dos variantes, de menor a mayor alcance:

| Variante | Descripción | Interacciones resultantes | Endpoint |
|---|---|---|---|
| **A — Plantel activo** | "Agregar los N jugadores activos" con los primeros 11 como titulares | 88 → **1** | Bulk nuevo, o N POSTs encadenados tras un solo click |
| **B — XI del partido anterior** | Pre-cargar la alineación del último partido del equipo | 88 → **1** | `GET` del último partido del equipo + bulk |

La **variante B es la mejor** en la práctica: la lista titular de la fecha anterior es la que el técnico quiere en el 90% de los casos, y arrastra además el `posicion_tactica` de la formación (resolviendo P5 parcialmente).

**Detalle de implementación (A)**: el botón se ubicaría junto al toggle "Lista / Formación" (`:1067-1073`), deshabilitado si `disponibles` está vacío. Al confirmar, encadenar los POST con el `numero_camiseta` real de cada jugador (disponible en la query, evita el conflicto de números duplicados que hoy valida el backend en `partido_routes.py:250-262`).

**Riesgo**: el bulk debe seguir respetando `activo` y `bloqueo_jugador` por ítem, igual que hoy (`partido_routes.py:216-228`). Si uno falla, reportar cuál y no abortar el resto.

### P2 — El diálogo de acción no se cierra

**Estado actual**: `eventoMut.onSuccess` hace `setAccion(null)` (`:351`).

**Cambio**: dejar el diálogo abierto tras un registro exitoso, limpiar solo `accForm.jugador_id` y `accForm.jugador_sale_id`, y mantener el tipo de acción. El minuto se recalcula en cada apertura de confirmación.

Efecto: el 2º gol del mismo equipo pasa de 3 toques a 1. En un partido con 5+ goles la diferencia es muy notoria.

**Acotación**: hay que ofrecer una salida explícita ("Listo" / cerrar) porque si no el usuario puede quedarse atrapado en el diálogo. Y conviene dejarlo abierto solo para `GOL` / `TARJETA`; para `CAMBIO` tiene sentido cerrarlo (es una acción única por vez).

### P3 — Contador permanente de titulares faltantes

`faltantesInicio` (`:513-518`) ya calcula el detalle por equipo, pero **solo se renderiza dentro de un `toast` de 3,5s** (`:594-599`) que desaparece justo cuando el usuario toca "Iniciar".

- Subir el chip de estado del header (`:755-756`) a algo como `EN CURSO · Faltan 3 (local)`.
- Cuando `planillaCompleta === false`, hacer el botón "Iniciar" que salte directo al equipo incompleto en vez de mostrar un toast.
- Considerar mostrar el contador también cuando `iniciado` es `true` (por si se expulsó a alguien y quedó con 10).

### P4 — Minuto visible y editable

`abrirAccion` congela `accForm.minuto = minutoCrono()` en el instante de abrir (`:588`) y **no hay ningún campo de minuto en el diálogo** (`:1543-1708`). Si el usuario duda 3 minutos y confirma, el evento queda con el minuto viejo.

- Agregar un `TextField` de minuto precargado con el valor actual.
- Recalcularlo al confirmar si el usuario no lo editó a mano.
- `minutoCrono()` (`:579-581`) tiene el salto 45→46 en `seg === 2700` exactos y no contempla pausas.

### P5 — Tap-to-swap táctil

**Estado actual**: HTML5 `draggable` / `onDragStart` / `onDrop` (`:1207-1228`). **No hay soporte táctil** y la vista "Lista" no tiene reordenamiento (`:984-987`). Resultado: **en móvil la formación no se puede configurar en absoluto**.

Propuesta: en lugar de arrastrar, el usuario **toca una fila de la cancha** (se resalta con `hoverKey`, que ya existe como estado) y luego **toca un jugador** para moverlo. Se reutiliza `moverJugador` (`:1025-1048`) sin cambios de lógica.

Ventajas: funciona con el dedo, es más preciso que arrastrar (no hay ambigüedad de "a qué fila lo tiro"), y no requiere librería externa.

**Como complemento**: agregar flechas ↑↓ en la vista "Lista" como alternativa desktop, y un botón "Restablecer formación automática" que limpia `posicion_tactica` (hoy no hay vuelta atrás, §2.2).

---

## 7. Orden de ataque sugerido

### Sprint 1 — "Que el flujo funcione" (~1 día)

1. **P6** — importar `ensure_planilla_role` (1 línea). Sin esto, el paso final está muerto.
2. **P8** — arreglar el botón de DT (1 línea).
3. **P9** — limpiar `formEquipo` / `ordenLocal` / `adicion` al cambiar `selId` (un `useEffect`).
4. **P3** — contador de faltantes en el header.

Cierra los caminos que hoy están rotos, sin tocar la arquitectura.

### Sprint 2 — "Que sea rápido" (~3-4 días)

5. **P1** — carga masiva de la lista (variante B primero).
6. **P2** — el diálogo de acción no se cierra.
7. **P4** — minuto visible y editable.

Con esto el partido baja de **~100 a ~25 interacciones** y de ~35 a ~12 requests.

### Sprint 3 — "Que funcione en el teléfono y no traiga información falsa" (~4-5 días)

8. **P5** — tap-to-swap + "restablecer formación".
9. **P7** — el cambio actualiza la alineación (requiere backend).
10. **P14** — diálogo de Cambio en un solo paso.
11. **P10** — cronómetro sincronizado por SSE (requiere backend).

### Backlog — limpieza

12. **P11-P18**: selectores duplicados, botones duplicados, `Select` buscable, `window.confirm`, chip de adición, atajos de teclado.
13. **P19-P23**: partición del componente, código muerto, `MAX_TITULARES` configurable, unificar breakpoints, deshacer.

---

## 8. Notas y supuestos

- Los esfuerzo son **estimaciones groseras** sin validar contra el calendario real del equipo.
- `P1` es la propuesta de mayor retorno y no requiere cambios de arquitectura. Es la primera candidata a implementar.
- `P7` y `P10` son las dos únicas que exigen cambios de backend. `P7` además necesita decidir si se extiende `POST /partidos/<id>/alineacion` o se crea un endpoint transaccional de sustitución.
- El flujo de **DELEGADO** (`pages/MiEquipo.jsx:84` y `:91`) escribe la misma tabla `partido_alineaciones` vía los mismos endpoints. Cualquier cambio en el modelo de lineup debe revisarse contra esa pantalla o se rompe la paridad.
- No se verificó comportamiento en navegador real; el análisis es estático sobre el código.

---

## 9. Estado de implementación

Todo lo de abajo está **en el working tree, sin commit**. La UI se validó con lint y build; la lógica de backend con smoke tests sobre la base local, que quedaron revertidos.

### Sprint 1 — robustez

| Propuesta | Estado | Dónde |
|---|---|---|
| P6 · Importar `ensure_planilla_role` | **Hecho** | `app/routes/partido_routes.py` |
| P8 · DT manual en el diálogo | **Hecho** | `Planilla.jsx`, con validación de vacío |
| P9 · Limpiar estado al cambiar de partido | **Hecho** | `Planilla.jsx` (`formEquipo`, `ordenLocal`, `adicion`, `movSel`) |
| P3 · Contador de titulares faltantes | **Hecho** | `Planilla.jsx`, salta al equipo incompleto |

`POST /partidos/<id>/acta` pasó de 500 a 200 con el import corregido, y el nombre persists.

### Sprint 2 — carga y registro

| Propuesta | Estado | Dónde |
|---|---|---|
| P2 · El diálogo queda abierto al registrar | **Hecho** | `Planilla.jsx` (se cierra solo en `CAMBIO`) |
| P4 · Minuto editable | **Hecho** | `minuto_editado` + `minutoEnvio()` |
| P1 · Carga masiva de convocados | **Hecho** | `POST /partidos/<id>/alineacion/bulk` |

El endpoint bulk tiene éxito parcial, tope de 60 jugadores por lote, y comparte `_error_convocatoria` / `_normalizar_numero` con el alta individual. Verificado contra duplicados, bloqueados, equipo ajeno, inexistentes, idempotencia y persistencia.

En el frontend, `copiarPrevio` tiene que filtrar por `equipo_id`: el endpoint devuelve **los dos** equipos del partido, no solo el local.

### Sprint 3 — interacción táctil

| Propuesta | Estado | Dónde |
|---|---|---|
| P5 · Intercambio por toques | **Hecho** | `Planilla.jsx` (`movSel`, `arrastroRef`, botón `Automática`) |
| P7 · El cambio mueve la alineación | **Hecho** | `app/routes/evento_routes.py` |
| P14 · Diálogo de cambio en un paso | **Hecho** | `Planilla.jsx` (Stepper de 2 pasos) |

**P7 en detalle.** Al crear un `CAMBIO` el backend actualiza `partido_alineaciones` en la misma transacción que el evento: el saliente pasa a `titular=False` (sigue en la lista, como suplente) y el entrante a `titular=True`, heredando `posicion_tactica` y `posicion_orden` del saliente. Sin esto, la tabla quedaba con el XI inicial y el acta oficial —que lee `titular` en `landing_service.py:207`— imprimía el XI errado.

Como consecuencia, se eliminó el replay de eventos `CAMBIO` que hacía `enCanchaDe` en el frontend: con el backend corregido, aplicarlo dos veces devolvía a la cancha a un jugador ya sustituido (A→B y después B→C reincorporaban a B). La base local tiene **0 partidos PENDIENTE con CAMBIOS registrados**, así que no hay datos históricos que requieran backfill.

**P14 en detalle.** El diálogo pasó de dos columnas con scroll propio apiladas a un `Stepper` de dos pasos (quién sale → quién entra), con un solo scroll y `Confirmar cambio` en el pie. El drag & drop de escritorio de P5 convive con los toques.

### Pendiente

- **P10** · cronómetro en vivo contra el reloj del servidor vía SSE.
- **P16** · el selector `adicion` es decorativo: cicla `0 → 4 → 6` sin efecto. O se conecta a la formación o se saca.
- **P11-P23** · siguen en backlog según §7.
- Los 3 errores de ESLint en `Planilla.jsx` (`set-state-in-effect` ×2, `refs` ×1) son preexistentes a estos sprints.
