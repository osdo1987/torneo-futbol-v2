import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import { Add as AddIcon, Delete as DeleteIcon, Tune as TuneIcon } from '@mui/icons-material'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import { useToast } from '../components/Toast'

const ESTADO_META = {
  CREADO: ['Creado', 'default'],
  INSCRIPCIONES_ABIERTAS: ['Inscripciones abiertas', 'success'],
  INSCRIPCIONES_CERRADAS: ['Inscripciones cerradas', 'warning'],
  SORTEADO: ['Sorteado', 'info'],
  EN_JUEGO: ['En juego', 'primary'],
  FINALIZADO: ['Finalizado', 'error'],
}

const TRANSICIONES = {
  CREADO: { to: 'INSCRIPCIONES_ABIERTAS', label: 'Abrir inscripciones' },
  INSCRIPCIONES_ABIERTAS: { to: 'INSCRIPCIONES_CERRADAS', label: 'Cerrar inscripciones' },
  INSCRIPCIONES_CERRADAS: { to: 'SORTEADO', label: 'Realizar sorteo' },
  SORTEADO: { to: 'EN_JUEGO', label: 'Iniciar torneo' },
  EN_JUEGO: { to: 'FINALIZADO', label: 'Finalizar torneo' },
}

const emptyForm = { nombre: '', max_jugadores_por_equipo: 18, puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 }

const DESEMPATES_DISPONIBLES = ['DIF_GOL', 'GOLES_FAVOR', 'MENOS_AMARILLAS', 'MENOS_ROJAS', 'GOLES_CONTRA']
const DESEMPATE_LABELS = {
  DIF_GOL: 'Diferencia de goles',
  GOLES_FAVOR: 'Goles a favor',
  MENOS_AMARILLAS: 'Menos tarjetas amarillas',
  MENOS_ROJAS: 'Menos tarjetas rojas',
  GOLES_CONTRA: 'Menos goles en contra',
}

const toForm = (r = {}) => ({
  formato_tipo: r.formato_tipo ?? 'ROUND_ROBIN',
  rondas: r.rondas ?? 1,
  clasifican_a_final: r.clasifican_a_final ?? '',
  desempates: r.desempates ?? [...DESEMPATES_DISPONIBLES],
  edad_min: r.edad_min ?? '',
  edad_max: r.edad_max ?? '',
  max_jugadores: r.max_jugadores ?? '',
  bloquear_baja_tras_jugar: r.bloquear_baja_tras_jugar ?? false,
  comodines_cantidad: r.comodines_cantidad ?? 0,
  comodines_edad_min: r.comodines_edad_min ?? 30,
  tolerancia_w_min: r.tolerancia_w_min ?? 10,
  marcador_w: r.marcador_w ?? 3,
  fechas_doble_amarilla: r.fechas_doble_amarilla ?? 1,
  fechas_roja_directa: r.fechas_roja_directa ?? 2,
})

function ReglasDialog({ torneo, onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(toForm(torneo.reglas))

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const saveMut = useMutation({
    mutationFn: (body) => apiPut(`/torneos/${torneo.id}/reglas`, body),
    onSuccess: () => { qc.invalidateQueries(['torneos']); toast.show('Reglamento guardado', 'success'); onClose() },
    onError: (e) => toast.show(typeof e.message === 'string' ? e.message : 'Error de validación del reglamento', 'error'),
  })

  const mover = (i, dir) => {
    const arr = [...form.desempates]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setForm({ ...form, desempates: arr })
  }

  const handleSave = (e) => {
    e.preventDefault()
    saveMut.mutate({
      formato_tipo: form.formato_tipo,
      rondas: Number(form.rondas),
      clasifican_a_final: form.clasifican_a_final === '' ? null : Number(form.clasifican_a_final),
      desempates: form.desempates,
      edad_min: form.edad_min === '' ? null : Number(form.edad_min),
      edad_max: form.edad_max === '' ? null : Number(form.edad_max),
      max_jugadores: form.max_jugadores === '' ? null : Number(form.max_jugadores),
      bloquear_baja_tras_jugar: !!form.bloquear_baja_tras_jugar,
      comodines_cantidad: Number(form.comodines_cantidad),
      comodines_edad_min: form.comodines_edad_min === '' ? null : Number(form.comodines_edad_min),
      tolerancia_w_min: Number(form.tolerancia_w_min),
      marcador_w: Number(form.marcador_w),
      fechas_doble_amarilla: Number(form.fechas_doble_amarilla),
      fechas_roja_directa: Number(form.fechas_roja_directa),
    })
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSave}>
        <DialogTitle>Reglamento — {torneo.nombre}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Formato</InputLabel>
              <Select value={form.formato_tipo} label="Formato" onChange={set('formato_tipo')}>
                <MenuItem value="ROUND_ROBIN">Todos contra todos</MenuItem>
                <MenuItem value="ELIMINATORIA">Eliminatoria</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Rondas</InputLabel>
              <Select value={form.rondas} label="Rondas" onChange={(e) => setForm({ ...form, rondas: Number(e.target.value) })}>
                <MenuItem value={1}>Una ronda (ida)</MenuItem>
                <MenuItem value={2}>Ida y vuelta (2)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Clasifican a final" type="number" fullWidth
              value={form.clasifican_a_final} onChange={set('clasifican_a_final')} />
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Criterios de desempate (en orden)</Typography>
          {form.desempates.map((c, i) => (
            <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ width: 24 }}>{i + 1}.</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{DESEMPATE_LABELS[c]}</Typography>
              <Button size="small" variant="outlined" disabled={i === 0} onClick={() => mover(i, -1)}>↑</Button>
              <Button size="small" variant="outlined" disabled={i === form.desempates.length - 1} onClick={() => mover(i, 1)}>↓</Button>
            </Box>
          ))}

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Categoría (edades)</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Edad mínima" type="number" fullWidth
              value={form.edad_min} onChange={set('edad_min')} />
            <TextField label="Edad máxima" type="number" fullWidth
              value={form.edad_max} onChange={set('edad_max')} />
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Plantilla</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Máx. jugadores" type="number" fullWidth
              value={form.max_jugadores} onChange={set('max_jugadores')} />
            <TextField label="Comodines (cantidad)" type="number" fullWidth
              value={form.comodines_cantidad} onChange={(e) => setForm({ ...form, comodines_cantidad: Number(e.target.value) })} />
            <TextField label="Edad mín. comodín" type="number" fullWidth
              value={form.comodines_edad_min} onChange={set('comodines_edad_min')} />
          </Box>
          <FormControlLabel
            control={<Checkbox checked={!!form.bloquear_baja_tras_jugar} onChange={(e) => setForm({ ...form, bloquear_baja_tras_jugar: e.target.checked })} />}
            label="No permitir dar de baja a un jugador que ya disputó un partido"
            sx={{ mt: 1 }}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Inasistencia (W) y sanciones</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Tolerancia W (min)" type="number" fullWidth
              value={form.tolerancia_w_min} onChange={(e) => setForm({ ...form, tolerancia_w_min: Number(e.target.value) })} />
            <TextField label="Marcador por W" type="number" fullWidth
              value={form.marcador_w} onChange={(e) => setForm({ ...form, marcador_w: Number(e.target.value) })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField label="Fechas sanción doble amarilla" type="number" fullWidth
              value={form.fechas_doble_amarilla} onChange={(e) => setForm({ ...form, fechas_doble_amarilla: Number(e.target.value) })} />
            <TextField label="Fechas sanción roja directa" type="number" fullWidth
              value={form.fechas_roja_directa} onChange={(e) => setForm({ ...form, fechas_roja_directa: Number(e.target.value) })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saveMut.isPending}>
            {saveMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar reglamento'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default function Torneos({ user, selectedTorneoId, onSelectTorneo }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [reglasTorneo, setReglasTorneo] = useState(null)

  const { data: torneos = [], isLoading, isError, error } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/torneos', body),
    onSuccess: (t) => {
      qc.invalidateQueries(['torneos'])
      qc.invalidateQueries(['resumen'])
      toast.show('Torneo creado', 'success')
      onSelectTorneo(String(t.id))
      setOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const estadoMut = useMutation({
    mutationFn: ({ id, estado }) => apiPost(`/torneos/${id}/estado`, { estado }),
    onSuccess: () => { qc.invalidateQueries(['torneos']); toast.show('Estado actualizado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => apiDelete(`/torneos/${id}`),
    onSuccess: () => { qc.invalidateQueries(['torneos']); toast.show('Torneo eliminado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const fixtureMut = useMutation({
    mutationFn: (id) => apiPost(`/torneos/${id}/fixture`, {}),
    onSuccess: (d) => {
      qc.invalidateQueries(['partidos'])
      toast.show(`${d.message}: ${d.partidos} partidos en ${d.jornadas} jornadas`, 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const finalMut = useMutation({
    mutationFn: (id) => apiPost(`/torneos/${id}/fase-final`, {}),
    onSuccess: (d) => {
      qc.invalidateQueries(['partidos'])
      const cruces = (d.partidos || []).map((p) => `${p.local} vs ${p.visitante}`).join(' | ')
      toast.show(`${d.message}: ${cruces}`, 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate({ ...form, organizador_id: user?.organizadorId })
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700}>Torneos</Typography>
          <Typography variant="body2" color="text.secondary">Crea y gestiona el ciclo de vida de tus torneos.</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Nuevo Torneo</Button>
      </Box>

      {torneos.length === 0 && <Alert severity="info">No hay torneos. Crea el primero.</Alert>}

      <Grid container spacing={2}>
        {torneos.map((t) => {
          const [label, color] = ESTADO_META[t.estado] || [t.estado, 'default']
          const trans = TRANSICIONES[t.estado]
          const selected = String(t.id) === String(selectedTorneoId)
          return (
            <Grid item xs={12} md={6} lg={4} key={t.id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  border: selected ? '2px solid' : '1px solid rgba(0,0,0,0.08)',
                  borderColor: selected ? 'primary.main' : 'default',
                  cursor: 'pointer',
                }}
                onClick={() => onSelectTorneo(String(t.id))}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{t.nombre}</Typography>
                    <Chip label={label} color={color} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Máx. jugadores: {t.max_jugadores_por_equipo} · Puntos G{t.puntos_victoria} E{t.puntos_empate} P{t.puntos_derrota}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inscripción de jugadores: {t.inscripciones_jugadores_abiertas ? 'Abierta' : 'Cerrada'}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                  {trans && (
                    <Button
                      size="small" variant="outlined"
                      disabled={estadoMut.isPending}
                      onClick={(e) => { e.stopPropagation(); estadoMut.mutate({ id: t.id, estado: trans.to }) }}
                    >
                      {trans.label}
                    </Button>
                  )}
                  <Button
                    size="small" variant="outlined" startIcon={<TuneIcon fontSize="small" />}
                    onClick={(e) => { e.stopPropagation(); setReglasTorneo(t) }}
                  >
                    Reglamento
                  </Button>
                  <Button
                    size="small" variant="outlined" color="success"
                    disabled={fixtureMut.isPending}
                    onClick={(e) => { e.stopPropagation(); fixtureMut.mutate(t.id) }}
                  >
                    Generar fixture
                  </Button>
                  <Button
                    size="small" variant="outlined" color="warning"
                    disabled={finalMut.isPending}
                    onClick={(e) => { e.stopPropagation(); finalMut.mutate(t.id) }}
                  >
                    Fase final
                  </Button>
                  <IconButton
                    size="small" color="error"
                    onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar torneo?')) deleteMut.mutate(t.id) }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleCreate}>
          <DialogTitle>Crear torneo</DialogTitle>
          <DialogContent>
            <TextField label="Nombre del torneo" fullWidth required margin="normal"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <TextField label="Máx. jugadores por equipo" type="number" fullWidth margin="normal"
              value={form.max_jugadores_por_equipo}
              onChange={(e) => setForm({ ...form, max_jugadores_por_equipo: Number(e.target.value) })} />
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <TextField label="Puntos victoria" type="number" fullWidth
                value={form.puntos_victoria} onChange={(e) => setForm({ ...form, puntos_victoria: Number(e.target.value) })} />
              <TextField label="Puntos empate" type="number" fullWidth
                value={form.puntos_empate} onChange={(e) => setForm({ ...form, puntos_empate: Number(e.target.value) })} />
              <TextField label="Puntos derrota" type="number" fullWidth
                value={form.puntos_derrota} onChange={(e) => setForm({ ...form, puntos_derrota: Number(e.target.value) })} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMut.isPending}>
              {createMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {reglasTorneo && (
        <ReglasDialog torneo={reglasTorneo} onClose={() => setReglasTorneo(null)} />
      )}
    </Box>
  )
}

