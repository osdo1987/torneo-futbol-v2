import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
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
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  ContentCopy as ContentCopyIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import { useToast } from '../components/Toast'

const empty = { name: '', slug: '', whatsapp: '', address: '', email: '', password: '' }

export default function SuperAdmin() {
  const qc = useQueryClient()
  const toast = useToast()
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openTorneos, setOpenTorneos] = useState(false)
  const [form, setForm] = useState(empty)
  const [editOrg, setEditOrg] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [orgTorneos, setOrgTorneos] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const { data: organizadores = [], isLoading, isError, error } = useQuery({
    queryKey: ['organizadores'],
    queryFn: () => apiGet('/organizadores'),
  })

  const { data: torneos = [] } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/auth/register-organizador', body),
    onSuccess: () => { qc.invalidateQueries(['organizadores']); toast.show('Organizador creado', 'success'); setOpenCreate(false); setForm(empty) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const editMut = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/organizadores/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['organizadores']); qc.invalidateQueries(['torneos']); toast.show('Organizador actualizado', 'success'); setOpenEdit(false) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => apiDelete(`/organizadores/${id}`),
    onSuccess: () => { qc.invalidateQueries(['organizadores']); qc.invalidateQueries(['torneos']); toast.show('Organizador eliminado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate(form)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    editMut.mutate({ id: editOrg.id, body: editForm })
  }

  const openEditDialog = (o) => {
    setEditOrg(o)
    setEditForm({
      name: o.name,
      slug: o.slug,
      whatsapp: o.whatsapp || '',
      address: o.address || '',
      description: o.description || '',
      primary_color: o.primary_color || '#004ac6',
      welcome_message: o.welcome_message || '',
    })
    setOpenEdit(true)
  }

  const openTorneosDialog = (o) => {
    setOrgTorneos({
      org: o,
      list: torneos.filter((t) => Number(t.organizador_id) === Number(o.id)),
    })
    setOpenTorneos(true)
  }

  const handleDelete = (o) => {
    if (window.confirm(`¿Eliminar "${o.name}"? Se eliminará todo lo asociado (usuarios, torneos, equipos...). Esta acción no se puede deshacer.`)) {
      deleteMut.mutate(o.id)
    }
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" fontWeight={700}>Organizadores</Typography>
          <Typography variant="body2" color="text.secondary">Gestiona los tenants (ligas / canchas).</Typography>
        </div>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>Nuevo organizador</Button>
      </Box>

      <Grid container spacing={2}>
        {organizadores.map((o) => {
          const count = torneos.filter((t) => Number(t.organizador_id) === Number(o.id)).length
          return (
            <Grid item xs={12} md={6} lg={4} key={o.id}>
              <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{o.name}</Typography>
                      <Typography variant="body2" color="text.secondary">/{o.slug}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openTorneosDialog(o)} title="Ver torneos" color="primary">
                        <EmojiEventsIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => openEditDialog(o)} title="Editar" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(o)} title="Eliminar" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  {o.whatsapp && <Typography variant="body2" color="text.secondary">{o.whatsapp}</Typography>}
                  {o.address && <Typography variant="body2" color="text.secondary">{o.address}</Typography>}
                  {o.primary_color && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: o.primary_color, border: '1px solid rgba(0,0,0,0.15)' }} />
                      <Chip size="small" variant="outlined" icon={<EmojiEventsIcon />} label={`${count} torneo${count === 1 ? '' : 's'}`} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}
        {organizadores.length === 0 && <Grid item xs={12}><Alert severity="info">No hay organizadores. Crea el primero.</Alert></Grid>}
      </Grid>

      {/* Dialog crear organizador */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleCreate}>
          <DialogTitle>Crear organizador</DialogTitle>
          <DialogContent>
            <TextField label="Nombre" fullWidth required margin="normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Slug (URL)" fullWidth required margin="normal" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <TextField label="WhatsApp" fullWidth margin="normal" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <TextField label="Dirección" fullWidth margin="normal" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <TextField label="Email (usuario)" fullWidth required type="email" margin="normal" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Contraseña" fullWidth required margin="normal" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              type={showPassword ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMut.isPending}>
              {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog editar organizador */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Editar organizador</DialogTitle>
          <DialogContent>
            <TextField label="Nombre" fullWidth required margin="normal" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField label="Slug (URL)" fullWidth required margin="normal" value={editForm.slug || ''} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
            <TextField label="WhatsApp" fullWidth margin="normal" value={editForm.whatsapp || ''} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
            <TextField label="Dirección" fullWidth margin="normal" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            <TextField label="Descripción" fullWidth multiline minRows={2} margin="normal" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <TextField label="Color principal" type="color" value={editForm.primary_color || '#004ac6'}
                onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                sx={{ width: 80, '& .MuiInputBase-root': { p: 1 } }} />
              <TextField label="Mensaje de bienvenida" fullWidth margin="normal" value={editForm.welcome_message || ''} onChange={(e) => setEditForm({ ...editForm, welcome_message: e.target.value })} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={editMut.isPending}>
              {editMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog ver torneos */}
      <Dialog open={openTorneos} onClose={() => setOpenTorneos(false)} fullWidth maxWidth="sm">
        <DialogTitle>Torneos de {orgTorneos?.org?.name}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {orgTorneos?.list?.length === 0 && (
            <Box sx={{ p: 3 }}><Alert severity="info">Este organizador aún no tiene torneos.</Alert></Box>
          )}
          <List dense disablePadding>
            {orgTorneos?.list?.map((t, i) => {
              const url = `${window.location.origin}/l/${orgTorneos.org.slug}?torneo=${t.id}`
              return (
                <Box key={t.id}>
                  {i > 0 && <Divider />}
                  <ListItem sx={{ alignItems: 'flex-start', py: 1.5 }}>
                    <ListItemText
                      primary={t.nombre}
                      secondary={
                        <Box component="span">
                          <Typography component="span" variant="caption" color="text.secondary">Estado: {t.estado}</Typography>
                          <br />
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ color: 'primary.main', wordBreak: 'break-all' }}
                          >
                            <a href={url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{url}</a>
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      color="primary"
                      title="Copiar URL"
                      onClick={() => {
                        navigator.clipboard?.writeText(url)
                        toast.show('URL copiada', 'success')
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                </Box>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTorneos(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}