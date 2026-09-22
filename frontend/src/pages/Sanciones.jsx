import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import PageHeader from '../components/PageHeader'
import Grid from '@mui/material/Grid'
import { apiGet } from '../api'

const BARRA_COLS = 'minmax(0,1fr) 3.1rem 3.1rem minmax(9rem,auto)'

export default function Sanciones({ selectedTorneoId }) {
  const [equipoSel, setEquipoSel] = useState('')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sanciones', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/sanciones`),
    enabled: !!selectedTorneoId,
  })

  const [prevTorneo, setPrevTorneo] = useState(selectedTorneoId)
  if (selectedTorneoId !== prevTorneo) {
    setPrevTorneo(selectedTorneoId)
    setEquipoSel('')
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver las sanciones.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  const sanciones = data?.sanciones || []
  const suspendidos = sanciones.filter((s) => s.suspendido)
  const totalAmarillas = sanciones.reduce((acc, s) => acc + (s.amarillas || 0), 0)
  const totalRojas = sanciones.reduce((acc, s) => acc + (s.rojas || 0), 0)

  const porEquipo = {}
  sanciones.forEach((s) => {
    (porEquipo[s.equipo] = porEquipo[s.equipo] || []).push(s)
  })

  const equipos = Object.entries(porEquipo)
    .map(([nombre, jugadores]) => ({
      nombre,
      jugadores: [...jugadores].sort((a, b) => (b.rojas - a.rojas) || (b.amarillas - a.amarillas)),
      amarillas: jugadores.reduce((acc, s) => acc + (s.amarillas || 0), 0),
      rojas: jugadores.reduce((acc, s) => acc + (s.rojas || 0), 0),
      suspendidos: jugadores.filter((s) => s.suspendido).length,
    }))
    .sort((a, b) => (b.suspendidos - a.suspendidos) || ((b.rojas + b.amarillas) - (a.rojas + a.amarillas)))

  const activo = equipos.find((e) => e.nombre === equipoSel) || equipos[0]

  const celdasHeader = (label, justify = 'flex-start') => (
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary', justifyContent: justify, display: 'flex', alignItems: 'center' }}>{label}</Typography>
  )

  return (
    <Box>
      <PageHeader title="Sanciones" subtitle={`${data?.torneo} — acumulado por jugador (y técnicos) según el reglamento.`} />

      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Amarillas', value: totalAmarillas, color: 'warning' },
          { label: 'Rojas', value: totalRojas, color: 'error' },
          { label: 'Jugadores suspendidos', value: suspendidos.length, color: 'error' },
          { label: 'Equipos con tarjetas', value: equipos.length, color: 'info' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card elevation={0} sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Typography variant="h4" fontWeight={800} color={`${s.color}.main`}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {equipos.length === 0 ? (
        <Alert severity="info">No hay sanciones registradas en este torneo.</Alert>
      ) : (
        <Box>
          {/* Pestañas por equipo */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
            {equipos.map((equipo) => {
              const active = equipo.nombre === activo.nombre
              return (
                <Button
                  key={equipo.nombre}
                  size="small"
                  onClick={() => setEquipoSel(equipo.nombre)}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: 99, px: 1.5, minHeight: 36, gap: 0.6,
                    bgcolor: active ? 'primary.main' : 'background.default',
                    color: active ? 'primary.contrastText' : 'text.primary',
                    border: '1px solid', borderColor: active ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                  }}
                >
                  {equipo.nombre}
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'rgba(255,193,7,0.15)', color: active ? '#fff' : 'warning.dark' }}>
                    <span aria-hidden>🟨</span>{equipo.amarillas}
                  </Box>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'rgba(211,47,47,0.12)', color: active ? '#fff' : 'error.main' }}>
                    <span aria-hidden>🟥</span>{equipo.rojas}
                  </Box>
                  {equipo.suspendidos > 0 && (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'rgba(211,47,47,0.14)', color: active ? '#fff' : 'error.dark' }}>
                      <span aria-hidden>⛔</span>{equipo.suspendidos}
                    </Box>
                  )}
                </Button>
              )
            })}
          </Box>

          {/* Tabla compacta de amonestados */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: BARRA_COLS, alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: 'rgba(0,0,0,0.045)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {celdasHeader('Jugador')}
              {celdasHeader('Amarillas', 'center')}
              {celdasHeader('Rojas', 'center')}
              {celdasHeader('Estado')}
            </Box>
            {activo.jugadores.map((s, i) => (
              <Box key={`${s.jugador_id ?? 'tec'}-${s.jugador}-${s.equipo}`} sx={{
                display: 'grid', gridTemplateColumns: BARRA_COLS, alignItems: 'center', gap: 1,
                px: 2, py: 0.55,
                borderBottom: i === activo.jugadores.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                bgcolor: i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.045)' },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: s.suspendido ? 'text.secondary' : 'text.primary' }}>{s.jugador}</Typography>
                  {s.tipo_sancionado === 'TECNICO' && (
                    <Box component="span" sx={{ flexShrink: 0, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(29,78,216,0.10)', color: 'primary.main', letterSpacing: '0.04em' }}>
                      TÉCNICO
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 800, textAlign: 'center', color: s.amarillas > 0 ? 'warning.main' : 'text.disabled' }}>🟨 {s.amarillas}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 800, textAlign: 'center', color: s.rojas > 0 ? 'error.main' : 'text.disabled' }}>🟥 {s.rojas}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: s.suspendido ? 'error.main' : 'success.main' }}>
                  {s.suspendido ? `Suspendido hasta J. ${s.suspendido_hasta_jornada}` : 'Disponible'}
                </Typography>
              </Box>
            ))}
          </Card>
        </Box>
      )}
    </Box>
  )
}