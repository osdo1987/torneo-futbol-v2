# Test de reglas configurables + fixture + W + tabla (usa torneo de prueba, se elimina al final)
$ErrorActionPreference = 'Stop'
$U = 'http://localhost:5010/api'
$login = Invoke-RestMethod -Uri "$U/auth/login" -Method Post -ContentType 'application/json' `
  -Body (@{ email = 'manager@demo.com'; password = 'manager123' } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.token)" }

# 1) Crear torneo de prueba
$tn = Invoke-RestMethod -Uri "$U/torneos" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ organizador_id = 1; nombre = 'HEXAGONAL 2026 - PRUEBA'; max_jugadores_por_equipo = 30; inscripciones_jugadores_abiertas = $true } | ConvertTo-Json)
Write-Host "1) TORNEO id=$($tn.id) estado=$($tn.estado)"

# 2) Reglas estilo Hexagonal
$rl = Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/reglas" -Method Put -Headers $h -ContentType 'application/json' `
  -Body (@{ rondas = 2; edad_min = 38; comodines_cantidad = 2; comodines_edad_min = 30; bloquear_baja_tras_jugar = $true; marcador_w = 3; tolerancia_w_min = 10 } | ConvertTo-Json)
Write-Host "2) REGLAS: $($rl.reglas | ConvertTo-Json -Compress)"

# 3) Seis equipos
$eqids = @()
foreach ($n in @('Alfa','Beta','Gamma','Delta','Epsilon','Zeta')) {
  $e = Invoke-RestMethod -Uri "$U/equipos" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{ torneo_id = $tn.id; nombre = $n } | ConvertTo-Json)
  $eqids += $e.id
}
Write-Host "3) EQUIPOS: $($eqids -join ',')"

# 4) Fixture (2 rondas -> 30 partidos, 10 jornadas)
$fx = Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/fixture" -Method Post -Headers $h -ContentType 'application/json' -Body '{}'
Write-Host "4) FIXTURE: $($fx | ConvertTo-Json -Compress)"

# 5) Edad fuera de categoria (16 anios) -> 400
$t1 = $eqids[0]
try {
  Invoke-RestMethod -Uri "$U/jugadores" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{ equipo_id = $t1; nombre = 'Menor Test'; fecha_nacimiento = '2010-05-01' } | ConvertTo-Json) | Out-Null
  Write-Host '5) EDAD16: PERMITIDO (INESPERADO)'
} catch {
  Write-Host "5) EDAD16 -> HTTP $($_.Exception.Response.StatusCode.value__) (esperado 400)"
}

# 6) Dos comodines (36 y 34 anios) y un tercero bloqueado
$c1 = Invoke-RestMethod -Uri "$U/jugadores" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ equipo_id = $t1; nombre = 'Comodin 1'; fecha_nacimiento = '1990-05-01'; numero_camiseta = 20 } | ConvertTo-Json)
Write-Host "6a) COMODIN1 ok id=$($c1.id)"
$c2 = Invoke-RestMethod -Uri "$U/jugadores" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ equipo_id = $t1; nombre = 'Comodin 2'; fecha_nacimiento = '1992-05-01'; numero_camiseta = 21 } | ConvertTo-Json)
Write-Host "6b) COMODIN2 ok id=$($c2.id)"
try {
  Invoke-RestMethod -Uri "$U/jugadores" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{ equipo_id = $t1; nombre = 'Comodin 3'; fecha_nacimiento = '1995-05-01' } | ConvertTo-Json) | Out-Null
  Write-Host '6c) COMODIN3: PERMITIDO (INESPERADO)'
} catch {
  Write-Host "6c) COMODIN3 -> HTTP $($_.Exception.Response.StatusCode.value__) (esperado 400)"
}

# 7) W por inasistencia
$ps = Invoke-RestMethod -Uri "$U/partidos?torneo_id=$($tn.id)" -Headers $h
$p1 = ($ps | Where-Object { $_.resultado -eq 'PENDIENTE' } | Select-Object -First 1)
$w = Invoke-RestMethod -Uri "$U/partidos/$($p1.id)/w" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ bando = 'LOCAL' } | ConvertTo-Json)
Write-Host "7) W: partido $($p1.id) -> $($w.resultado) $($w.goles_local)-$($w.goles_visitante)"

# 8) Tabla con TA/TR y desempates
$tb = Invoke-RestMethod -Uri "$U/panel/$($tn.id)/tabla" -Headers $h
Write-Host "8) TABLA top2:"
$tb.posiciones | Select-Object -First 2 | ForEach-Object { Write-Host "   $($_ | ConvertTo-Json -Compress)" }

# 9) Limpieza
Invoke-RestMethod -Uri "$U/torneos/$($tn.id)" -Method Delete -Headers $h | Out-Null
Write-Host '9) CLEANUP: torneo de prueba eliminado'