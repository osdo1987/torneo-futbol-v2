# Test: sanciones acumuladas + clasificacion a la fase final (torneo de prueba, se elimina al final)
$ErrorActionPreference = 'Stop'
$U = 'http://localhost:5010/api'
$login = Invoke-RestMethod -Uri "$U/auth/login" -Method Post -ContentType 'application/json' `
  -Body (@{ email = 'manager@demo.com'; password = 'manager123' } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.token)" }

# 1) Torneo de prueba (4 equipos, 1 ronda = 6 partidos / 3 jornadas)
$tn = Invoke-RestMethod -Uri "$U/torneos" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ organizador_id = 1; nombre = 'PRUEBA FINAL + SANCIONES'; max_jugadores_por_equipo = 30; inscripciones_jugadores_abiertas = $true } | ConvertTo-Json)
$rl = Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/reglas" -Method Put -Headers $h -ContentType 'application/json' `
  -Body (@{ rondas = 1; clasifican_a_final = 2; fechas_doble_amarilla = 1; fechas_roja_directa = 2; marcador_w = 3 } | ConvertTo-Json)
Write-Host "1) TORNEO id=$($tn.id) | clasifican=$($rl.reglas.clasifican_a_final) roja=$($rl.reglas.fechas_roja_directa) fechas"

# 2) Equipos + fixture
$ids = @{}
foreach ($n in @('Alfa','Beta','Gamma','Delta')) {
  $e = Invoke-RestMethod -Uri "$U/equipos" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{ torneo_id = $tn.id; nombre = $n } | ConvertTo-Json)
  $ids[$n] = $e.id
}
$fx = Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/fixture" -Method Post -Headers $h -ContentType 'application/json' -Body '{}'
Write-Host "2) FIXTURE: $($fx.partidos) partidos / $($fx.jornadas) jornadas"

# 3) Un jugador por equipo
$jug = @{}
$i = 0
foreach ($n in @('Alfa','Beta','Gamma','Delta')) {
  $i++
  $j = Invoke-RestMethod -Uri "$U/jugadores" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{ equipo_id = $ids[$n]; nombre = "Jugador $n"; numero_camiseta = $i; fecha_nacimiento = '1980-01-15' } | ConvertTo-Json)
  $jug[$n] = $j.id
}

$ps = Invoke-RestMethod -Uri "$U/partidos?torneo_id=$($tn.id)" -Headers $h
$de = { param($a, $b) ($ps | Where-Object { ($_.equipo_local_id -in @($ids[$a], $ids[$b])) -and ($_.equipo_visitante_id -in @($ids[$a], $ids[$b])) } | Select-Object -First 1) }
$pA1 = & $de 'Alfa' 'Beta'; $pA2 = ($ps | Where-Object { ($_.equipo_local_id -eq $ids['Alfa'] -or $_.equipo_visitante_id -eq $ids['Alfa']) -and $_.jornada -eq 2 } | Select-Object -First 1)
$pB1 = & $de 'Beta' 'Gamma'
if (-not $pB1) { $pB1 = & $de 'Beta' 'Delta' }

# 4) Tarjetas ANTES de los resultados (eventos solo en PENDIENTE)
Invoke-RestMethod -Uri "$U/eventos" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ partido_id = $pA1.id; jugador_id = $jug['Alfa']; tipo = 'TARJETA_AMARILLA'; minuto = 10 } | ConvertTo-Json) | Out-Null
Invoke-RestMethod -Uri "$U/eventos" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ partido_id = $pA2.id; jugador_id = $jug['Alfa']; tipo = 'TARJETA_AMARILLA'; minuto = 20 } | ConvertTo-Json) | Out-Null
Invoke-RestMethod -Uri "$U/eventos" -Method Post -Headers $h -ContentType 'application/json' `
  -Body (@{ partido_id = $pB1.id; jugador_id = $jug['Beta']; tipo = 'TARJETA_ROJA'; minuto = 30 } | ConvertTo-Json) | Out-Null
Write-Host "4) TARJETAS: 2 amarillas J1+J2 (Jugador Alfa) y 1 roja J1 (Jugador Beta)"

# 5) Resultados: Alfa y Beta ganan todo -> empate 9 pts, desempata DIF_GOL
foreach ($p in $ps) {
  $gl = 0; $gv = 0
  if ($p.equipo_local_id -eq $ids['Alfa']) { $gl = 3 } elseif ($p.equipo_visitante_id -eq $ids['Alfa']) { $gv = 3 }
  elseif ($p.equipo_local_id -eq $ids['Beta']) { $gl = 2 } elseif ($p.equipo_visitante_id -eq $ids['Beta']) { $gv = 2 }
  elseif ($p.equipo_local_id -eq $ids['Gamma']) { $gl = 1 } elseif ($p.equipo_visitante_id -eq $ids['Gamma']) { $gv = 1 }
  Invoke-RestMethod -Uri "$U/partidos/$($p.id)/resultado" -Method Post -Headers $h -ContentType 'application/json' `
    -Body (@{ goles_local = $gl; goles_visitante = $gv } | ConvertTo-Json) | Out-Null
}
Write-Host '5) RESULTADOS registrados (6 partidos)'

# 6) Sanciones
$sc = Invoke-RestMethod -Uri "$U/panel/$($tn.id)/sanciones" -Headers $h
foreach ($s in $sc.sanciones) {
  Write-Host "6) SANCION: $($s.jugador) [$($s.equipo)] ðŸŸ¨$($s.amarillas) ðŸŸ¥$($s.rojas) suspendido=$($s.suspendido) hasta J$($s.suspendido_hasta_jornada)"
}

# 7) Tabla con clasificados
$tb = Invoke-RestMethod -Uri "$U/panel/$($tn.id)/tabla" -Headers $h
$tb.posiciones | ForEach-Object { Write-Host "7) TABLA: $($_.pos). $($_.equipo) PTS=$($_.PTS) DF=$($_.DF) TA=$($_.TA) TR=$($_.TR) clasifica=$($_.clasifica)" }

# 8) Fase final (los 2 primeros)
$ff = Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/fase-final" -Method Post -Headers $h -ContentType 'application/json' -Body '{}'
Write-Host "8) FASE FINAL: $($ff.fase) -> $(($ff.partidos | ForEach-Object { "$($_.local) vs $($_.visitante)" }) -join ' | ')"

# 9) Duplicado debe fallar
try {
  Invoke-RestMethod -Uri "$U/torneos/$($tn.id)/fase-final" -Method Post -Headers $h -ContentType 'application/json' -Body '{}' | Out-Null
  Write-Host '9) DUPLICADO: PERMITIDO (INESPERADO)'
} catch {
  Write-Host "9) DUPLICADO -> HTTP $($_.Exception.Response.StatusCode.value__) (esperado 400)"
}

# 10) Limpieza
Invoke-RestMethod -Uri "$U/torneos/$($tn.id)" -Method Delete -Headers $h | Out-Null
Write-Host '10) CLEANUP: torneo de prueba eliminado'

