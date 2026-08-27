# Bootstrap del HEXAGONAL 2026 (Comfenalco Buga) segun el reglamento del PDF
$ErrorActionPreference = 'Stop'
$U = 'http://localhost:5010/api'

# 1) Superadmin crea el organizador + su usuario (si no existe ya)
$sadmin = Invoke-RestMethod -Uri "$U/auth/login" -Method Post -ContentType 'application/json' `
  -Body (@{ email = 'superadmin@demo.com'; password = 'super1234' } | ConvertTo-Json)
$sh = @{ Authorization = "Bearer $($sadmin.token)" }
try {
  $org = Invoke-RestMethod -Uri "$U/auth/register-organizador" -Method Post -Headers $sh -ContentType 'application/json' `
    -Body (@{
      name = 'HEXAGONAL 2026 Comfenalco Buga'
      slug = 'hexagonal-2026'
      whatsapp = '+573166740446'
      address = 'Cancha Comfenalco Buga'
      email = 'hexagonal@demo.com'
      password = 'hexagonal2026'
    } | ConvertTo-Json)
  Write-Host "1) ORGANIZADOR creado id=$($org.organizador) usuario id=$($org.user)"
} catch {
  Write-Host "1) ORGANIZADOR ya existia (continuo)"
}

# 2) Login del organizador del Hexagonal
$login = Invoke-RestMethod -Uri "$U/auth/login" -Method Post -ContentType 'application/json' `
  -Body (@{ email = 'hexagonal@demo.com'; password = 'hexagonal2026' } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.token)" }
Write-Host "2) LOGIN hexagonal@demo.com -> $($login.user.role) [$($login.user.organizadorName)]"

# Reglamento segun el PDF
$reglas = @{
  rondas = 2
  clasifican_a_final = 2
  desempates = @('DIF_GOL','GOLES_FAVOR','MENOS_AMARILLAS','MENOS_ROJAS','GOLES_CONTRA')
  max_jugadores = 30
  bloquear_baja_tras_jugar = $true
  comodines_cantidad = 2
  comodines_edad_min = 30
  tolerancia_w_min = 10
  marcador_w = 3
  fechas_doble_amarilla = 1
  fechas_roja_directa = 2
}

# 3) Las dos categorias
$torneos = @(
  @{ nombre = 'HEXAGONAL 2026 - Menores de 37'; edad_min = $null; edad_max = 37 },
  @{ nombre = 'HEXAGONAL 2026 - Mayores de 38'; edad_min = 38;   edad_max = $null }
)
foreach ($t in $torneos) {
  $tn = Invoke-RestMethod -Uri "$U/torneos" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{
      organizador_id = $login.user.organizadorId
      nombre = $t.nombre
      max_jugadores_por_equipo = 30
      inscripciones_jugadores_abiertas = $true
      puntos_victoria = 3; puntos_empate = 1; puntos_derrota = 0
    } | ConvertTo-Json)
  $body = $reglas.Clone()
  $body['edad_min'] = $t.edad_min
  $body['edad_max'] = $t.edad_max
  $rl = Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/reglas" -Method Put -Headers $h -ContentType 'application/json' `
    -Body ($body | ConvertTo-Json)
  Write-Host "3) TORNEO id=$($tn.id) [$($t.nombre)] estado=$($tn.estado) - reglamento aplicado (edad $($t.edad_min)-$($t.edad_max))"
}

Write-Host ''
Write-Host 'CREDENCIALES DEL HEXAGONAL:'
Write-Host '  Email:    hexagonal@demo.com'
Write-Host '  Clave:    hexagonal2026'