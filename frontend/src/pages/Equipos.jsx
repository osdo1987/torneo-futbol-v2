import { useMemo, useState } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
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
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Drawer from '@mui/material/Drawer'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { alpha } from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  Badge as BadgeIcon,
  CameraAlt as CameraAltIcon,
  Link as LinkIcon,
  ContentCopy as ContentCopyIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Groups as GroupsIcon,
  Verified as VerifiedIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
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
  const nac = new Date(String(fecha) + 'T00:00:00')
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

function initials(nombre) {
  return String(nombre || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function Pill({ children, bg, color, sx = {} }) {
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.25, py: 0.5, borderRadius: '9999px', fontSize: 11, fontWeight: 700,
      lineHeight: 1, letterSpacing: '0.02em', whiteSpace: 'nowrap',
      bgcolor: bg, color, ...sx,
    }}>
      {children}
    </Box>
  )
}

const POSICION_PILL = {
  ARQUERO: { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  DEFENSOR: { bg: 'rgba(0,82,204,0.08)', color: '#1d4ed8', dot: '#0052cc' },
  MEDIOCAMPISTA: { bg: 'rgba(14,165,233,0.10)', color: '#0369a1', dot: '#0ea5e9' },
  DELANTERO: { bg: 'rgba(239,68,68,0.08)', color: '#b91c1c', dot: '#ef4444' },
}

function Dialogs({ open, setOpen, form, setForm, handleAdd, addMut, fotoRef: setFotoRef, pickFoto, impOpen, setImpOpen, impParseando, impParseError, impParseado, impSeleccion, toggleFila, handleArchivo, impErrores, handleImportar, impMut, linkOpen, setLinkOpen, linkUrl, linkAbierta, copiado, copiarLink, equipo }) {
  return (
    <>
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
              Las inscripciones de jugadores están cerradas para este torneo. El link seguirá activo cuando se habilite la inscripción.
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
    </>
  )
}

function JugadoresPanel({ equipo, torneoNombre = '', organizador = '', maxJugadores = 18, onClose }) {
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
  const [filtroPosicion, setFiltroPosicion] = useState('todos')
  const [pagina, setPagina] = useState(0)
  const rowsPerPage = 10

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

  const activos = jugadores.filter((j) => j.activo)
  const edades = activos.map((j) => calcEdad(j.fecha_nacimiento)).filter((v) => v != null)
  const alturas = activos.map((j) => j.altura_cm).filter(Boolean)
  const promEdad = edades.length ? (edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1) : null
  const promAltura = alturas.length ? (alturas.reduce((a, b) => a + b, 0) / alturas.length / 100).toFixed(2) : null
  const conDoc = activos.filter((j) => j.documento_identidad).length
  const cupoPct = maxJugadores ? Math.round((activos.length / maxJugadores) * 100) : 0

  const metricas = [
    { label: 'Promedio Edad', valor: promEdad, unidad: 'años', color: 'text.primary' },
    { label: 'Estatura Media', valor: promAltura, unidad: 'm', color: 'text.primary' },
    { label: 'Documentos Cargados', valor: `${conDoc} / ${activos.length}`, unidad: 'habilitados', color: 'primary.main' },
    { label: 'Cupo Utilizado', valor: `${activos.length}`, unidad: `de ${maxJugadores}`, color: 'success.main' },
  ]

  const filtrados = useMemo(() => {
    if (filtroPosicion === 'todos') return jugadores
    return jugadores.filter((j) => j.posicion === filtroPosicion)
  }, [jugadores, filtroPosicion])

  const paginaFiltrada = filtrados.length ? filtrados.slice(pagina * rowsPerPage, pagina * rowsPerPage + rowsPerPage) : []

  const conteoPos = (pos) => (pos === 'todos' ? jugadores.length : jugadores.filter((j) => j.posicion === pos).length)

  const filtros = [
    { key: 'todos', label: 'Todos' },
    { key: 'ARQUERO', label: 'Arqueros' },
    { key: 'DEFENSOR', label: 'Defensores' },
    { key: 'MEDIOCAMPISTA', label: 'Centrocampistas' },
    { key: 'DELANTERO', label: 'Delanteros' },
  ]

  const handleChangeFiltro = (key) => {
    setFiltroPosicion(key)
    setPagina(0)
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Panel header */}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, alignItems: { xl: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
                {initials(equipo.nombre)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
                    Jugadores de {equipo.nombre}
                  </Typography>
                  <Pill bg={alpha('#0052cc', 0.1)} color="#1d4ed8">
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#0052cc' }} />
                    {activos.length} inscritos
                  </Pill>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Delegado: {equipo.delegado_email || 'sin registrar'}
                  {cupoPct >= 100 ? ' · Plantilla completa' : cupoPct >= 70 ? ' · Cerca del cupo' : ''}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, width: { xs: '100%', xl: 'auto' }, justifyContent: { xs: 'flex-end', xl: 'flex-start' } }}>
              {onClose && (
                <IconButton size="small" onClick={onClose} title="Cerrar panel"
                  sx={{ order: { xs: -1, xl: 1 }, ml: { xl: 1 }, alignSelf: { xs: 'flex-end', xl: 'auto' }, flex: '0 0 auto', color: 'text.secondary', bgcolor: 'background.default', '&:hover': { bgcolor: 'action.hover', color: 'text.primary' } }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <Button size="small" startIcon={<LinkIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />} onClick={() => linkMut.mutate()}
                sx={{ textTransform: 'none', fontWeight: 600, bgcolor: 'background.default', color: 'text.primary', px: 1.5, py: 0.75, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' }, flex: { xs: '1 1 46%', xl: '0 0 auto' } }}>
                Link de inscripción
              </Button>
              <Button size="small" startIcon={<UploadFileIcon sx={{ fontSize: 18, color: '#10b981' }} />} onClick={() => setImpOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600, bgcolor: 'background.default', color: 'text.primary', px: 1.5, py: 0.75, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' }, flex: { xs: '1 1 46%', xl: '0 0 auto' } }}>
                Importar plantilla
              </Button>
              <Button size="small" variant="contained" startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />} onClick={() => setOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, px: 1.5, py: 0.75, borderRadius: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.12)', flex: { xs: '1 1 100%', xl: '0 0 auto' } }}>
                Inscribir jugador
              </Button>
            </Box>
          </Box>

          {/* Metric cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', sm: { gridTemplateColumns: 'repeat(4, 1fr)' }, gap: 1, mt: 2 }}>
            {metricas.map((m) => (
              <Box key={m.label} sx={{ p: 1.25, bgcolor: 'background.default', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', fontWeight: 600 }}>
                  {m.label}
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: m.color, lineHeight: 1 }}>
                    {m.valor ?? '—'}
                  </Typography>
                  {m.valor != null && <Typography variant="body2" color="text.secondary">{m.unidad}</Typography>}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Roster table */}
      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            {filtros.map((f) => (
              <Button key={f.key} size="small"
                onClick={() => handleChangeFiltro(f.key)}
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: 12, borderRadius: 1.5, px: 1.25, py: 0.5, minWidth: 0,
                  bgcolor: filtroPosicion === f.key ? 'primary.main' : 'background.paper',
                  color: filtroPosicion === f.key ? 'primary.contrastText' : 'text.secondary',
                  boxShadow: filtroPosicion === f.key ? 1 : 'none',
                  '&:hover': {
                    bgcolor: filtroPosicion === f.key ? 'primary.dark' : 'action.hover',
                    color: filtroPosicion === f.key ? 'primary.contrastText' : 'text.primary',
                  },
                }}>
                {f.label} ({conteoPos(f.key)})
              </Button>
            ))}
          </Box>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                {['Dorsal', 'Jugador', 'Posición', 'Edad / Altura', 'Identificación', 'Estado', 'Acciones'].map((c, i) => (
                  <TableCell key={c} sx={{
                    textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'text.secondary',
                    ...(c === 'Dorsal' || c === 'Edad / Altura' || c === 'Estado' ? { textAlign: 'center' } : {}),
                    ...(i === 0 ? { width: 72 } : {}),
                    ...(i === 6 ? { textAlign: 'right' } : {}),
                  }}>
                    {c}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginaFiltrada.map((j) => {
                const pill = POSICION_PILL[j.posicion] || { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' }
                return (
                  <TableRow key={j.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box component="span" sx={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 1.5,
                        bgcolor: j.numero_camiseta === 10 ? 'rgba(0,82,204,0.1)' : 'background.default',
                        color: j.numero_camiseta === 10 ? '#0052cc' : 'text.secondary',
                        fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums',
                      }}>
                        {j.numero_camiseta}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Avatar src={j.foto_url || undefined} sx={{ width: 38, height: 38, bgcolor: j.foto_url ? 'transparent' : 'primary.main', fontSize: 13, flexShrink: 0 }}>
                          {!j.foto_url && initials(j.nombre)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {j.nombre}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {j.pierna_habil ? `${j.pierna_habil.toLowerCase().replace(/^./, (c) => c.toUpperCase())} · ` : ''}{j.numero_camiseta === 10 ? 'Capitán' : 'Ficha oficial'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Pill bg={pill.bg} color={pill.color}>
                        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: pill.dot }} />
                        {POSICION_LABEL[j.posicion] || 'Sin posición'}
                      </Pill>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{calcEdad(j.fecha_nacimiento) ?? '—'} años</Typography>
                      <Typography variant="caption" color="text.secondary">{j.altura_cm ? `${(j.altura_cm / 100).toFixed(2)} m` : '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontFamily: 'monospace' }}>{j.documento_identidad ?? '—'}</Typography>
                      <Typography variant="caption" sx={{ color: j.documento_identidad ? 'success.main' : 'warning.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 12 }} />
                        {j.documento_identidad ? 'Habilitado' : 'Sin documento'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {j.activo ? (
                        <Pill bg={alpha('#10b981', 0.12)} color="#065f46">Titular</Pill>
                      ) : (
                        <Pill bg={alpha('#ef4444', 0.08)} color="#b91c1c">Liberado</Pill>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton size="small" color="primary" title="Ver carnet" onClick={() => setCarnet(j)}>
                          <BadgeIcon fontSize="small" />
                        </IconButton>
                        {j.activo ? (
                          <IconButton size="small" color="error" title="Liberar jugador"
                            onClick={() => { if (window.confirm('¿Liberar jugador de la plantilla?')) releaseMut.mutate(j.id) }}>
                            <PersonRemoveIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
              {paginaFiltrada.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <Typography variant="body2">No hay jugadores{jugadores.length ? ' en esta posición' : ' en esta plantilla.'}</Typography>
                    {jugadores.length === 0 && (
                      <Button size="small" variant="contained" startIcon={<PersonAddIcon />} sx={{ mt: 1 }} onClick={() => setOpen(true)}>
                        Inscribir el primero
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtrados.length}
          page={pagina}
          onPageChange={(_, p) => setPagina(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
          labelRowsPerPage=""
          labelDisplayedRows={({ from, to, count }) => `Mostrando ${from}–${to} de ${count} jugadores`}
        />
      </Card>

      <Dialogs
        open={open} setOpen={setOpen} form={form} setForm={setForm} handleAdd={handleAdd} addMut={addMut}
        fotoRef={setFotoRef} pickFoto={pickFoto}
        impOpen={impOpen} setImpOpen={setImpOpen} impParseando={impParseando} impParseError={impParseError}
        impParseado={impParseado} impSeleccion={impSeleccion} toggleFila={toggleFila} handleArchivo={handleArchivo}
        impErrores={impErrores} handleImportar={handleImportar} impMut={impMut}
        linkOpen={linkOpen} setLinkOpen={setLinkOpen} linkUrl={linkUrl} linkAbierta={linkAbierta}
        copiado={copiado} copiarLink={copiarLink} equipo={equipo}
      />

      <JugadorCarnet
        open={!!carnet}
        onClose={() => setCarnet(null)}
        jugador={carnet}
        equipo={equipo?.nombre}
        torneo={torneoNombre}
        organizador={organizador}
        editableFoto
      />
    </Box>
  )
}

export default function Equipos({ user, selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyEquipo)
  const [busqueda, setBusqueda] = useState('')

  const { data: equipos = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipos', selectedTorneoId],
    queryFn: () => apiGet(`/equipos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: torneosCache = [] } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
    enabled: false,
  })
  const torneoNombre = torneosCache.find((t) => String(t.id) === String(selectedTorneoId))?.nombre || ''
  const torneoObj = torneosCache.find((t) => String(t.id) === String(selectedTorneoId))
  const maxJugadores = torneoObj?.max_jugadores_por_equipo || 18

  const teamQueries = useQueries({
    queries: equipos.map((e) => ({
      queryKey: ['jugadores', e.id],
      queryFn: () => apiGet(`/equipos/${e.id}/jugadores`),
      enabled: !!selectedTorneoId,
    })),
  })

  const addMut = useMutation({
    mutationFn: (body) => apiPost('/equipos', body),
    onSuccess: () => { qc.invalidateQueries(['equipos', selectedTorneoId]); toast.show('Equipo inscrito', 'success'); setOpen(false); setForm(emptyEquipo) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const delMut = useMutation({
    mutationFn: (id) => apiDelete(`/equipos/${id}`),
    onSuccess: () => { qc.invalidateQueries(['equipos', selectedTorneoId]); setSelected(null); setDrawerOpen(false); toast.show('Equipo eliminado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    addMut.mutate({ ...form, torneo_id: selectedTorneoId })
  }

  const equiposVisibles = equipos.filter((e) => {
    const q = normName(busqueda)
    if (!q) return true
    return normName(e.nombre).includes(q) || normName(e.delegado_email).includes(q)
  })

  const totalActivos = teamQueries.reduce((acc, q) => acc + (q.data?.filter((j) => j.activo).length || 0), 0)
  const conDocTotal = teamQueries.reduce((acc, q) => acc + (q.data?.filter((j) => j.activo && j.documento_identidad).length || 0), 0)
  const sinDocTotal = Math.max(totalActivos - conDocTotal, 0)
  const liberadosTotal = teamQueries.reduce((acc, q) => acc + (q.data?.filter((j) => !j.activo).length || 0), 0)
  const registros = totalActivos + liberadosTotal
  const pctHabilitados = totalActivos ? Math.round((conDocTotal / totalActivos) * 100) : 0
  const segDoc = registros ? (conDocTotal / registros) * 100 : 0
  const segSinDoc = registros ? (sinDocTotal / registros) * 100 : 0
  const segLib = registros ? Math.max(100 - segDoc - segSinDoc, 0) : 0
  const completos = teamQueries.filter((q) => (q.data?.filter((j) => j.activo).length || 0) >= maxJugadores).length

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para gestionar equipos.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'primary.main' }}>
            {torneoNombre || 'Torneo'}
          </Typography>
          <Box component="span" sx={{ color: 'text.disabled' }}>•</Box>
          <Typography variant="caption" color="text.secondary">Cupo {maxJugadores} jugadores por equipo</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Equipos</Typography>
            <Typography variant="body2" color="text.secondary">Inscribe delegaciones y gestiona sus plantillas oficiales</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 1.5, md: 2 }, py: { xs: 1, md: 1.25 }, bgcolor: 'background.paper', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider', flex: { xs: '1 1 auto', md: '0 0 auto' } }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block' }}>
                  Inscritos
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{equipos.length}</Typography>
              </Box>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                <GroupsIcon sx={{ fontSize: 20 }} />
              </Box>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, height: 52, flex: { xs: '1 1 auto', md: '0 0 auto' } }}>
              Inscribir equipo
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        {/* Clubs directory */}
        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
        }}>
          <Card>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Clubes</Typography>
                  <Pill bg="background.default" color="#0052cc">{equipos.length} Activos</Pill>
                </Box>
                <IconButton size="small" title="Filtrar equipos" sx={{ color: 'text.secondary' }}>
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por club o delegado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: 1.5 } }}
              />
            </Box>
          </Card>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(150px, 1fr))', md: 'repeat(auto-fill, minmax(165px, 1fr))', xl: 'repeat(auto-fill, minmax(180px, 1fr))' }, gap: { xs: 1, lg: 1.25 }, alignSelf: 'stretch' }}>
            {equiposVisibles.map((eq, idx) => {
              const q = teamQueries[idx]
              const activos = q?.data?.filter((j) => j.activo).length || 0
              const isSel = selected?.id === eq.id
              const completo = activos >= maxJugadores
              const pctPlantilla = maxJugadores ? Math.min(100, Math.round((activos / maxJugadores) * 100)) : 0
              return (
                <Card
                  key={eq.id}
                  onClick={() => { setSelected(eq); setDrawerOpen(true) }}
                  sx={{
                    position: 'relative', cursor: 'pointer', overflow: 'hidden',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    bgcolor: isSel ? alpha('#0052cc', 0.06) : 'background.paper',
                    border: '1px solid', borderColor: isSel ? 'primary.main' : 'divider',
                    boxShadow: isSel ? '0 8px 20px -4px rgba(0,82,204,0.15), 0 4px 8px -2px rgba(15,23,42,0.04)' : '0 1px 3px rgba(0,0,0,0.04)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px -4px rgba(0,82,204,0.20), 0 4px 8px -2px rgba(15,23,42,0.06)' },
                  }}
                >
                  {isSel && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'primary.main' }} />
                  )}
                  <Box sx={{ p: 1.4 }}>
                    <Box sx={{ position: 'relative', minWidth: 0 }}>
                      <IconButton
                        size="small" title="Eliminar delegación"
                        sx={{
                          position: 'absolute', top: -6, right: -6, zIndex: 1, p: 0.75,
                          color: 'text.disabled', bgcolor: 'background.paper',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) },
                        }}
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar el equipo y toda su plantilla?')) delMut.mutate(eq.id) }}
                      >
                        <DeleteIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, pr: 2.5 }}>
                        <Avatar variant="rounded" sx={{ width: 34, height: 34, bgcolor: isSel ? 'primary.main' : 'background.default', color: isSel ? 'primary.contrastText' : 'primary.main', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                          {initials(eq.nombre)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {eq.nombre}
                            </Typography>
                            {completo && <VerifiedIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', lineHeight: 1.4 }}>
                            {eq.delegado_email || 'Sin delegado'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75, mt: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {activos}<Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>/{maxJugadores}</Box>
                        </Typography>
                        <Pill bg={completo ? alpha('#10b981', 0.12) : alpha('#0ea5e9', 0.1)} color={completo ? '#065f46' : '#0369a1'} sx={{ px: 1, py: 0.4, fontSize: 10 }}>
                          {completo ? 'Listo' : `Faltan ${maxJugadores - activos}`}
                        </Pill>
                      </Box>
                      <Box sx={{ mt: 1, height: 5, bgcolor: 'background.default', borderRadius: 3, overflow: 'hidden' }}>
                        <LinearProgress
                          variant="determinate"
                          value={pctPlantilla}
                          color={completo ? 'success' : 'info'}
                          sx={{ height: 5, borderRadius: 3, '.MuiLinearProgress-bar': { transition: 'width 0.4s ease' } }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Card>
              )
            })}
            {equipos.length === 0 && (
              <Card sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', gridColumn: '1 / -1' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Sin equipos. Inscribe el primero.</Typography>
              </Card>
            )}
            {equipos.length > 0 && equiposVisibles.length === 0 && (
              <Card sx={{ p: 3, textAlign: 'center', gridColumn: '1 / -1' }}>
                <Typography variant="body2" color="text.secondary">Sin resultados para «{busqueda}»</Typography>
              </Card>
            )}
          </Box>

          {/* Inscripciones summary */}
          <Card sx={{ bgcolor: 'background.paper' }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Auditoría de Fichajes</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 12, color: 'success.main' }}>{pctHabilitados}% Habilitados</Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'background.default', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                {registros > 0 && (
                  <>
                    <Box sx={{ height: '100%', bgcolor: 'success.main', width: `${segDoc}%` }} />
                    <Box sx={{ height: '100%', bgcolor: 'info.main', width: `${segSinDoc}%` }} />
                    <Box sx={{ height: '100%', bgcolor: 'error.main', width: `${segLib}%` }} />
                  </>
                )}
                {registros === 0 && <Box sx={{ height: '100%', width: '100%', bgcolor: 'divider' }} />}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  {conDocTotal} Validados
                </Box>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />
                  {sinDocTotal} Pendientes
                </Box>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                  {liberadosTotal} Sancionados
                </Box>
              </Box>
            </Box>
          </Card>
        </Box>

        </Box>

      {/* Right sidebar: selected team roster */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null) }}
        keepMounted
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: '92vw', md: 580, lg: 600 },
            maxWidth: '100%',
            bgcolor: 'background.default',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          {selected && (
            <JugadoresPanel equipo={selected} torneoNombre={torneoNombre} organizador={user?.organizadorName || ''} maxJugadores={maxJugadores} onClose={() => { setDrawerOpen(false); setSelected(null) }} />
          )}
        </Box>
      </Drawer>

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