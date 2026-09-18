import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import {
  Groups as GroupsIcon,
  SportsSoccer as SportsIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material'
import { apiGet, apiPost, apiDelete } from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'

const MAX_TITULARES = 11

const fmtFecha = (iso) => {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

const RESULTADO_LABEL = { PENDIENTE: 'Pendiente', JUGADO: 'Jugado', SUSPENDIDO: 'Suspendido' }

export default function MiEquipo({ user, selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const miEq = Number(user?.equipoId)
  const [partidoSel, setPartidoSel] = useState(null)

  const { data: partidos = [], isLoading: loadingPartidos } = useQuery({
    queryKey: ['partidos', selectedTorneoId],
    queryFn: () => apiGet(`/partidos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos', selectedTorneoId],
    queryFn: () => apiGet(`/equipos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: equipo } = useQuery({
    queryKey: ['equipo', miEq],
    queryFn: () => apiGet(`/equipos/${miEq}`),
    enabled: !!miEq,
  })

  const { data: plantel = [], isLoading: loadingPlantel } = useQuery({
    queryKey: ['plantel', miEq],
    queryFn: () => apiGet(`/equipos/${miEq}/jugadores`),
    enabled: !!miEq,
  })

  const { data: alineacion = [], isLoading: loadingAlineacion } = useQuery({
    queryKey: ['alineacion', partidoSel?.id],
    queryFn: () => apiGet(`/partidos/${partidoSel.id}/alineacion`),
    enabled: !!partidoSel?.id,
  })

  const alinearMut = useMutation({
    mutationFn: ({ partidoId, jugadorId, titular, numeroCamiseta }) => {
      const body = { jugador_id: jugadorId, titular }
      if (numeroCamiseta !== undefined) body.numero_camiseta = numeroCamiseta
      return apiPost(`/partidos/${partidoId}/alineacion`, body)
    },
    onSuccess: () => { qc.invalidateQueries(['alineacion', partidoSel?.id]); toast.show('Alineación actualizada', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const desalinearMut = useMutation({
    mutationFn: ({ partidoId, jugadorId }) => apiDelete(`/partidos/${partidoId}/alineacion/${jugadorId}`),
    onSuccess: () => { qc.invalidateQueries(['alineacion', partidoSel?.id]) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  if (!miEq) {
    return <Alert severity="info">Tu cuenta aún no tiene un equipo asignado. Pedile al organizador que te asigne el rol DELEGADO con tu equipo.</Alert>
  }

  const misPartidos = partidos.filter((p) => Number(p.equipo_local_id) === miEq || Number(p.equipo_visitante_id) === miEq)
  const nombreDe = (id) => equipos.find((x) => String(x.id) === String(id))?.nombre || `Equipo #${id}`
  const esLocal = (p) => Number(p.equipo_local_id) === miEq

  const disponibles = plantel.filter((j) => j.activo !== false && !alineacion.some((a) => a.jugador_id === j.id))
  const convocados = plantel.filter((j) => alineacion.some((a) => a.jugador_id === j.id))
  const alineacionDe = (jugadorId) => alineacion.find((a) => a.jugador_id === jugadorId)
  const titularesCount = alineacion.filter((a) => a.titular).length

  if (loadingPartidos) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>

  return (
    <Box>
      <PageHeader
        overline="Mi equipo"
        title={equipo?.nombre || 'Mi equipo'}
        subtitle={user?.equipoName || 'Gestión de alineaciones de tu equipo para cada partido del torneo.'}
      />

      {misPartidos.length === 0 ? (
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <GroupsIcon sx={{ fontSize: 42, opacity: 0.35, mb: 1 }} />
            <Typography color="text.secondary">No hay partidos registrados para tu equipo todavía.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {misPartidos.map((p) => {
            const jugado = p.resultado !== 'PENDIENTE'
            const rivalId = esLocal(p) ? p.equipo_visitante_id : p.equipo_local_id
            return (
              <Card key={p.id} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2.5 }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip size="small" label={`Jornada ${p.jornada}`} sx={{ fontWeight: 700 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: 12 }}>
                      <CalendarTodayIcon sx={{ fontSize: 13 }} /> {fmtFecha(p.fecha_programada)}
                    </Box>
                    <Chip size="small" label={RESULTADO_LABEL[p.resultado] || p.resultado}
                      color={jugado ? 'default' : 'primary'} variant={jugado ? 'outlined' : 'filled'} sx={{ fontWeight: 700 }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
                      {esLocal(p) ? 'Local' : 'Visitante'} · vs {nombreDe(rivalId)}
                      {jugado && (
                        <Box component="span" sx={{ color: esLocal(p) ? '#006846' : 'text.secondary', ml: 1 }}>
                          {esLocal(p) ? `${p.goles_local} - ${p.goles_visitante}` : `${p.goles_visitante} - ${p.goles_local}`}
                        </Box>
                      )}
                    </Typography>
                    <Button
                      variant={jugado ? 'outlined' : 'contained'}
                      size="small"
                      startIcon={<AssignmentIcon sx={{ fontSize: 17 }} />}
                      onClick={() => setPartidoSel(p)}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, py: 0.75 }}
                    >
                      {jugado ? 'Ver acta' : 'Cargar alineación'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        Cargás la <b>alineación</b> (convocatoria de jugadores y titulares) de tus partidos pendientes. Las anotaciones y la homologación final las hace el árbitro.
      </Alert>

      <Dialog open={!!partidoSel} onClose={() => setPartidoSel(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>
          Alineación · J{partidoSel?.jornada}
          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
            Partido #{partidoSel?.id} · {titularesCount} / {MAX_TITULARES} titulares
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {loadingPlantel || loadingAlineacion ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box>
              <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                <InputLabel>Agregar convocado</InputLabel>
                <Select
                  label="Agregar convocado"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return
                    alinearMut.mutate({ partidoId: partidoSel.id, jugadorId: e.target.value, titular: false })
                  }}
                >
                  {disponibles.length === 0 && <MenuItem value="" disabled><em>No quedan jugadores por agregar</em></MenuItem>}
                  {disponibles.map((j) => (
                    <MenuItem key={j.id} value={String(j.id)}>
                      {j.numero_camiseta ? `#${j.numero_camiseta} ` : ''}{j.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {convocados.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Todavía no agregaste jugadores a este partido.
                </Typography>
              ) : (
                convocados.map((j, idx) => {
                  const al = alineacionDe(j.id)
                  const num = al?.numero_camiseta ?? j.numero_camiseta
                  const esTitular = !!al?.titular
                  return (
                    <Box key={j.id}>
                      {idx > 0 && <Divider sx={{ my: 1 }} />}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={esTitular ? 'T' : 'S'}
                          color={esTitular ? 'primary' : 'default'} onClick={() => {
                            if (esTitular) {
                              alinearMut.mutate({ partidoId: partidoSel.id, jugadorId: j.id, titular: false })
                            } else if (titularesCount >= MAX_TITULARES) {
                              toast.show(`Máximo ${MAX_TITULARES} titulares`, 'error')
                            } else {
                              alinearMut.mutate({ partidoId: partidoSel.id, jugadorId: j.id, titular: true })
                            }
                          }}
                          sx={{ fontWeight: 700 }} />
                        <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{j.nombre}</Typography>
                        <TextField
                          size="small"
                          label="Nº"
                          type="number"
                          value={num ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? null : Number(e.target.value)
                            if (v !== null && (v < 0 || v > 999)) return
                            alinearMut.mutate({ partidoId: partidoSel.id, jugadorId: j.id, titular: esTitular, numeroCamiseta: v })
                          }}
                          inputProps={{ style: { width: 56, textAlign: 'center' } }}
                        />
                        <IconButton size="small" color="error" onClick={() => desalinearMut.mutate({ partidoId: partidoSel.id, jugadorId: j.id })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  )
                })
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPartidoSel(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}