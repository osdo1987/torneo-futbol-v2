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
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { apiGet, apiPost, apiDelete } from '../api'
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

export default function Torneos({ user, selectedTorneoId, onSelectTorneo }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

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
    </Box>
  )
}

