import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { Add as AddIcon, Delete as DeleteIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import { apiGet, apiPost, apiDelete } from '../api'
import { useToast } from '../components/Toast'

const emptyEquipo = { nombre: '', delegado_email: '', delegado_documento: '' }
const emptyJugador = { nombre: '', numero_camiseta: 10, documento_identidad: '' }

function JugadoresPanel({ equipo }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyJugador)

  const { data: jugadores = [], isLoading, isError, error } = useQuery({
    queryKey: ['jugadores', equipo.id],
    queryFn: () => apiGet(`/equipos/${equipo.id}/jugadores`),
    enabled: !!equipo.id,
  })

  const addMut = useMutation({
    mutationFn: (body) => apiPost('/jugadores', body),
    onSuccess: () => { qc.invalidateQueries(['jugadores', equipo.id]); toast.show('Jugador inscrito', 'success'); setOpen(false); setForm(emptyJugador) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const releaseMut = useMutation({
    mutationFn: (id) => apiPost(`/jugadores/${id}/liberar`, {}),
    onSuccess: () => { qc.invalidateQueries(['jugadores', equipo.id]); toast.show('Jugador liberado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    addMut.mutate({ ...form, equipo_id: equipo.id })
  }

  const activos = jugadores.filter((j) => j.activo).length

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Jugadores de {equipo.nombre}</Typography>
          <Chip label={`${activos} inscritos`} color="primary" />
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
          Inscribir jugador
        </Button>

        {isLoading && <CircularProgress />}
        {isError && <Alert severity="error">{error.message}</Alert>}

        <List dense>
          {jugadores.map((j) => (
            <ListItemButton
              key={j.id}
              secondaryAction={
                j.activo ? (
                  <IconButton edge="end" size="small" color="error" title="Liberar jugador"
                    onClick={() => { if (window.confirm('¿Liberar jugador?')) releaseMut.mutate(j.id) }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ) : null
              }
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemText
                primary={`#${j.numero_camiseta} ${j.nombre}`}
                secondary={j.documento_identidad || ''}
              />
            </ListItemButton>
          ))}
          {jugadores.length === 0 && !isLoading && <Typography variant="body2" color="text.secondary">Sin jugadores</Typography>}
        </List>
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAdd}>
          <DialogTitle>Inscribir jugador</DialogTitle>
          <DialogContent>
            <TextField label="Nombre" fullWidth required margin="normal"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <TextField label="N° camiseta" type="number" fullWidth margin="normal"
              value={form.numero_camiseta} onChange={(e) => setForm({ ...form, numero_camiseta: Number(e.target.value) })} />
            <TextField label="Documento" fullWidth margin="normal"
              value={form.documento_identidad} onChange={(e) => setForm({ ...form, documento_identidad: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={addMut.isPending}>
              {addMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  )
}

export default function Equipos({ selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyEquipo)

  const { data: equipos = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipos', selectedTorneoId],
    queryFn: () => apiGet(`/equipos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const addMut = useMutation({
    mutationFn: (body) => apiPost('/equipos', body),
    onSuccess: () => { qc.invalidateQueries(['equipos', selectedTorneoId]); toast.show('Equipo inscrito', 'success'); setOpen(false); setForm(emptyEquipo) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const delMut = useMutation({
    mutationFn: (id) => apiDelete(`/equipos/${id}`),
    onSuccess: () => { qc.invalidateQueries(['equipos', selectedTorneoId]); setSelected(null); toast.show('Equipo eliminado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    addMut.mutate({ ...form, torneo_id: selectedTorneoId })
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para gestionar equipos.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700}>Equipos</Typography>
          <Typography variant="body2" color="text.secondary">Inscribe delegaciones y gestiona sus plantillas.</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Inscribir equipo</Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <List sx={{ p: 1 }}>
              {equipos.map((eq) => (
                <ListItemButton
                  key={eq.id}
                  selected={selected?.id === eq.id}
                  onClick={() => setSelected(eq)}
                  secondaryAction={
                    <IconButton edge="end" size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar equipo?')) delMut.mutate(eq.id) }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemText primary={eq.nombre} secondary={eq.delegado_email || 'Sin delegado'} />
                </ListItemButton>
              ))}
              {equipos.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Sin equipos. Inscribe el primero.</Typography>}
            </List>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          {selected ? <JugadoresPanel equipo={selected} /> : (
            <Card elevation={0} sx={{ border: '1px dashed rgba(0,0,0,0.2)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
              <Typography variant="body1" color="text.secondary">Selecciona un equipo para gestionar sus jugadores.</Typography>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAdd}>
          <DialogTitle>Inscribir equipo</DialogTitle>
          <DialogContent>
            <TextField label="Nombre del equipo" fullWidth required margin="normal"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <TextField label="Email del delegado" fullWidth margin="normal"
              value={form.delegado_email} onChange={(e) => setForm({ ...form, delegado_email: e.target.value })} />
            <TextField label="Documento del delegado" fullWidth margin="normal"
              value={form.delegado_documento} onChange={(e) => setForm({ ...form, delegado_documento: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={addMut.isPending}>
              {addMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
