import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import { apiGet } from '../api'

const ESTADO_LABEL = {
  CREADO: ['Creado', 'default'],
  INSCRIPCIONES_ABIERTAS: ['Inscripciones abiertas', 'success'],
  INSCRIPCIONES_CERRADAS: ['Inscripciones cerradas', 'warning'],
  SORTEADO: ['Sorteado', 'info'],
  EN_JUEGO: ['En juego', 'primary'],
  FINALIZADO: ['Finalizado', 'error'],
}

export default function Dashboard({ user, selectedTorneoId }) {
  const { data: torneos = [], isLoading, isError, error } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
  })

  const torneoId = selectedTorneoId || torneos[0]?.id

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['resumen', torneoId],
    queryFn: () => apiGet(`/panel/${torneoId}/resumen`),
    enabled: !!torneoId,
  })

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  if (torneos.length === 0) {
    return (
      <Alert severity="info">
        Aún no tienes torneos. Ve a la sección <b>Torneos</b> para crear el primero.
      </Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Hola {user?.email} — resumen general del torneo activo.
      </Typography>

      {loadingResumen ? <CircularProgress /> : resumen && (
        <>
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Equipos', value: resumen.equipos },
              { label: 'Partidos', value: resumen.partidos },
              { label: 'Partidos jugados', value: resumen.partidos_jugados },
              { label: 'Líder', value: resumen.goleador ?? '—' },
            ].map((s) => (
              <Grid item xs={12} sm={6} md={3} key={s.label}>
                <Card elevation={0} sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" fontWeight={600} mb={1}>Mis torneos</Typography>
          <Grid container spacing={2}>
            {torneos.map((t) => {
              const [label, color] = ESTADO_LABEL[t.estado] || [t.estado, 'default']
              return (
                <Grid item xs={12} md={6} key={t.id}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>{t.nombre}</Typography>
                        <Chip label={label} color={color} size="small" />
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Máx. jugadores/equipo: {t.max_jugadores_por_equipo} · Puntos: G{t.puntos_victoria} E{t.puntos_empate} P{t.puntos_derrota}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </>
      )}
    </Box>
  )
}
