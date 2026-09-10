import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
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
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'
import LinkIcon from '@mui/icons-material/Link'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  Badge as BadgeIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material'
import Avatar from '@mui/material/Avatar'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { apiGet, apiPost, apiDelete } from '../api'
import { useToast } from '../components/Toast'
import { parseExcel, aPayload, descargarPlantilla } from '../lib/plantilla'
import { fileToFotoDataURI } from '../lib/imagen'
import JugadorCarnet from '../components/JugadorCarnet'

const POSICIONES = ['ARQUERO', 'DEFENSOR', 'MEDIOCAMPISTA', 'DELANTERO']
const POSICION_LABEL = {
  ARQUERO: 'Arquero',
  DEFENSOR: 'Defensor',
  MEDIOCAMPISTA: 'Centrocampista',
  DELANTERO: 'Delantero',
}
const PIERNAS = ['DERECHA', 'IZQUIERDA', 'AMBIDESTRO']
const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const emptyEquipo = { nombre: '', delegado_email: '', delegado_documento: '' }
const emptyJugador = {
  nombre: '', numero_camiseta: 10, documento_identidad: '',
  posicion: '', fecha_nacimiento: '', telefono: '', pierna_habil: '', altura_cm: '', foto_url: '',
  tipo_sangre: '', eps: '', contacto_emergencia: '', alergias: '',
}

function calcEdad(fecha) {
  if (!fecha) return null
  const nac = new Date(fecha)
  const hoy = new Date()
  let e = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--
  return e
}

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function JugadoresPanel({ equipo, torneoNombre = '', organizador = '' }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyJugador)
  const [fotoRef, setFotoRef] = useState(null)
  const [carnet, setCarnet] = useState(null)
  const [impOpen, setImpOpen] = useState(false)
  const [impParseando, setImpParseando] = useState(false)
  const [impParseError, setImpParseError] = useState('')
  const [impParseado, setImpParseado] = useState(null)
  const [impSeleccion, setImpSeleccion] = useState(new Set())
  const [impErrores, setImpErrores] = useState([])
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkSlug, setLinkSlug] = useState('')
  const [linkAbierta, setLinkAbierta] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const linkMut = useMutation({
    mutationFn: () => apiPost(`/equipos/${equipo.id}/link`),
    onSuccess: (res) => {
      setLinkSlug(res.slug)
      setLinkAbierta(res.inscripciones_abiertas)
      setCopiado(false)
      setLinkOpen(true)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl())
      setCopiado(true)
    } catch {
      toast.show('No se pudo copiar el enlace', 'error')
    }
  }

  const linkUrl = () => `${window.location.origin}/r/${linkSlug}`

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
    // Los campos opcionales vacíos van como null para cumplir la validación del backend
    addMut.mutate({
      ...form,
      equipo_id: equipo.id,
      posicion: form.posicion || null,
      pierna_habil: form.pierna_habil || null,
      telefono: form.telefono || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      altura_cm: form.altura_cm ? Number(form.altura_cm) : null,
      tipo_sangre: form.tipo_sangre || null,
      eps: form.eps || null,
      contacto_emergencia: form.contacto_emergencia || null,
      alergias: form.alergias || null,
      foto_url: form.foto_url || null,
    })
  }

  const pickFoto = async (file) => {
    if (!file) return
    try {
      const uri = await fileToFotoDataURI(file)
      setForm({ ...form, foto_url: uri })
    } catch (err) {
      toast.show(err.message, 'error')
    } finally {
      if (fotoRef) fotoRef.value = ''
    }
  }

  const impMut = useMutation({
    mutationFn: (body) => apiPost(`/equipos/${equipo.id}/jugadores/importar`, body),
    onSuccess: (res) => {
      qc.invalidateQueries(['jugadores', equipo.id])
      const nErr = (res.errores || []).length
      toast.show(
        `Se crearon ${res.creados} jugadores${nErr ? ` (${nErr} con errores)` : ''}`,
        nErr ? 'warning' : 'success'
      )
      setImpErrores(res.errores || [])
      setImpParseado(null)
      setImpSeleccion(new Set())
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleArchivo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImpParseado(null)
    setImpErrores([])
    setImpParseError('')
    setImpParseando(true)
    try {
      const r = await parseExcel(file)
      setImpParseado(r)
      setImpSeleccion(new Set(r.jugadores.map((_, i) => i)))
    } catch (err) {
      setImpParseError(err.message)
    } finally {
      setImpParseando(false)
      e.target.value = ''
    }
  }

  const toggleFila = (i) => {
    const s = new Set(impSeleccion)
    if (s.has(i)) s.delete(i)
    else s.add(i)
    setImpSeleccion(s)
  }

  const handleImportar = () => {
    const elegidos = (impParseado?.jugadores || []).filter((_, i) => impSeleccion.has(i))
    impMut.mutate({ jugadores: aPayload(elegidos) })
  }

  const activos = jugadores.filter((j) => j.activo).length

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Jugadores de {equipo.nombre}</Typography>
          <Chip label={`${activos} inscritos`} color="primary" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpen(true)}>
            Inscribir jugador
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImpOpen(true)}>
            Importar plantilla
          </Button>
          <Button variant="outlined" color="secondary" startIcon={<LinkIcon />} onClick={() => linkMut.mutate()}>
            Link de inscripción
          </Button>
        </Box>

        {isLoading && <CircularProgress />}
        {isError && <Alert severity="error">{error.message}</Alert>}

        <List dense sx={{ p: 0 }}>
          {jugadores.map((j) => (
            <ListItem
              key={j.id}
              sx={{ p: 0 }}
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton edge="end" size="small" color="secondary" title="Carnet"
                    onClick={() => setCarnet(j)}>
                    <BadgeIcon fontSize="small" />
                  </IconButton>
                  {j.activo ? (
                    <IconButton edge="end" size="small" color="error" title="Liberar jugador"
                      onClick={() => { if (window.confirm('¿Liberar jugador?')) releaseMut.mutate(j.id) }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Box>
              }
            >
              <ListItemButton sx={{ borderRadius: 2 }} onClick={() => setCarnet(j)}>
                <ListItemAvatar>
                  <Avatar variant="rounded" src={j.foto_url || undefined}
                    sx={{ bgcolor: j.foto_url ? 'transparent' : 'primary.main' }}>
                    {!j.foto_url && String(j.nombre).split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`#${j.numero_camiseta} ${j.nombre}`}
                  secondary={[
                    j.posicion ? (POSICION_LABEL[j.posicion] || j.posicion) : null,
                    j.documento_identidad,
                    calcEdad(j.fecha_nacimiento) != null ? `${calcEdad(j.fecha_nacimiento)} años` : null,
                    j.altura_cm ? `${j.altura_cm} cm` : null,
                    j.telefono,
                  ].filter(Boolean).join(' · ')}
                  primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {jugadores.length === 0 && !isLoading && <Typography variant="body2" color="text.secondary">Sin jugadores</Typography>}
        </List>
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleAdd}>
          <DialogTitle>Inscribir jugador</DialogTitle>
          <DialogContent>
            <TextField label="Nombre" fullWidth required margin="normal"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <TextField label="N° camiseta" type="number" fullWidth margin="normal"
              value={form.numero_camiseta} onChange={(e) => setForm({ ...form, numero_camiseta: Number(e.target.value) })} />
            <FormControl fullWidth margin="normal">
              <InputLabel id="jug-pos-label">Posición</InputLabel>
              <Select labelId="jug-pos-label" label="Posición" value={form.posicion}
                onChange={(e) => setForm({ ...form, posicion: e.target.value })}>
                {POSICIONES.map((p) => <MenuItem key={p} value={p}>{POSICION_LABEL[p]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Fecha de nacimiento" type="date" fullWidth margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
            <TextField label="Documento" fullWidth margin="normal"
              value={form.documento_identidad} onChange={(e) => setForm({ ...form, documento_identidad: e.target.value })} />
            <TextField label="Teléfono" fullWidth margin="normal"
              value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <FormControl fullWidth margin="normal">
              <InputLabel id="jug-pierna-label">Pierna hábil</InputLabel>
              <Select labelId="jug-pierna-label" label="Pierna hábil" value={form.pierna_habil}
                onChange={(e) => setForm({ ...form, pierna_habil: e.target.value })}>
                {PIERNAS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Altura (cm)" type="number" fullWidth margin="normal"
              value={form.altura_cm} onChange={(e) => setForm({ ...form, altura_cm: e.target.value })} />
            <FormControl fullWidth margin="normal">
              <InputLabel id="jug-sangre-label">Tipo de sangre</InputLabel>
              <Select labelId="jug-sangre-label" label="Tipo de sangre" value={form.tipo_sangre}
                onChange={(e) => setForm({ ...form, tipo_sangre: e.target.value })}>
                {TIPOS_SANGRE.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="EPS / Entidad de salud" fullWidth margin="normal"
              value={form.eps} onChange={(e) => setForm({ ...form, eps: e.target.value })} />
            <TextField label="Contacto de emergencia (nombre y teléfono)" fullWidth margin="normal"
              value={form.contacto_emergencia} onChange={(e) => setForm({ ...form, contacto_emergencia: e.target.value })} />
            <TextField label="Alergias o condiciones médicas" fullWidth margin="normal"
              value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <input id="jug-foto-input" ref={setFotoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                onChange={(e) => pickFoto(e.target.files?.[0])} />
              <Avatar variant="rounded" src={form.foto_url || undefined}
                sx={{ width: 52, height: 52, bgcolor: form.foto_url ? 'transparent' : 'primary.main' }}>
                {!form.foto_url && <CameraAltIcon fontSize="small" />}
              </Avatar>
              <Box>
                <Button size="small" component="label" htmlFor="jug-foto-input" startIcon={<CameraAltIcon />}>
                  {form.foto_url ? 'Cambiar foto' : 'Subir foto'}
                </Button>
                {form.foto_url && (
                  <Button size="small" color="error" onClick={() => setForm({ ...form, foto_url: '' })}>
                    Quitar
                  </Button>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={addMut.isPending}>
              {addMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Link de inscripción de {equipo.nombre}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Compartí este enlace: cada jugador podrá inscribirse a {equipo.nombre} completando sus datos.
          </Typography>
          {linkAbierta === false && (
            <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
              Las inscripciones de jugadores están cerradas para este torneo. El link seguirá activo cuando se habilité la inscripción.
            </Alert>
          )}
          <TextField
            fullWidth
            margin="normal"
            value={linkUrl()}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={copiarLink} color={copiado ? 'success' : 'default'} title="Copiar enlace">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={copiado ? '¡Enlace copiado!' : 'Abrí el enlace en una ventana anónima para probarlo.'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkOpen(false)}>Cerrar</Button>
          <Button variant="contained" onClick={copiarLink} disabled={copiado}>
            Copiar enlace
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={impOpen} onClose={() => setImpOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Importar plantilla de {equipo.nombre}</DialogTitle>
        <DialogContent>
          <Button size="small" startIcon={<DownloadIcon />} sx={{ mb: 2 }}
            onClick={() => descargarPlantilla(equipo.nombre)}>
            Descargar plantilla modelo
          </Button>

          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={impParseando}
            sx={{ mb: 2, ml: 1 }}>
            {impParseando ? 'Leyendo archivo…' : 'Elegir archivo Excel/CSV'}
            <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleArchivo} />
          </Button>

          {impParseError && <Alert severity="error" sx={{ mb: 2 }}>{impParseError}</Alert>}

          {impParseado && (
            <>
              {impParseado.equipo && (
                <Alert severity={normName(impParseado.equipo) === normName(equipo.nombre) ? 'success' : 'info'} sx={{ mb: 2 }}>
                  Equipo detectado en el archivo: <strong>{impParseado.equipo}</strong>
                  {normName(impParseado.equipo) !== normName(equipo.nombre)
                    ? ' (los jugadores se inscribirán a este equipo: ' + equipo.nombre + ')'
                    : ''}
                </Alert>
              )}
              {impParseado.jugadores.length === 0
                ? <Alert severity="warning">La plantilla no tiene filas de jugadores.</Alert>
                : (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Se detectaron {impParseado.jugadores.length} filas. Marcá las que querés inscribir.
                    </Typography>
                    <TableContainer sx={{ maxHeight: 320, mb: 2 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell>Fila</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell>N°</TableCell>
                            <TableCell>Posición</TableCell>
                            <TableCell>Documento</TableCell>
                            <TableCell>Nacimiento</TableCell>
                            <TableCell>Altura</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {impParseado.jugadores.map((j, i) => (
                            <TableRow key={i} hover selected={impSeleccion.has(i)}
                              sx={{ bgcolor: !j.nombre ? '#fff4e5' : 'inherit' }}>
                              <TableCell padding="checkbox">
                                <Checkbox checked={impSeleccion.has(i)} onChange={() => toggleFila(i)} size="small" />
                              </TableCell>
                              <TableCell>{j._fila}</TableCell>
                              <TableCell>
                                {j.nombre || <Box component="span" color="error.main">Falta nombre</Box>}
                              </TableCell>
                              <TableCell>{j.numero_camiseta}</TableCell>
                              <TableCell>{j.posicion}</TableCell>
                              <TableCell>{j.documento_identidad}</TableCell>
                              <TableCell>{j.fecha_nacimiento}</TableCell>
                              <TableCell>{j.altura_cm}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )
              }
            </>
          )}

          {impErrores.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>{impErrores.length} fila(s) no se inscribieron:</Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {impErrores.map((er, i) => (
                  <li key={i}>
                    <Typography variant="body2">Fila {er.fila}: {er.error}</Typography>
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImpOpen(false)}>Cerrar</Button>
          <Button variant="contained" disabled={!impParseado || impSeleccion.size === 0 || impMut.isPending}
            onClick={handleImportar}>
            {impMut.isPending ? <CircularProgress size={18} color="inherit" />
              : `Importar ${impSeleccion.size} jugador${impSeleccion.size === 1 ? '' : 'es'}`}
          </Button>
        </DialogActions>
      </Dialog>

      <JugadorCarnet
        open={!!carnet}
        onClose={() => setCarnet(null)}
        jugador={carnet}
        equipo={equipo?.nombre}
        torneo={torneoNombre}
        organizador={organizador}
        editableFoto
      />
    </Card>
  )
}

export default function Equipos({ user, selectedTorneoId }) {
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

  // Reusa la caché de torneos cargada en App para mostrar el nombre en el carnet.
  const { data: torneosCache = [] } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
    enabled: false,
  })
  const torneoNombre = torneosCache.find((t) => String(t.id) === String(selectedTorneoId))?.nombre || ''

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
                <ListItem key={eq.id} sx={{ p: 0 }} secondaryAction={
                  <IconButton edge="end" size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar equipo?')) delMut.mutate(eq.id) }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }>
                  <ListItemButton
                    selected={selected?.id === eq.id}
                    onClick={() => setSelected(eq)}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemText primary={eq.nombre} secondary={eq.delegado_email || 'Sin delegado'} />
                  </ListItemButton>
                </ListItem>
              ))}
              {equipos.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Sin equipos. Inscribe el primero.</Typography>}
            </List>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          {selected ? <JugadoresPanel equipo={selected} torneoNombre={torneoNombre} organizador={user?.organizadorName || ''} /> : (
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
