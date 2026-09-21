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
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import { useToast } from '../components/Toast'
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  EditNote as EditNoteIcon,
  Place as PlaceIcon,
} from '@mui/icons-material'

const emptyForm = { nombre: '', direccion: '', activa: true }

export default function Locaciones({ user }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const { data: locaciones = [], isLoading, isError, error } = useQuery({
    queryKey: ['locaciones'],
    queryFn: () => apiGet('/locaciones'),
    enabled: !!user && user.role !== 'SUPERADMIN',
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/locaciones', body),
    onSuccess: () => { qc.invalidateQueries(['locaciones']); toast.show('Locación creada', 'success'); setOpen(false) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/locaciones/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['locaciones']); toast.show('Locación actualizada', 'success'); setOpen(false) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => apiDelete(`/locaciones/${id}`),
    onSuccess: () => { qc.invalidateQueries(['locaciones']); toast.show('Locación eliminada', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const abrirNueva = () => { setEditando(null); setForm(emptyForm); setOpen(true) }
  const abrirEditar = (l) => {
    setEditando(l)
    setForm({ nombre: l.nombre || '', direccion: l.direccion || '', activa: l.activa !== false })
    setOpen(true)
  }

  const guardar = (e) => {
    e.preventDefault()
    const body = { nombre: form.nombre.trim(), direccion: form.direccion.trim() || null, activa: form.activa }
    if (editando) updateMut.mutate({ id: editando.id, body })
    else createMut.mutate(body)
  }

  const eliminar = (l) => {
    if (window.confirm(`¿Eliminar la locación «${l.nombre}»? Los partidos ya programados quedarán sin sede.`)) {
      deleteMut.mutate(l.id)
    }
  }

  if (user?.role === 'SUPERADMIN') return null
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  const guardando = createMut.isPending || updateMut.isPending

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PlaceIcon sx={{ fontSize: 20, color: 'primary.main' }} /> Locaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sedes o canchas donde se juegan los partidos. Se usan al generar el fixture para asignar sede a cada partido.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={abrirNueva} sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}>
            Nueva locación
          </Button>
        </Box>

        {locaciones.length === 0 ? (
          <Alert severity="info">Aún no hay locaciones. Crea la primera para poder asignar sedes al generar el fixture.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {locaciones.map((l) => (
              <Box key={l.id} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 1.5,
                bgcolor: 'background.default', border: '1px solid', borderColor: 'divider',
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{l.nombre}</Typography>
                  {l.direccion && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }}>{l.direccion}</Typography>}
                </Box>
                {l.activa === false && <Chip size="small" label="Inactiva" />}
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => abrirEditar(l)} sx={{ color: 'text.secondary' }}>
                    <EditNoteIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" onClick={() => eliminar(l)} sx={{ color: '#b91c1c' }}>
                    <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={guardar}>
          <DialogTitle>{editando ? 'Editar locación' : 'Nueva locación'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Nombre" fullWidth required autoFocus sx={{ mt: 1 }}
              placeholder="Cancha 1, Sede Norte…"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <TextField
              label="Dirección (opcional)" fullWidth multiline minRows={2} sx={{ mt: 2 }}
              value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
            <Box sx={{ mt: 2 }}>
              <Chip
                label={form.activa ? 'Activa' : 'Inactiva'}
                color={form.activa ? 'success' : 'default'}
                onClick={() => setForm({ ...form, activa: !form.activa })}
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Las locaciones inactivas no se ofrecen al generar el fixture.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={guardando || !form.nombre.trim()}>
              {guardando ? <CircularProgress size={18} color="inherit" /> : (editando ? 'Guardar' : 'Crear')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  )
}
