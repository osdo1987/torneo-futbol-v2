import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import { apiGet, apiPost } from '../api'
import { useToast } from '../components/Toast'
import {
  Add as AddIcon, Schedule as ScheduleIcon,
  SportsSoccer as GolIcon, Square as YellowCardIcon,
  Block as RedCardIcon, EditNote as EditNoteIcon,
} from '@mui/icons-material'
import Alert from '@mui/material/Alert'

const RESULTADOS = {
  PENDIENTE: ['Pendiente', 'default'],
  POSTERGADO: ['Postergado', 'warning'],
  LOCAL_GANO: ['Local ganó', 'success'],
  VISITANTE_GANO: ['Visitante ganó', 'success'],
  EMPATE: ['Empate', 'info'],
  W_LOCAL: ['W local', 'secondary'],
  W_VISITANTE: ['W visitante', 'secondary'],
}

const ESTADOS_JUGADOS = ['LOCAL_GANO', 'VISITANTE_GANO', 'EMPATE', 'W_LOCAL', 'W_VISITANTE']

const TIPO_EVENTO_META = {
  GOL: { color: 'primary', icon: <GolIcon /> },
  TARJETA_AMARILLA: { color: 'warning', icon: <YellowCardIcon /> },
  TARJETA_ROJA: { color: 'error', icon: <RedCardIcon /> },
  AUTOGOL: { color: 'secondary', icon: <GolIcon /> },
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Partidos({ selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ equipo_local_id: '', equipo_visitante_id: '', jornada: 1 })
  const [resultOpen, setResultOpen] = useState(null)
  const [resultForm, setResultForm] = useState({ goles_local: 0, goles_visitante: 0 })
  const [wOpen, setWOpen] = useState(null)
  const [wForm, setWForm] = useState({ bando: 'LOCAL' })
  const [progOpen, setProgOpen] = useState(null)
  const [progForm, setProgForm] = useState({ fecha_programada: '' })
  const [eventosOpen, setEventosOpen] = useState(null)
  const [jornadaSel, setJornadaSel] = useState('')
  const [filtro, setFiltro] = useState('TODOS')

  const { data: partidos = [], isLoading, isError, error } = useQuery({
    queryKey: ['partidos', selectedTorneoId],
    queryFn: () => apiGet(`/partidos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos', selectedTorneoId],
    queryFn: () => apiGet(`/equipos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: eventosData, isLoading: eventosLoading } = useQuery({
    queryKey: ['eventos', eventosOpen?.id],
    queryFn: () => apiGet(`/landing/partido/${eventosOpen.id}/eventos`),
    enabled: !!eventosOpen?.id,
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/partidos', body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido creado', 'success'); setOpen(false) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const resultMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/resultado`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen'])
      toast.show('Resultado guardado', 'success'); setResultOpen(null)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const programarMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/programar`, body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido programado', 'success'); setProgOpen(null) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const aplazarMut = useMutation({
    mutationFn: (id) => apiPost(`/partidos/${id}/aplazar`, {}),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido aplazado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const wMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/w`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen'])
      toast.show('W registrado', 'success'); setWOpen(null)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate({
      ...form, torneo_id: selectedTorneoId,
      equipo_local_id: Number(form.equipo_local_id), equipo_visitante_id: Number(form.equipo_visitante_id),
    })
  }

  const handleResult = (e) => {
    e.preventDefault()
    resultMut.mutate({ id: resultOpen.id, body: resultForm })
  }

  const eqName = (id) => equipos.find((x) => String(x.id) === String(id))?.nombre || `Equipo #${id}`

  const jornadas = [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b)

  const partidosVisibles = partidos.filter((p) => {
    if (jornadaSel !== '' && String(p.jornada) !== String(jornadaSel)) return false
    if (filtro === 'PENDIENTES') return !ESTADOS_JUGADOS.includes(p.resultado)
    if (filtro === 'JUGADOS') return ESTADOS_JUGADOS.includes(p.resultado)
    return true
  })

  const jugadosCount = partidos.filter((p) => ESTADOS_JUGADOS.includes(p.resultado)).length

  const RowTeam = ({ nombre, lado, gano }) => (
    <Box sx={{ textAlign: gano ? undefined : undefined, display: 'flex', flexDirection: 'column', alignItems: lado === 'local' ? 'flex-start' : 'flex-end' }}>
      <Typography
        variant="body1"
        fontWeight={gano ? 800 : 700}
        color={gano ? 'success.main' : 'text.primary'}
        sx={{ lineHeight: 1.25, textAlign: { xs: 'center', sm: lado === 'local' ? 'left' : 'right' } }}
      >
        {nombre}
      </Typography>
      <Typography variant="caption" color="text.secondary">{lado === 'local' ? 'Local' : 'Visitante'}</Typography>
    </Box>
  )

  const MatchCard = ({ p }) => {
    const [label, color] = RESULTADOS[p.resultado] || [p.resultado, 'default']
    const jugado = ESTADOS_JUGADOS.includes(p.resultado)
    const localGano = jugado && (p.resultado === 'LOCAL_GANO' || p.resultado === 'W_LOCAL')
    const visitanteGano = jugado && (p.resultado === 'VISITANTE_GANO' || p.resultado === 'W_VISITANTE')
    return (
      <Card elevation={0} sx={{
        height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
        border: '1px solid rgba(0,0,0,0.08)', transition: 'all .2s',
        '&:hover': { boxShadow: '0 10px 28px rgba(37,99,235,0.10)', borderColor: 'primary.light' },
      }}>
        <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexWrap: 'wrap' }}>
              <Chip label={`J${p.jornada}`} size="small" color="primary" variant="outlined" />
              {p.fecha_programada ? (
                <Chip size="small" variant="outlined" icon={<ScheduleIcon />}
                  label={new Date(p.fecha_programada).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} />
              ) : (
                <Chip size="small" variant="outlined" color="warning" label="Sin fecha" />
              )}
            </Box>
            <Chip label={label} color={jugado ? color : 'default'} size="small" />
          </Box>

          <Grid container alignItems="center" spacing={1}>
            <Grid item xs={5} sx={{ pr: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <RowTeam nombre={eqName(p.equipo_local_id)} lado="local" gano={localGano} />
            </Grid>
            <Grid item xs={2} sx={{ textAlign: 'center' }}>
              {jugado ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 1, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>
                    {p.goles_local} <Typography component="span" color="text.secondary" fontWeight={400}>–</Typography> {p.goles_visitante}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 1, borderRadius: 2, bgcolor: '#eef2fb', border: '1px solid #dbe4f4' }}>
                  <Typography variant="h6" fontWeight={800} color="primary" sx={{ lineHeight: 1 }}>VS</Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={5} sx={{ pl: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <RowTeam nombre={eqName(p.equipo_visitante_id)} lado="visitante" gano={visitanteGano} />
            </Grid>
          </Grid>
        </CardContent>
        <Box sx={{ flex: 1 }} />
        <Divider />
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button fullWidth variant="contained" startIcon={<EditNoteIcon />}
            onClick={() => navigate(`/planilla?partido=${p.id}`)}>
            Abrir planilla
          </Button>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {!jugado && (
              <>
                <Button size="small" variant="outlined" onClick={() => { setResultOpen(p); setResultForm({ goles_local: p.goles_local, goles_visitante: p.goles_visitante }) }}>
                  Resultado
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setProgOpen(p); setProgForm({ fecha_programada: toLocalInput(p.fecha_programada) }) }}>
                  Programar
                </Button>
                <Button size="small" variant="outlined" color="warning"
                  onClick={() => { setWOpen(p); setWForm({ bando: 'LOCAL' }) }}>
                  W
                </Button>
                <Button size="small" variant="text" color="error" onClick={() => { if (window.confirm('¿Aplazar partido?')) aplazarMut.mutate(p.id) }}>
                  Aplazar
                </Button>
              </>
            )}
            {jugado && (
              <Button size="small" variant="outlined" color="inherit" onClick={() => setEventosOpen(p)}>
                Eventos
              </Button>
            )}
          </Box>
        </Box>
      </Card>
    )
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver los partidos.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700}>Partidos</Typography>
          <Typography variant="body2" color="text.secondary">
            {partidos.length} partidos · {jugadosCount} jugados · {partidos.length - jugadosCount} por jugar
          </Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Nuevo partido</Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>Selecciona una jornada</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Todas" clickable color={jornadaSel === '' ? 'primary' : 'default'}
            onClick={() => setJornadaSel('')} />
          {jornadas.map((j) => (
            <Chip key={j} label={`Jornada ${j}`} clickable
              color={String(jornadaSel) === String(j) ? 'primary' : 'default'}
              onClick={() => setJornadaSel(String(j))} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">Mostrar:</Typography>
          <Chip label="Todos" size="small" clickable color={filtro === 'TODOS' ? 'primary' : 'default'} onClick={() => setFiltro('TODOS')} />
          <Chip label="Por jugar" size="small" clickable color={filtro === 'PENDIENTES' ? 'primary' : 'default'} onClick={() => setFiltro('PENDIENTES')} />
          <Chip label="Jugados" size="small" clickable color={filtro === 'JUGADOS' ? 'primary' : 'default'} onClick={() => setFiltro('JUGADOS')} />
        </Box>
      </Box>

      {partidos.length === 0 && <Alert severity="info">No hay partidos aún.</Alert>}
      {partidos.length > 0 && partidosVisibles.length === 0 && (
        <Alert severity="info">No hay partidos con los filtros seleccionados.</Alert>
      )}

      <Grid container spacing={3}>
        {partidosVisibles.map((p) => (
          <Grid item xs={12} sm={6} lg={4} key={p.id}>
            <MatchCard p={p} />
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleCreate}>
          <DialogTitle>Nuevo partido</DialogTitle>
          <DialogContent>
            <TextField select label="Equipo local" fullWidth required margin="normal" value={form.equipo_local_id}
              onChange={(e) => setForm({ ...form, equipo_local_id: e.target.value })}>
              {equipos.map((eq) => <MenuItem key={eq.id} value={eq.id}>{eq.nombre}</MenuItem>)}
            </TextField>
            <TextField select label="Equipo visitante" fullWidth required margin="normal" value={form.equipo_visitante_id}
              onChange={(e) => setForm({ ...form, equipo_visitante_id: e.target.value })}>
              {equipos.map((eq) => <MenuItem key={eq.id} value={eq.id}>{eq.nombre}</MenuItem>)}
            </TextField>
            <TextField label="Jornada" type="number" fullWidth margin="normal" value={form.jornada}
              onChange={(e) => setForm({ ...form, jornada: Number(e.target.value) })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMut.isPending}>
              {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!resultOpen} onClose={() => setResultOpen(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleResult}>
          <DialogTitle>Registrar resultado</DialogTitle>
          <DialogContent>
            {resultOpen && (
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {eqName(resultOpen.equipo_local_id)} vs {eqName(resultOpen.equipo_visitante_id)}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Goles local" type="number" fullWidth value={resultForm.goles_local}
                onChange={(e) => setResultForm({ ...resultForm, goles_local: Number(e.target.value) })} />
              <TextField label="Goles visitante" type="number" fullWidth value={resultForm.goles_visitante}
                onChange={(e) => setResultForm({ ...resultForm, goles_visitante: Number(e.target.value) })} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setResultOpen(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={resultMut.isPending}>
              {resultMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!progOpen} onClose={() => setProgOpen(null)} fullWidth maxWidth="xs">
        <form onSubmit={(e) => { e.preventDefault(); programarMut.mutate({ id: progOpen.id, body: progForm }) }}>
          <DialogTitle>Programar partido</DialogTitle>
          <DialogContent>
            {progOpen && (
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {eqName(progOpen.equipo_local_id)} vs {eqName(progOpen.equipo_visitante_id)} · Jornada {progOpen.jornada}
              </Typography>
            )}
            <TextField label="Fecha y hora" type="datetime-local" fullWidth required margin="normal"
              value={progForm.fecha_programada}
              onChange={(e) => setProgForm({ fecha_programada: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start"><ScheduleIcon fontSize="small" /></InputAdornment> }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProgOpen(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={programarMut.isPending}>
              {programarMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Programar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!wOpen} onClose={() => setWOpen(null)} fullWidth maxWidth="xs">
        <DialogTitle>Registrar W (inasistencia)</DialogTitle>
        <DialogContent>
          {wOpen && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {eqName(wOpen.equipo_local_id)} vs {eqName(wOpen.equipo_visitante_id)} — elige el equipo que se PRESENTÓ.
              Gana por W con el marcador definido en el reglamento.
            </Typography>
          )}
          <TextField select label="Gana por W" fullWidth value={wForm.bando}
            onChange={(e) => setWForm({ bando: e.target.value })}>
            <MenuItem value="LOCAL">Local — {wOpen ? eqName(wOpen.equipo_local_id) : ''}</MenuItem>
            <MenuItem value="VISITANTE">Visitante — {wOpen ? eqName(wOpen.equipo_visitante_id) : ''}</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWOpen(null)}>Cancelar</Button>
          <Button variant="contained" color="warning" disabled={wMut.isPending}
            onClick={() => wMut.mutate({ id: wOpen.id, body: wForm })}>
            {wMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Registrar W'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!eventosOpen} onClose={() => setEventosOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {eventosOpen ? `${eqName(eventosOpen.equipo_local_id)} ${eventosOpen.goles_local} – ${eventosOpen.goles_visitante} ${eqName(eventosOpen.equipo_visitante_id)}` : ''}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {eventosLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (eventosData?.eventos || []).length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>Este partido no registra eventos (también puede ser un W).</Alert>
          ) : (
            <List dense>
              {(eventosData?.eventos || []).map((ev) => {
                const meta = TIPO_EVENTO_META[ev.tipo] || TIPO_EVENTO_META.GOL
                return (
                  <ListItem key={ev.id} sx={{ gap: 1.5 }}>
                    <Box sx={{ color: `${meta.color}.main`, display: 'flex' }}>{meta.icon}</Box>
                    <Chip label={`${ev.minuto}'`} size="small" variant="outlined" />
                    <ListItemText
                      primary={ev.jugador || 'Jugador eliminado'}
                      secondary={ev.tipo === 'TARJETA_AMARILLA' ? 'Tarjeta amarilla' : ev.tipo === 'TARJETA_ROJA' ? 'Tarjeta roja' : ev.equipo}
                    />
                  </ListItem>
                )
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEventosOpen(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}