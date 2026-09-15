# Datos de Prueba Manual — Torneo Fútbol V2 (copiar y pegar)

Guía para probar **todas** las funcionalidades de `docs/funcionalidades.md` a mano,
desde el frontend (`http://localhost:5173`) o desde Swagger (`http://localhost:5010/apidocs` — ver `vite.config.js`, el proxy apunta a `5010`).

> Convención: `{{...}}` = reemplazar por el ID real que te devuelva la API.
> Los JSON están listos para pegar en Swagger / Postman / Thunder Client.
> Orden recomendado de prueba: de arriba hacia abajo (cada sección crea lo que necesita la siguiente).

---
## 0. Base y cuentas seed

| Qué | Valor |
|---|---|
| Frontend dev | `http://localhost:5173` |
| Backend | `http://localhost:5010` (proxy `/api` → `5010`) |
| Swagger | `http://localhost:5010/apidocs` |
| SUPERADMIN | `superadmin@demo.com` / `super1234` |
| ORGANIZADOR demo | `manager@demo.com` / `manager123` |
| Organizador demo | slug `liga-osdosoft` → landing `http://localhost:5173/l/liga-osdosoft` |

### Login (POST /api/auth/login)

```json
{ "email": "superadmin@demo.com", "password": "super1234" }
```
```json
{ "email": "manager@demo.com", "password": "manager123" }
```

### Ver sesión (GET /api/auth/me)
Header: `Authorization: Bearer <TOKEN>`

### Caso negativo — login malo (debe dar 401)
```json
{ "email": "superadmin@demo.com", "password": "clave-mala" }
```

---
## 1. Organizadores — solo SUPERADMIN (sección 4 del doc)

### 1.1 Crear organizador + usuario ORGANIZADOR (POST /api/auth/register-organizador)
```json
{
  "name": "Liga Cancha Central",
  "slug": "cancha-central",
  "whatsapp": "+549113334444",
  "address": "Av. Central 1234, CABA",
  "email": "manager@canchacentral.com",
  "password": "central123",
  "role": "ORGANIZADOR"
}
```
Variante 2 (para probar aislamiento multi-tenant):
```json
{
  "name": "Liga Norte FC",
  "slug": "liga-norte",
  "whatsapp": "+549115556666",
  "address": "Cancha Norte, Tigre",
  "email": "manager@norte.com",
  "password": "norte12345",
  "role": "ORGANIZADOR"
}
```

### 1.2 CRUD organizadores
- Listar: `GET /api/organizadores`
- Ver uno: `GET /api/organizadores/{{org_id}}`
- Crear directo (POST /api/organizadores):
```json
{
  "name": "Liga Prueba Manual",
  "slug": "liga-prueba-manual",
  "whatsapp": "+549117777888",
  "address": "Calle Falsa 123",
  "description": "Liga creada a mano para pruebas",
  "primary_color": "#0ea5e9",
  "welcome_message": "Bienvenidos a la Liga Prueba Manual"
}
```
- Editar (PUT /api/organizadores/{{org_id}}):
```json
{
  "name": "Liga Prueba Manual (editada)",
  "whatsapp": "+549117777999",
  "address": "Calle Falsa 456",
  "description": "Descripción editada para probar el PUT",
  "primary_color": "#16a34a",
  "welcome_message": "Mensaje editado"
}
```
- Eliminar: `DELETE /api/organizadores/{{org_id}}` (borra en cascada: usuarios, torneos, equipos…)

### 1.3 Casos negativos
- Slug duplicado → `{"name":"Otro","slug":"cancha-central", ...}` debe dar `El slug/URL ya está en uso`.
- Email duplicado → mismo `email` debe dar `El correo ya está en uso`.
- Color inválido → `"primary_color": "rojo"` debe dar 400 (formato `^#[0-9a-fA-F]{6}$`).
- Slug corto → `"slug": "ab"` debe dar 400 (mín 3).
- Como ORGANIZADOR intentar `GET /api/organizadores` → 403.

### 1.4 Crear STAFF (POST /api/auth/register-staff, logueado como ORGANIZADOR)
```json
{ "email": "staff@cancha-central.com", "password": "staff12345" }
```
```json
{ "email": "planillero@norte.com", "password": "planilla123" }
```

## 2. Torneos — CRUD y ciclo de vida (sección 5.1)

> Los torneos pertenecen a un organizador. Si estás logueado como ORGANIZADOR no hace
> falta mandar `organizador_id` (se fuerza al tuyo). Como SUPERADMIN sí debes mandarlo.

### 2.1 Crear torneo (POST /api/torneos)
Mínimo (usa defaults 18 / 3-1-0):
```json
{ "organizador_id": 2, "nombre": "Copa Apertura 2026" }
```
Completo:
```json
{
  "organizador_id": 2,
  "nombre": "Copa Apertura 2026",
  "max_jugadores_por_equipo": 18,
  "puntos_victoria": 3,
  "puntos_empate": 1,
  "puntos_derrota": 0
}
```
Variante con puntos distintos (para probar tabla configurable):
```json
{
  "organizador_id": 2,
  "nombre": "Liga Puntos Dobles 2026",
  "max_jugadores_por_equipo": 20,
  "puntos_victoria": 4,
  "puntos_empate": 2,
  "puntos_derrota": 0
}
```

### 2.2 Editar (PUT /api/torneos/{{torneo_id}})
```json
{
  "nombre": "Copa Apertura 2026 (editada)",
  "max_jugadores_por_equipo": 22,
  "puntos_victoria": 3,
  "puntos_empate": 1,
  "puntos_derrota": 0,
  "inscripciones_jugadores_abiertas": true
}
```
Abrir/cerrar inscripción de jugadores sin cambiar estado:
```json
{ "inscripciones_jugadores_abiertas": true }
```
```json
{ "inscripciones_jugadores_abiertas": false }
```

### 2.3 Máquina de estados (POST /api/torneos/{{torneo_id}}/estado)
Orden obligatorio:
```
CREADO → INSCRIPCIONES_ABIERTAS → INSCRIPCIONES_CERRADAS → SORTEADO → EN_JUEGO → FINALIZADO
(reapertura permitida: INSCRIPCIONES_CERRADAS → INSCRIPCIONES_ABIERTAS)
```
Pegar en orden, uno por uno:
```json
{ "estado": "INSCRIPCIONES_ABIERTAS" }
```
```json
{ "estado": "INSCRIPCIONES_CERRADAS" }
```
```json
{ "estado": "INSCRIPCIONES_ABIERTAS" }
```
```json
{ "estado": "INSCRIPCIONES_CERRADAS" }
```
```json
{ "estado": "SORTEADO" }
```
```json
{ "estado": "EN_JUEGO" }
```
```json
{ "estado": "FINALIZADO" }
```
Negativos (deben fallar):
```json
{ "estado": "EN_JUEGO" }
```
```json
{ "estado": "LIGA_MASTER" }
```

### 2.4 Eliminar / ver
- Ver: `GET /api/torneos/{{torneo_id}}` · Listar: `GET /api/torneos`
- Eliminar: `DELETE /api/torneos/{{torneo_id}}`

---
## 3. Reglamento configurable (PUT /api/torneos/{{torneo_id}}/reglas — sección 5.2)

### 3.1 Reglamento estándar (ida, 2 a final, fair play)
```json
{
  "formato_tipo": "ROUND_ROBIN",
  "rondas": 1,
  "clasifican_a_final": 2,
  "desempates": ["DIF_GOL", "GOLES_FAVOR", "MENOS_AMARILLAS", "MENOS_ROJAS", "GOLES_CONTRA"],
  "edad_min": null,
  "edad_max": null,
  "max_jugadores": null,
  "bloquear_baja_tras_jugar": false,
  "comodines_cantidad": 0,
  "comodines_edad_min": 30,
  "tolerancia_w_min": 10,
  "marcador_w": 3,
  "fechas_doble_amarilla": 1,
  "fechas_roja_directa": 2
}
```

### 3.2 Reglamento ida y vuelta + categoría Sub-35 con comodines veteranos
```json
{
  "formato_tipo": "ROUND_ROBIN",
  "rondas": 2,
  "clasifican_a_final": 4,
  "desempates": ["DIF_GOL", "GOLES_FAVOR", "GOLES_CONTRA", "MENOS_AMARILLAS", "MENOS_ROJAS"],
  "edad_min": 18,
  "edad_max": 35,
  "max_jugadores": 18,
  "bloquear_baja_tras_jugar": true,
  "comodines_cantidad": 2,
  "comodines_edad_min": 35,
  "tolerancia_w_min": 15,
  "marcador_w": 3,
  "fechas_doble_amarilla": 1,
  "fechas_roja_directa": 2
}
```

### 3.3 Reglamento eliminatoria (para probar que el fixture automático se niega)
```json
{
  "formato_tipo": "ELIMINATORIA",
  "rondas": 1,
  "clasifican_a_final": 2,
  "desempates": ["DIF_GOL", "GOLES_FAVOR"],
  "edad_min": null,
  "edad_max": null,
  "max_jugadores": 20,
  "bloquear_baja_tras_jugar": false,
  "comodines_cantidad": 0,
  "comodines_edad_min": 30,
  "tolerancia_w_min": 10,
  "marcador_w": 2,
  "fechas_doble_amarilla": 1,
  "fechas_roja_directa": 1
}
```

### 3.4 Negativos (deben dar 400)
Desempate duplicado:
```json
{ "formato_tipo": "ROUND_ROBIN", "rondas": 1, "desempates": ["DIF_GOL", "DIF_GOL"] }
```
Edad invertida:
```json
{ "edad_min": 35, "edad_max": 18 }
```
Rondas inválida / formato inválido / final fuera de rango:
```json
{ "rondas": 3 }
```
```json
{ "formato_tipo": "LIGUILLA" }
```
```json
{ "clasifican_a_final": 8 }
```

---
## 4. Fixture y fase final (secciones 5.3 y 5.4)

### 4.1 Generar fixture (POST /api/torneos/{{torneo_id}}/fixture)
Requiere: ≥3 equipos + reglas en ROUND_ROBIN + sin partidos jugados.
```json
{}
```
Regenerar (borra pendientes, exige `reemplazar`):
```json
{ "reemplazar": true }
```
Negativos esperados:
- Con <3 equipos → `Se necesitan al menos 3 equipos…`
- Con formato ELIMINATORIA → `El generador automático está disponible para formato ROUND_ROBIN`
- Segunda vez sin flag → `Ya existen partidos programados. Envía reemplazar=true…`
- Con partidos jugados → `Ya hay partidos con resultado; no se puede regenerar…`

### 4.2 Generar fase final (POST /api/torneos/{{torneo_id}}/fase-final, body vacío)
```json
{}
```
Requiere: `clasifican_a_final >= 2` y suficientes jugados. Crea semis/final tipo ELIMINATORIA.
Negativos: sin configurar N → `Configura "Clasifican a final"…`; sin jugados → `Aún no hay partidos jugados…`; repetida → `La fase final ya fue generada`.

---
## 5. Fases (recurso Fases)

- Listar: `GET /api/fases?torneo_id={{torneo_id}}`
- Crear (POST /api/fases):
```json
{ "torneo_id": 1, "nombre": "Fase de Grupos", "orden": 1, "tipo": "GRUPOS" }
```
```json
{ "torneo_id": 1, "nombre": "Todos contra todos", "orden": 1, "tipo": "ROUND_ROBIN" }
```
```json
{ "torneo_id": 1, "nombre": "Fase Final", "orden": 2, "tipo": "ELIMINATORIA" }
```
- Editar (PUT /api/fases/{{fase_id}}):
```json
{ "nombre": "Fase de Grupos (editada)", "orden": 1, "tipo": "GRUPOS", "completada": false }
```
```json
{ "nombre": "Fase Final", "completada": true }
```
- Eliminar: `DELETE /api/fases/{{fase_id}}`
- Tipos válidos: `GRUPOS`, `ELIMINATORIA`, `ROUND_ROBIN`.

---

## 6. Equipos (sección 6.1)

> Solo se crean con torneo en `CREADO` o `INSCRIPCIONES_ABIERTAS`.
> Listar: `GET /api/equipos?torneo_id={{torneo_id}}` · Ver: `GET /api/equipos/{{equipo_id}}`

### 6.1 Crear 4 equipos (POST /api/equipos — pegar uno por uno)
```json
{ "torneo_id": 1, "nombre": "Leones del Este", "delegado_email": "leones@mail.com", "delegado_documento": "11111111" }
```
```json
{ "torneo_id": 1, "nombre": "Tigres del Norte", "delegado_email": "tigres@mail.com", "delegado_documento": "22222222" }
```
```json
{ "torneo_id": 1, "nombre": "Cóndores FC", "delegado_email": "condores@mail.com", "delegado_documento": "33333333" }
```
```json
{ "torneo_id": 1, "nombre": "Dragones Rojos", "delegado_email": "dragones@mail.com", "delegado_documento": "44444444" }
```
Extras para torneo grande:
```json
{ "torneo_id": 1, "nombre": "Pumas del Oeste", "delegado_email": "pumas@mail.com", "delegado_documento": "55555555" }
```
```json
{ "torneo_id": 1, "nombre": "Halcones Dorados", "delegado_email": "halcones@mail.com", "delegado_documento": "66666666" }
```

### 6.2 Editar (PUT /api/equipos/{{equipo_id}})
```json
{ "nombre": "Leones del Este (editado)", "delegado_email": "nuevo-leones@mail.com", "delegado_documento": "11111111" }
```

### 6.3 Link público (POST /api/equipos/{{equipo_id}}/link, body vacío)
```json
{}
```
Respuesta: `{ "slug": "abc123...", ... }` → abrir `http://localhost:5173/r/{{slug}}`.

### 6.4 Negativos
- Crear con torneo en `EN_JUEGO` → `Solo se pueden inscribir equipos con inscripciones abiertas`.
- Sin `torneo_id` → `torneo_id es requerido`.
- Eliminar: `DELETE /api/equipos/{{equipo_id}}`.

---

## 7. Jugadores (sección 6.2)

> Listar: `GET /api/jugadores?equipo_id={{equipo_id}}`.
> Posiciones: `ARQUERO`, `DEFENSOR`, `MEDIOCAMPISTA`, `DELANTERO`.

### 7.1 Equipo 1 — Leones (POST /api/jugadores)
```json
{ "equipo_id": 1, "nombre": "Carlos Rivas", "numero_camiseta": 1, "documento_identidad": "DOC-LEO-01", "posicion": "ARQUERO", "fecha_nacimiento": "1998-03-15", "telefono": "+549112220001", "pierna_habil": "DERECHA", "altura_cm": 185, "tipo_sangre": "O+", "eps": "Salud Total", "contacto_emergencia": "Ana Rivas +549112220099", "alergias": "Ninguna" }
```
```json
{ "equipo_id": 1, "nombre": "Mateo Silva", "numero_camiseta": 4, "documento_identidad": "DOC-LEO-02", "posicion": "DEFENSOR", "fecha_nacimiento": "2000-07-22", "pierna_habil": "IZQUIERDA", "altura_cm": 178, "tipo_sangre": "A+" }
```
```json
{ "equipo_id": 1, "nombre": "Luis Prado", "numero_camiseta": 9, "documento_identidad": "DOC-LEO-03", "posicion": "DELANTERO", "fecha_nacimiento": "1995-11-30", "pierna_habil": "DERECHA", "altura_cm": 181 }
```
```json
{ "equipo_id": 1, "nombre": "Diego Torres", "numero_camiseta": 8, "documento_identidad": "DOC-LEO-04", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "1999-01-10", "pierna_habil": "AMBIDESTRO", "altura_cm": 176 }
```
```json
{ "equipo_id": 1, "nombre": "Pedro Gomez", "numero_camiseta": 2, "documento_identidad": "DOC-LEO-05", "posicion": "DEFENSOR", "fecha_nacimiento": "1997-05-05", "pierna_habil": "DERECHA", "altura_cm": 180 }
```

### 7.2 Equipo 2 — Tigres
```json
{ "equipo_id": 2, "nombre": "Jorge Ramirez", "numero_camiseta": 1, "documento_identidad": "DOC-TIG-01", "posicion": "ARQUERO", "fecha_nacimiento": "1996-02-20", "pierna_habil": "DERECHA", "altura_cm": 188 }
```
```json
{ "equipo_id": 2, "nombre": "Andres Lopez", "numero_camiseta": 3, "documento_identidad": "DOC-TIG-02", "posicion": "DEFENSOR", "fecha_nacimiento": "2001-09-12", "pierna_habil": "IZQUIERDA", "altura_cm": 179 }
```
```json
### 7.3 Equipos 3 y 4
```json
{ "equipo_id": 3, "nombre": "Fernando Ortiz", "numero_camiseta": 1, "documento_identidad": "DOC-CON-01", "posicion": "ARQUERO", "fecha_nacimiento": "1997-08-08", "pierna_habil": "DERECHA", "altura_cm": 186 }
```
```json
{ "equipo_id": 3, "nombre": "Hugo Cabrera", "numero_camiseta": 2, "documento_identidad": "DOC-CON-02", "posicion": "DEFENSOR", "fecha_nacimiento": "1999-03-03", "pierna_habil": "IZQUIERDA", "altura_cm": 177 }
```
```json
{ "equipo_id": 3, "nombre": "Mario Fuentes", "numero_camiseta": 7, "documento_identidad": "DOC-CON-03", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "1996-10-10", "pierna_habil": "DERECHA", "altura_cm": 175 }
```
```json
{ "equipo_id": 3, "nombre": "Rafael Pena", "numero_camiseta": 11, "documento_identidad": "DOC-CON-04", "posicion": "DELANTERO", "fecha_nacimiento": "1995-01-27", "pierna_habil": "DERECHA", "altura_cm": 184 }
```
```json
{ "equipo_id": 3, "nombre": "Ivan Salazar", "numero_camiseta": 6, "documento_identidad": "DOC-CON-05", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "2002-11-11", "pierna_habil": "AMBIDESTRO", "altura_cm": 173 }
```
```json
{ "equipo_id": 4, "nombre": "Oscar Medina", "numero_camiseta": 1, "documento_identidad": "DOC-DRA-01", "posicion": "ARQUERO", "fecha_nacimiento": "1993-07-07", "pierna_habil": "DERECHA", "altura_cm": 190 }
```
```json
{ "equipo_id": 4, "nombre": "Pablo Nunez", "numero_camiseta": 4, "documento_identidad": "DOC-DRA-02", "posicion": "DEFENSOR", "fecha_nacimiento": "1998-05-19", "pierna_habil": "DERECHA", "altura_cm": 181 }
```
```json
{ "equipo_id": 4, "nombre": "Julian Moreno", "numero_camiseta": 8, "documento_identidad": "DOC-DRA-03", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "2000-02-14", "pierna_habil": "IZQUIERDA", "altura_cm": 176 }
```
```json
{ "equipo_id": 4, "nombre": "Daniel Aguirre", "numero_camiseta": 9, "documento_identidad": "DOC-DRA-04", "posicion": "DELANTERO", "fecha_nacimiento": "1996-09-09", "pierna_habil": "DERECHA", "altura_cm": 182 }
```
```json
{ "equipo_id": 4, "nombre": "Sergio Campos", "numero_camiseta": 3, "documento_identidad": "DOC-DRA-05", "posicion": "DEFENSOR", "fecha_nacimiento": "1999-12-20", "pierna_habil": "DERECHA", "altura_cm": 179 }
```

### 7.4 Comodines veteranos (Sub-35, `comodines_cantidad: 2`)
```json
{ "equipo_id": 1, "nombre": "Martin Veterano", "numero_camiseta": 15, "documento_identidad": "DOC-LEO-99", "posicion": "DELANTERO", "fecha_nacimiento": "1980-06-01", "pierna_habil": "DERECHA", "altura_cm": 180 }
```
```json
{ "equipo_id": 1, "nombre": "Raul Experiencia", "numero_camiseta": 16, "documento_identidad": "DOC-LEO-98", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "1978-04-12", "pierna_habil": "IZQUIERDA", "altura_cm": 178 }
```
Tercero (debe fallar: cupo agotado):
```json
{ "equipo_id": 1, "nombre": "Tercer Veterano Falla", "numero_camiseta": 17, "documento_identidad": "DOC-LEO-97", "posicion": "DEFENSOR", "fecha_nacimiento": "1975-01-01", "pierna_habil": "DERECHA", "altura_cm": 180 }
```

### 7.5 Editar / liberar / importar
Editar (PUT /api/jugadores/{{jugador_id}}):
```json
{ "nombre": "Luis Prado (editado)", "numero_camiseta": 9, "telefono": "+549119999999", "altura_cm": 182, "pierna_habil": "IZQUIERDA", "posicion": "DELANTERO" }
```
Liberar: `POST /api/jugadores/{{jugador_id}}/liberar` con `{}`. Eliminar: `DELETE /api/jugadores/{{jugador_id}}`.
Importar (POST /api/equipos/{{equipo_id}}/jugadores/importar):
```json
{ "jugadores": [{ "_fila": 1, "nombre": "Importado Uno", "numero_camiseta": 20, "documento_identidad": "DOC-IMP-01", "posicion": "DELANTERO", "fecha_nacimiento": "1999-01-01" }, { "_fila": 2, "nombre": "Importado Dos", "numero_camiseta": 21, "documento_identidad": "DOC-IMP-02", "posicion": "DEFENSOR", "fecha_nacimiento": "2000-02-02" }, { "_fila": 3, "nombre": "", "numero_camiseta": 22, "documento_identidad": "DOC-IMP-03", "posicion": "DELANTERO", "fecha_nacimiento": "2001-03-03" }, { "_fila": 4, "nombre": "Duplicado Doc", "numero_camiseta": 23, "documento_identidad": "DOC-IMP-01", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "2002-04-04" }] }
```

---

{ "equipo_id": 2, "nombre": "Camilo Vargas", "numero_camiseta": 10, "documento_identidad": "DOC-TIG-03", "posicion": "MEDIOCAMPISTA", "fecha_nacimiento": "1998-12-01", "pierna_habil": "DERECHA", "altura_cm": 174 }
```
```json
{ "equipo_id": 2, "nombre": "Ricardo Mendez", "numero_camiseta": 9, "documento_identidad": "DOC-TIG-04", "posicion": "DELANTERO", "fecha_nacimiento": "1994-06-18", "pierna_habil": "DERECHA", "altura_cm": 183 }
```
```json
{ "equipo_id": 2, "nombre": "Santiago Cruz", "numero_camiseta": 5, "documento_identidad": "DOC-TIG-05", "posicion": "DEFENSOR", "fecha_nacimiento": "2000-04-25", "pierna_habil": "DERECHA", "altura_cm": 182 }
```

---

## 8. Inscripción pública (sección 7 — sin login)

- Info: `GET /api/inscripcion/{{slug}}`.
- Registrar (POST /api/inscripcion/{{slug}}):
```json
{ "nombre": "Nicolas Publico", "numero_camiseta": 18, "documento_identidad": "DOC-PUB-01", "posicion": "DELANTERO", "fecha_nacimiento": "2000-05-05", "telefono": "+549113330001", "pierna_habil": "DERECHA", "altura_cm": 180, "tipo_sangre": "O+", "eps": "Sura", "contacto_emergencia": "Padre +549113330099", "alergias": "Ninguna" }
```
- Navegador: `http://localhost:5173/r/{{slug}}`.
- Negativo nombre vacío:
```json
{ "nombre": "", "posicion": "DELANTERO", "fecha_nacimiento": "2000-05-05" }
```

---
## 9. Partidos — programación y resultados (sección 8.1)

> Listar: `GET /api/partidos?torneo_id={{torneo_id}}` · Ver: `GET /api/partidos/{{partido_id}}`

### 9.1 Crear manual (POST /api/partidos)
```json
{ "torneo_id": 1, "fase_id": 1, "equipo_local_id": 1, "equipo_visitante_id": 2, "jornada": 1 }
```
```json
{ "torneo_id": 1, "fase_id": 1, "equipo_local_id": 3, "equipo_visitante_id": 4, "jornada": 1 }
```
Negativo mismo equipo:
```json
{ "torneo_id": 1, "equipo_local_id": 1, "equipo_visitante_id": 1, "jornada": 1 }
```

### 9.2 Programar fecha (POST /api/partidos/{{partido_id}}/programar)
```json
{ "fecha_programada": "2026-10-05T18:00:00" }
```
```json
{ "fecha_programada": "2026-10-12T20:30:00" }
```
Formato con Z también vale: `2026-10-05T21:00:00Z`.

### 9.3 Aplazar y reprogramar (POST /api/partidos/{{partido_id}}/aplazar)
```json
{}
```
Luego reprogramar con 9.2 vuelve a `PENDIENTE`.

### 9.4 Resultados (POST /api/partidos/{{partido_id}}/resultado)
Gana local 2-1:
```json
{ "goles_local": 2, "goles_visitante": 1 }
```
Empate 0-0:
```json
{ "goles_local": 0, "goles_visitante": 0 }
```
Gana visita 1-3:
```json
{ "goles_local": 1, "goles_visitante": 3 }
```
Marcador en vivo sin cerrar (POST /api/partidos/{{partido_id}}/marcador):
```json
{ "goles_local": 1, "goles_visitante": 0 }
```

### 9.5 Walkover (POST /api/partidos/{{partido_id}}/w)
Gana local por W (usa `marcador_w` del reglamento):
```json
{ "bando": "LOCAL" }
```
Gana visita por W:
```json
{ "bando": "VISITANTE" }
```
Negativo:
```json
{ "bando": "NINGUNO" }
```
## 10. Alineaciones (sección 8.2)

> Ver: `GET /api/partidos/{{partido_id}}/alineacion`. Solo con partido `PENDIENTE`.

### 10.1 Convocar (POST /api/partidos/{{partido_id}}/alineacion)
Titulares equipo local (ajusta `jugador_id` reales):
```json
{ "jugador_id": 1, "titular": true, "numero_camiseta": 1 }
```
```json
{ "jugador_id": 2, "titular": true, "numero_camiseta": 4 }
```
```json
{ "jugador_id": 3, "titular": true, "numero_camiseta": 9 }
```
Suplente:
```json
{ "jugador_id": 4, "titular": false }
```
Negativo dorsal duplicado mismo equipo (debe fallar):
```json
{ "jugador_id": 5, "titular": true, "numero_camiseta": 9 }
```

### 10.2 Formación táctica (POST /api/partidos/{{partido_id}}/alineacion/orden)
```json
{ "equipo_id": 1, "items": [{ "jugador_id": 1, "posicion": "POR", "orden": 0 }, { "jugador_id": 2, "posicion": "DEF", "orden": 1 }, { "jugador_id": 3, "posicion": "DEL", "orden": 0 }] }
```
Posiciones válidas: `POR DEF MED DEL OTROS`.
Quitar de alineación: `DELETE /api/partidos/{{partido_id}}/alineacion/{{jugador_id}}`.

---
## 11. Eventos (sección 8.3)

> Listar: `GET /api/eventos?partido_id={{partido_id}}`. Tipos: `GOL AUTOGOL TARJETA_AMARILLA TARJETA_ROJA CAMBIO`.
> No se permiten en partido finalizado.

### 11.1 Goles y autogol (POST /api/eventos)
```json
{ "partido_id": 1, "jugador_id": 3, "tipo": "GOL", "minuto": 23, "descripcion": "Remate cruzado" }
```
```json
{ "partido_id": 1, "jugador_id": 8, "tipo": "GOL", "minuto": 55, "descripcion": "Cabeza tras corner" }
```
```json
{ "partido_id": 1, "jugador_id": 12, "tipo": "AUTOGOL", "minuto": 70, "descripcion": "En propia puerta" }
```

### 11.2 Tarjetas (doble amarilla + roja directa)
```json
{ "partido_id": 1, "jugador_id": 2, "tipo": "TARJETA_AMARILLA", "minuto": 30, "descripcion": "Falta tactica" }
```
```json
{ "partido_id": 1, "jugador_id": 2, "tipo": "TARJETA_AMARILLA", "minuto": 63, "descripcion": "Segunda amarilla" }
```
```json
{ "partido_id": 1, "jugador_id": 5, "tipo": "TARJETA_ROJA", "minuto": 85, "descripcion": "Entrada dura" }
```

### 11.3 Cambio (mismo equipo, entra != sale)
```json
{ "partido_id": 1, "tipo": "CAMBIO", "jugador_id": 4, "jugador_sale_id": 3, "equipo_id": 1, "minuto": 65, "descripcion": "Cambio ofensivo" }
```
Negativo equipos distintos:
```json
{ "partido_id": 1, "tipo": "CAMBIO", "jugador_id": 4, "jugador_sale_id": 8, "minuto": 70 }
```
Eliminar evento: `DELETE /api/eventos/{{evento_id}}`.

---


---

## 12. Partido en vivo (sección 8.4)

- Ver: `GET /api/partidos/{{partido_id}}/en_vivo`.
- Guardar cronómetro (POST /api/partidos/{{partido_id}}/en_vivo):
```json
{ "seg": 0, "running": false, "iniciado": false }
```
```json
{ "seg": 60, "running": true, "iniciado": true }
```
```json
{ "seg": 2700, "running": false, "iniciado": true }
```
```json
{ "seg": 5400, "running": false, "iniciado": true }
```
Máximo 5400 s (90:00). Público: `GET /api/landing/partido/{{partido_id}}/vivo`.

---
## 13. Panel de estadísticas (sección 10 — requiere login)

- Tabla: `GET /api/panel/{{torneo_id}}/tabla` (PJ PG PE PP GF GC DF TA TR PTS + `clasifica`).
- Goleadores: `GET /api/panel/{{torneo_id}}/goleadores` y `GET /api/panel/{{torneo_id}}/goleadores?top=5`.
- Sanciones: `GET /api/panel/{{torneo_id}}/sanciones` (suspendidos por 2 amarillas / roja según reglamento).
- Resumen: `GET /api/panel/{{torneo_id}}/resumen`.
- Públicos (sin login): `GET /api/landing/torneo/{{torneo_id}}/tabla|goleadores|sanciones|resumen|partidos`.

---
## 14. Landing pública (sección 11)

### 14.1 Ver pública (sin login)
- `GET /api/landing/{{slug}}` (ej. `liga-osdosoft`, `cancha-central`).
- Navegador: `http://localhost:5173/l/{{slug}}`.
- Datos torneo: `GET /api/landing/torneo/{{torneo_id}}/partidos`, `/tabla`, `/goleadores?top=10`, `/sanciones`, `/resumen`.
- Partido: `GET /api/landing/partido/{{partido_id}}/eventos`, `/alineaciones`, `/vivo`.

### 14.2 Editor (PUT /api/landing/manage — ORGANIZADOR)
Mínimo:
```json
{ "organizador": { "name": "Liga Cancha Central", "welcome_message": "Bienvenidos", "primary_color": "#16a34a" }, "landing": { "hero_title": "Liga Cancha Central", "hero_subtitle": "Fútbol amateur" } }
```
Completo copiar-pegar:
```json
{ "organizador": { "name": "Liga Cancha Central", "description": "Torneos barriales todo el año", "whatsapp": "+549113334444", "address": "Av. Central 1234", "primary_color": "#16a34a", "welcome_message": "Bienvenidos a Cancha Central", "logo_url": "" }, "landing": { "hero_title": "Liga Cancha Central", "hero_subtitle": "El torneo del barrio", "banner_url": "", "about_title": "Sobre nosotros", "about_text": "Organizamos torneos con reglamento claro y tablas en vivo.", "about_image_url": "", "features_title": "Servicios", "features": [{ "icon": "award", "title": "Torneos anuales", "description": "Copas y ligas todo el año" }, { "icon": "users", "title": "Inscripción online", "description": "Equipos y jugadores con ficha completa" }], "gallery_title": "Galería", "gallery_images": [{ "url": "", "caption": "Final 2025" }], "contact_email": "info@canchacentral.com", "contact_phone": "+549113334444", "address": "Av. Central 1234", "social_facebook": "https://facebook.com/canchacentral", "social_instagram": "https://instagram.com/canchacentral", "social_whatsapp": "https://wa.me/549113334444", "social_twitter": "", "social_youtube": "", "show_about": true, "show_features": true, "show_gallery": true, "show_contact": true, "show_footer_social": true, "show_registration": true, "footer_text": "Sumá tu equipo" } }
```
- Ver editor: `GET /api/landing/manage`. Borrar: `DELETE /api/landing/manage`.
- Subir imagen (multipart `file`, máx 5 MB, png/jpg/jpeg/gif/webp/svg): `POST /api/landing/upload-image`.

---
## 15. Planilla minuto a minuto (sección 9) + Config (sección 12)

Planilla (`/planilla`): cronómetro + botones GOL/TARJETA/CAMBIO + `POST .../marcador`, `POST /api/eventos`, `POST .../en_vivo`, anular último gol (`DELETE /api/eventos/{{id}}`), finalizar (`POST .../resultado`). Reusa datos 9–12.
Config: modo oscuro/claro (localStorage), ver cuenta (`GET /api/auth/me`), salir (borra `tf_token`/`tf_user`).

---
## 16. Orden sugerido (guion de 30 min)

1. Login SUPERADMIN → crear `cancha-central` + manager → login manager → crear STAFF.
2. Crear `Copa Apertura 2026` → poner reglas 3.1 → crear 4 equipos → crear 5 jugadores por equipo.
3. Generar link de equipo → probar `/r/{{slug}}` en incógnito → importar plantilla → probar duplicado/edad.
4. Avanzar estados hasta `SORTEADO` → generar fixture → programar fechas → pasar a `EN_JUEGO`.
5. Planilla: alinear → en vivo → goles/tarjetas/cambio → W en otro partido → resultados.
6. Ver tabla/goleadores/sanciones → configurar landing → ver `/l/{{slug}}` en incógnito.
7. Generar fase final → jugar final → `FINALIZADO` → probar negativos y borrados.

### Chuleta de IDs
```
org_cancha_central = __  torneo_apertura = __  fase_id = __
equipo_leones = __  equipo_tigres = __  equipo_condores = __  equipo_dragones = __
partido_1 = __  partido_2 = __  slug_inscripcion = ________  slug_landing = cancha-central
```

