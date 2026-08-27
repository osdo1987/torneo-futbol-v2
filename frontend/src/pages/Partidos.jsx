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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { Add as AddIcon, Schedule as ScheduleIcon } from '@mui/icons-material'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { apiGet, apiPost } from '../api'
import { useToast } from '../components/Toast'

const RESULTADOS = {
  PENDIENTE: ['Pendiente', 'default'],
  POSTERGADO: ['Postergado', 'warning'],
  LOCAL_GANO: ['Local ganó', 'success'],
  VISITANTE_GANO: ['Visitante ganó', 'success'],
  EMPATE: ['Empate', 'info'],
  W_LOCAL: ['W (local)', 'secondary'],
  W_VISITANTE: ['W (visitante)', 'secondary'],
}
export default function Partidos({ selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ equipo_local_id: '', equipo_visitante_id: '', jornada: 1 })
  const [resultOpen, setResultOpen] = useState(null)
  const [resultForm, setResultForm] = useState({ goles_local: 0, goles_visitante: 0 })

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

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/partidos', body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido creado', 'success'); setOpen(false) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const resultMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/resultado`, body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen']); toast.show('Resultado guardado', 'success'); setResultOpen(null) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const programarMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/programar`, body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido programado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const aplazarMut = useMutation({
    mutationFn: (id) => apiPost(`/partidos/${id}/aplazar`, {}),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido aplazado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const [wOpen, setWOpen] = useState(null)
  const [wForm, setWForm] = useState({ bando: 'LOCAL' })

  const wMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/w`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId])
      qc.invalidateQueries(['tabla', selectedTorneoId])
      qc.invalidateQueries(['resumen'])
      toast.show('W registrado', 'success')
      setWOpen(null)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const { data: sancionesData } = useQuery({
    queryKey: ['sanciones', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/sanciones`),
    enabled: !!selectedTorneoId,
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate({ ...form, torneo_id: selectedTorneoId, equipo_local_id: Number(form.equipo_local_id), equipo_visitante_id: Number(form.equipo_visitante_id) })
  }

  const handleResult = (e) => {
    e.preventDefault()
    resultMut.mutate({ id: resultOpen.id, body: resultForm })
  }

  const eqName = (id) => equipos.find((x) => String(x.id) === String(id))?.nombre || `Equipo #${id}`

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver los partidos.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>


  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700}>Partidos</Typography>
          <Typography variant="body2" color="text.secondary">Programa partidos y registra resultados.</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Nuevo partido</Button>
      </Box>

      {(sancionesData?.sanciones || []).length > 0 && (
        <Alert severity="warning" icon={false} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Sanciones acumuladas</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {sancionesData.sanciones.map((s) => (
              <Chip key={s.jugador_id}
                color={s.suspendido ? 'error' : 'default'}
                variant={s.suspendido ? 'filled' : 'outlined'}
                size="small"
                label={`${s.jugador} (${s.equipo}) · 🟨${s.amarillas} 🟥${s.rojas}${s.suspendido ? ` · SUSPENDIDO hasta J${s.suspendido_hasta_jornada}` : ''}`}
              />
            ))}
          </Box>
        </Alert>
      )}

      {partidos.length === 0 && <Alert severity="info">No hay partidos aún.</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {partidos.map((p) => {
          const [label, color] = RESULTADOS[p.resultado] || [p.resultado, 'default']
          return (
            <Card key={p.id} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label={`Jornada ${p.jornada}`} size="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      {eqName(p.equipo_local_id)} <b>{p.goles_local}</b> — <b>{p.goles_visitante}</b> {eqName(p.equipo_visitante_id)}
                    </Typography>
                  </Box>
                  <Chip label={label} color={color} size="small" />
                </Box>
                {p.fecha_programada && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Fecha: {new Date(p.fecha_programada).toLocaleString()}
                  </Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {p.resultado === 'PENDIENTE' && (
                    <>
                      <Button size="small" variant="contained" onClick={() => { setResultOpen(p); setResultForm({ goles_local: p.goles_local, goles_visitante: p.goles_visitante }) }}>
                        Registrar resultado
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<ScheduleIcon />}
                        onClick={() => { const f = window.prompt('Fecha (YYYY-MM-DDTHH:MM):'); if (f) programarMut.mutate({ id: p.id, body: { fecha_programada: f } }) }}>
                        Programar
                      </Button>
                      <Button size="small" color="error" onClick={() => { if (window.confirm('¿Aplazar partido?')) aplazarMut.mutate(p.id) }}>
                        Aplazar
                      </Button>
                      <Button size="small" variant="outlined" color="warning"
                        onClick={() => { setWOpen(p); setWForm({ bando: 'LOCAL' }) }}>
                        Registrar W
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>


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
    </Box>
  )
}
