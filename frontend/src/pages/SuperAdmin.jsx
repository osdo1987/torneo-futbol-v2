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
import { Add as AddIcon } from '@mui/icons-material'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { apiGet, apiPost } from '../api'
import { useToast } from '../components/Toast'

const empty = { name: '', slug: '', whatsapp: '', address: '', email: '', password: '' }

export default function SuperAdmin() {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)

  const { data: organizadores = [], isLoading, isError, error } = useQuery({
    queryKey: ['organizadores'],
    queryFn: () => apiGet('/organizadores'),
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/auth/register-organizador', body),
    onSuccess: () => { qc.invalidateQueries(['organizadores']); toast.show('Organizador creado', 'success'); setOpen(false); setForm(empty) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate(form)
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Nuevo organizador</Button>
      </Box>

      <Grid container spacing={2}>
        {organizadores.map((o) => (
          <Grid item xs={12} md={6} lg={4} key={o.id}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>{o.name}</Typography>
                <Typography variant="body2" color="text.secondary">/{o.slug}</Typography>
                {o.whatsapp && <Typography variant="body2" color="text.secondary">{o.whatsapp}</Typography>}
                {o.address && <Typography variant="body2" color="text.secondary">{o.address}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
        {organizadores.length === 0 && <Grid item xs={12}><Alert severity="info">No hay organizadores. Crea el primero.</Alert></Grid>}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleCreate}>
          <DialogTitle>Crear organizador</DialogTitle>
          <DialogContent>
            <TextField label="Nombre" fullWidth required margin="normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Slug (URL)" fullWidth required margin="normal" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <TextField label="WhatsApp" fullWidth margin="normal" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <TextField label="Dirección" fullWidth margin="normal" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <TextField label="Email (usuario)" fullWidth required type="email" margin="normal" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Contraseña" fullWidth required type="password" margin="normal" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMut.isPending}>
              {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
