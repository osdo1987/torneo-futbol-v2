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
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  PersonAdd as PersonAddIcon,
  Visibility,
  VisibilityOff,
  Sports as SportsIcon,
} from '@mui/icons-material'
import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'

const ROLE_META = {
  SUPERADMIN: { label: 'Super Admin', color: 'error' },
  ORGANIZADOR: { label: 'Organizador', color: 'primary' },
  STAFF: { label: 'Staff', color: 'info' },
  REFEREE: { label: 'Árbitro', color: 'secondary' },
}

const ASSIGNABLE = ['ORGANIZADOR', 'STAFF', 'REFEREE']

const fmtFecha = (iso) => {
  if (!iso) return 'Nunca'
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return 'Nunca'
  }
}

const initials = (name) => String(name || '?')
  .split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export default function Usuarios({ user }) {
  const qc = useQueryClient()
  const toast = useToast()
  const isSuper = user?.role === 'SUPERADMIN'

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'STAFF', organizador_id: '' })
  const [resetOpen, setResetOpen] = useState(null)
  const [resetForm, setResetForm] = useState({ password: '' })
  const [showPw, setShowPw] = useState(false)
  const [showResetPw, setShowResetPw] = useState(false)

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet('/auth/users'),
  })

  const { data: organizadores = [] } = useQuery({
    queryKey: ['organizadores'],
    queryFn: () => apiGet('/organizadores'),
    enabled: isSuper,
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/auth/users', body),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.show('Usuario creado', 'success'); setCreateOpen(false); setCreateForm({ email: '', password: '', role: 'STAFF', organizador_id: '' }) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => apiPut(`/auth/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.show('Rol actualizado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const resetMut = useMutation({
    mutationFn: ({ id, password }) => apiPut(`/auth/users/${id}/password`, { password }),
    onSuccess: () => { toast.show('Contraseña restablecida', 'success'); setResetOpen(null); setResetForm({ password: '' }) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => apiDelete(`/auth/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.show('Usuario eliminado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    const body = {
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
    }
    if (isSuper) body.organizador_id = Number(createForm.organizador_id)
    createMut.mutate(body)
  }

  const handleRoleChange = (u, next) => {
    if (next === u.role) return
    if (window.confirm(`¿Cambiar el rol de ${u.email} a "${ROLE_META[next]?.label || next}"?`)) {
      roleMut.mutate({ id: u.id, role: next })
    }
  }

  const handleReset = (e) => {
    e.preventDefault()
    resetMut.mutate({ id: resetOpen.id, password: resetForm.password })
  }

  const handleDelete = (u) => {
    if (window.confirm(`¿Eliminar al usuario ${u.email}? Esta acción no se puede deshacer.`)) {
      deleteMut.mutate(u.id)
    }
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      <PageHeader
        overline="Accesos y permisos"
        title="Usuarios"
        subtitle="Gestiona los usuarios y roles del organizador: crea cuentas de staff, árbitros o co-organizadores, cambia roles, restablece contraseñas y elimina accesos."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Nuevo usuario
          </Button>
        }
      />

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 0 }}>
          {users.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>No hay usuarios registrados.</Alert>
          ) : (
            <List dense disablePadding>
              {users.map((u, i) => {
                const meta = ROLE_META[u.role] || { label: u.role, color: 'default' }
                const esYo = user?.id === u.id
                const puedeEditarRol = !esYo && u.role !== 'SUPERADMIN'
                const puedeEliminar = !esYo && u.role !== 'SUPERADMIN'
                return (
                  <Box key={u.id}>
                    {i > 0 && <Divider />}
                    <ListItem sx={{ alignItems: 'center', gap: 1.5, py: 1.5, px: { xs: 2, md: 3 } }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: u.role === 'REFEREE' ? 'secondary.main' : u.role === 'ORGANIZADOR' ? 'primary.main' : 'grey.500', color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                        {initials(u.email)}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography component="span" sx={{ fontWeight: 700 }}>{u.email}</Typography>
                            {esYo && <Chip label="Tú" size="small" sx={{ height: 18, fontSize: 10 }} />}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                            {u.organizador_name && <Box component="span">· {u.organizador_name}</Box>}
                            <Box component="span">· Último acceso: {fmtFecha(u.last_login)}</Box>
                          </Box>
                        }
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                        sx={{ minWidth: 0, flex: 1 }}
                      />
                      <Chip
                        label={meta.label}
                        color={meta.color}
                        size="small"
                        variant={u.role === 'STAFF' ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 700 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select
                          value={u.role}
                          disabled={!puedeEditarRol}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          displayEmpty
                          sx={{ fontSize: 13 }}
                        >
                          {ASSIGNABLE.map((r) => (
                            <MenuItem key={r} value={r}>{ROLE_META[r].label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Tooltip title="Restablecer contraseña">
                        <span>
                          <IconButton size="small" color="primary" onClick={() => { setResetOpen(u); setResetForm({ password: '' }) }}>
                            <KeyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Eliminar usuario">
                        <span>
                          <IconButton size="small" color="error" disabled={!puedeEliminar} onClick={() => handleDelete(u)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </ListItem>
                  </Box>
                )
              })}
            </List>
          )}
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mt: 2 }}>
        El rol <b>Árbitro</b> solo puede operar en la planilla de juego (anotaciones y finalización del partido).
        El rol <b>Staff</b> colabora con la gestión completa del tenant.
      </Alert>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleCreate}>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogContent>
            <TextField
              label="Email" fullWidth required type="email" margin="normal"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <TextField
              label="Contraseña" fullWidth required margin="normal"
              type={showPw ? 'text' : 'password'}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              helperText="Mínimo 6 caracteres."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw((v) => !v)} edge="end" tabIndex={-1} aria-label="Mostrar/ocultar contraseña">
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Rol</InputLabel>
              <Select
                value={createForm.role}
                label="Rol"
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              >
                {ASSIGNABLE.map((r) => (
                  <MenuItem key={r} value={r}>{ROLE_META[r].label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {isSuper && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Organizador</InputLabel>
                <Select
                  value={createForm.organizador_id}
                  label="Organizador"
                  onChange={(e) => setCreateForm({ ...createForm, organizador_id: e.target.value })}
                >
                  <MenuItem value="" disabled><em>Selecciona el tenant</em></MenuItem>
                  {organizadores.map((o) => (
                    <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<PersonAddIcon />} disabled={createMut.isPending || (isSuper && !createForm.organizador_id)}>
              {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!resetOpen} onClose={() => setResetOpen(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleReset}>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SportsIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">{resetOpen?.email}</Typography>
            </Box>
            <TextField
              label="Nueva contraseña" fullWidth required margin="normal"
              type={showResetPw ? 'text' : 'password'}
              value={resetForm.password}
              onChange={(e) => setResetForm({ password: e.target.value })}
              helperText="Mínimo 6 caracteres."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowResetPw((v) => !v)} edge="end" tabIndex={-1} aria-label="Mostrar/ocultar contraseña">
                      {showResetPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setResetOpen(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={resetMut.isPending || resetForm.password.length < 6}>
              {resetMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}