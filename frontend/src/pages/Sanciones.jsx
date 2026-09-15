import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import PageHeader from '../components/PageHeader'
import Grid from '@mui/material/Grid'
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material'
import { apiGet } from '../api'

export default function Sanciones({ selectedTorneoId }) {
  const [abiertos, setAbiertos] = useState({})
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sanciones', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/sanciones`),
    enabled: !!selectedTorneoId,
  })

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

  const todosAbiertos = equipos.every((e) => abiertos[e.nombre])

  const toggleEquipo = (nombre) => setAbiertos((prev) => ({ ...prev, [nombre]: !prev[nombre] }))
  const toggleTodos = () => setAbiertos(todosAbiertos ? {} : Object.fromEntries(equipos.map((e) => [e.nombre, true])))

  return (
    <Box>
      <PageHeader title="Sanciones" subtitle={`${data?.torneo} — acumulado por jugador y equipo según el reglamento.`} actions={equipos.length > 0 && (<Button size="small" startIcon={todosAbiertos ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={toggleTodos}>{todosAbiertos ? 'Colapsar todos' : 'Expandir todos'}</Button>)} />

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
          {equipos.map((equipo) => (
            <Accordion key={equipo.nombre} expanded={!!abiertos[equipo.nombre]}
              onChange={() => toggleEquipo(equipo.nombre)}
              elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', '&:not(:last-child)': { mb: 1 } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>{equipo.nombre}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={`${equipo.jugadores.length} jugadores`} size="small" color="info" variant="outlined" />
                  <Chip label={`🟨 ${equipo.amarillas}`} size="small" color="warning" variant="outlined" />
                  <Chip label={`🟥 ${equipo.rojas}`} size="small" color="error" variant={equipo.rojas > 0 ? 'filled' : 'outlined'} />
                  {equipo.suspendidos > 0 && (
                    <Chip label={`${equipo.suspendidos} suspendido${equipo.suspendidos > 1 ? 's' : ''}`} size="small" color="error" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <List dense disablePadding>
                  {equipo.jugadores.map((s, i) => (
                    <Box key={s.jugador_id}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem sx={{ px: 2, py: 0.75, bgcolor: s.suspendido ? 'error.light' : 'inherit' }}>
                        <ListItemText
                          primary={s.jugador}
                          secondary={s.suspendido ? `Suspendido hasta la jornada ${s.suspendido_hasta_jornada}` : 'Disponible'}
                          primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                        />
                        <Chip label={`🟨 ${s.amarillas}`} size="small" color="warning" variant="outlined" />
                        <Chip label={`🟥 ${s.rojas}`} size="small" color="error" variant={s.rojas > 0 ? 'filled' : 'outlined'} />
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  )
}