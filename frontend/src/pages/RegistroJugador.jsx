import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Avatar from '@mui/material/Avatar'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import GroupsIcon from '@mui/icons-material/Groups'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import BadgeIcon from '@mui/icons-material/Badge'
import { apiGet, apiPost } from '../api'
import { FONT_DISPLAY, FONT_BODY } from '../publicTheme'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { fileToFotoDataURI } from '../lib/imagen'
import JugadorCarnet from '../components/JugadorCarnet'
import '../publicLanding.css'

const POSICIONES = [
  { value: 'ARQUERO', label: 'Arquero' },
  { value: 'DEFENSOR', label: 'Defensor' },
  { value: 'MEDIOCAMPISTA', label: 'Centrocampista' },
  { value: 'DELANTERO', label: 'Delantero' },
]
const PIERNAS = [
  { value: 'DERECHA', label: 'Derecha' },
  { value: 'IZQUIERDA', label: 'Izquierda' },
  { value: 'AMBIDESTRO', label: 'Ambidestro' },
]
const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const empty = {
  nombre: '', numero_camiseta: '', documento_identidad: '',
  posicion: '', fecha_nacimiento: '', telefono: '', pierna_habil: '', altura_cm: '', foto_url: '',
  tipo_sangre: '', eps: '', contacto_emergencia: '', alergias: '',
}

// Paleta clara y profesional exclusiva de esta página (no afecta la landing oscura)
const T = {
  bg: '#f3f5f9',
  bgGradient: 'radial-gradient(900px 320px at 50% -80px, #e4ebf7 0%, rgba(228,235,247,0) 70%), linear-gradient(180deg, #f8fafc 0%, #eef1f6 100%)',
  card: '#ffffff',
  line: '#e2e8f0',
  lineStrong: '#cbd5e1',
  fg: '#0f172a',
  fgDim: '#334155',
  muted: '#64748b',
  primary: '#004ac6',
  primaryDark: '#003a9e',
  primarySoft: 'rgba(0,74,198,.08)',
  green: '#15803d',
  greenSoft: 'rgba(21,128,61,.1)',
  yellow: '#b45309',
  yellowSoft: 'rgba(217,119,6,.07)',
  red: '#b91c1c',
  redSoft: 'rgba(185,28,28,.05)',
  shadow: '0 1px 2px rgba(15,23,42,.04), 0 12px 32px -16px rgba(15,23,42,.14)',
}

// Tema MUI claro para que Select/Menu/Alert/Dialog se vean claros siempre
const pubLightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: T.primary, dark: T.primaryDark },
    background: { default: T.bg, paper: '#ffffff' },
    text: { primary: T.fg, secondary: T.fgDim },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: FONT_BODY, button: { textTransform: 'none', fontWeight: 600 } },
  components: {
    MuiInputLabel: { defaultProps: { shrink: true } },
    MuiMenu: { styleOverrides: { paper: { border: `1px solid ${T.line}`, boxShadow: T.shadow } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: '12px' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: '14px' } } },
  },
})

// Estilo común de los TextField (homogéneo con el resto del formulario)
const tfSx = {
  mb: 2,
  '& .MuiOutlinedInput-root': {
    bgcolor: '#ffffff',
    fontSize: 14.5,
    boxShadow: '0 1px 2px rgba(15,23,42,.04)',
    '& fieldset': { borderColor: T.lineStrong },
    '&:hover fieldset': { borderColor: '#94a3b8' },
    '&.Mui-focused fieldset': { borderColor: T.primary },
  },
  '& .MuiInputLabel-root': { fontSize: 14.5, color: T.muted, '&.Mui-focused': { color: T.primary } },
}

const selectSx = {
  color: T.fg,
  fontSize: 14.5,
  bgcolor: '#ffffff',
  boxShadow: '0 1px 2px rgba(15,23,42,.04)',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: T.lineStrong },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.primary },
  '& .MuiSvgIcon-root': { color: T.muted },
}

const labelSx = {
  color: T.muted, fontSize: 14.5,
  '&.Mui-focused': { color: T.primary },
}

export default function RegistroJugador() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(null)
  const [verCarnet, setVerCarnet] = useState(false)
  const [fotoRef, setFotoRef] = useState(null)

  const infoQ = useQuery({
    queryKey: ['inscripcion', slug],
    queryFn: () => apiGet(`/inscripcion/${slug}`),
    enabled: !!slug,
    retry: false,
  })

  const info = infoQ.data
  const organo = infoQ.isLoading
  const noExiste = infoQ.isError

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const pickFoto = async (file) => {
    if (!file) return
    try {
      const uri = await fileToFotoDataURI(file)
      setForm({ ...form, foto_url: uri })
    } catch (err) {
      setError(err.message)
    } finally {
      if (fotoRef) fotoRef.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const body = { ...form }
      body.nombre = body.nombre.trim()
      if (body.numero_camiseta === '' || body.numero_camiseta == null) delete body.numero_camiseta
      else body.numero_camiseta = Number(body.numero_camiseta)
      body.altura_cm = body.altura_cm === '' || body.altura_cm == null ? null : Number(body.altura_cm)
      body.posicion = body.posicion || null
      body.pierna_habil = body.pierna_habil || null
      body.fecha_nacimiento = body.fecha_nacimiento || null
      body.telefono = body.telefono || null
      body.documento_identidad = body.documento_identidad || null
      body.tipo_sangre = body.tipo_sangre || null
      body.eps = body.eps || null
      body.contacto_emergencia = body.contacto_emergencia || null
      body.alergias = body.alergias || null
      body.foto_url = body.foto_url || null
      const res = await apiPost(`/inscripcion/${slug}`, body)
      setExito(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const reiniciar = () => { setForm(empty); setError(''); setExito(null) }

  return (
    <ThemeProvider theme={pubLightTheme}>
      <Box sx={{
        minHeight: '100vh',
        bgcolor: T.bg,
        background: T.bgGradient,
        color: T.fg, fontFamily: FONT_BODY,
      }}>
        {/* Header */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)', bgcolor: 'rgba(255,255,255,.88)', borderBottom: `1px solid ${T.line}` }}>
          <Box sx={{ maxWidth: 1152, mx: 'auto', px: { xs: 2, sm: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, boxShadow: '0 4px 12px -4px rgba(0,74,198,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmojiEventsIcon sx={{ color: '#ffffff', fontSize: 18 }} />
              </Box>
              <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: '-.01em', color: T.fg }}>
                {info?.organizador || 'Torneos'}
              </Typography>
            </Box>
            <Button
              onClick={() => navigate('/login')}
              sx={{ fontSize: 13, fontWeight: 600, color: T.fgDim, textDecoration: 'none', border: `1px solid ${T.lineStrong}`, bgcolor: '#ffffff', px: 2.5, py: 1, borderRadius: '10px', cursor: 'pointer', transition: 'all .2s', '&:hover': { borderColor: T.primary, color: T.primary, bgcolor: T.primarySoft } }}
            >
              Ingresar
            </Button>
          </Box>
        </Box>

        <Box component="main" sx={{ position: 'relative', zIndex: 1, maxWidth: 560, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 4, sm: 6 } }}>
          {organo ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={28} sx={{ color: T.primary }} /></Box>
          ) : noExiste ? (
            <Alert severity="error" sx={{ bgcolor: T.redSoft, border: '1px solid rgba(185,28,28,.25)', color: T.red }}>
              El link de inscripción no es válido o fue desactivado.
            </Alert>
          ) : exito ? (
            <Box className="pl-fade-up" sx={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: '16px', p: { xs: 4, sm: 5 }, textAlign: 'center', boxShadow: T.shadow }}>
              <Box sx={{ width: 72, height: 72, mx: 'auto', borderRadius: '50%', bgcolor: T.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HowToRegIcon sx={{ fontSize: 36, color: T.green }} />
              </Box>
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 22, sm: 26 }, mt: 2.5, letterSpacing: '-.01em', color: T.fg }}>
                ¡Inscripción registrada!
              </Typography>
              <Typography sx={{ color: T.fgDim, mt: 1.5, fontSize: 15 }}>
                <strong style={{ color: T.fg }}>{exito.jugador?.nombre}</strong> quedó inscripto en{' '}
                <strong style={{ color: T.primary }}>{info.equipo.nombre}</strong> ({info.torneo.nombre}).
              </Typography>
              {exito.jugador?.numero_camiseta != null && (
                <Typography sx={{ color: T.muted, fontSize: 13, mt: 1 }}>
                  Camiseta N° {exito.jugador.numero_camiseta}
                </Typography>
              )}
              <Box sx={{ mt: 4, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<BadgeIcon />} onClick={() => setVerCarnet(true)}
                  sx={{ color: T.primary, borderColor: T.lineStrong, bgcolor: '#ffffff', '&:hover': { borderColor: T.primary, bgcolor: T.primarySoft } }}>
                  Ver mi carnet
                </Button>
                <Button variant="outlined" onClick={reiniciar}
                  sx={{ color: T.fgDim, borderColor: T.line, bgcolor: '#ffffff', '&:hover': { borderColor: T.lineStrong, bgcolor: '#f8fafc' } }}>
                  Registrar otro jugador
                </Button>
                <Button variant="contained" onClick={() => navigate('/login')}
                  sx={{ bgcolor: T.primary, color: '#ffffff', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: T.primaryDark, boxShadow: 'none' } }}>
                  Ir al panel
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <Box className="pl-fade-up" sx={{ mb: 3, background: T.card, border: `1px solid ${T.line}`, borderRadius: '16px', p: { xs: 2.5, sm: 3 }, boxShadow: T.shadow, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                <Box sx={{ width: 60, height: 60, borderRadius: '14px', background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`, boxShadow: '0 6px 14px -6px rgba(0,74,198,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SportsSoccerIcon sx={{ color: '#ffffff', fontSize: 26 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: T.primary, textTransform: 'uppercase' }}>
                    Inscripción de jugadores
                  </Typography>
                  <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 20, sm: 24 }, mt: 0.25, letterSpacing: '-.01em', color: T.fg }}>
                    {info.equipo.nombre}
                  </Typography>
                  <Typography sx={{ color: T.muted, fontSize: 13.5, mt: 0.25 }}>{info.torneo.nombre}</Typography>
                </Box>
              </Box>

              {info.inscripciones_abiertas === false && (
                <Alert severity="warning" className="pl-fade-up" sx={{ mb: 3, bgcolor: T.yellowSoft, border: '1px solid rgba(217,119,6,.3)', color: T.yellow }}>
                  Las inscripciones están cerradas por ahora. Si el torneo las rehabilita, este link vuelve a funcionar.
                </Alert>
              )}

              <Box className="pl-fade-up" component="form" onSubmit={handleSubmit}
                sx={{ position: 'relative', overflow: 'hidden', background: T.card, border: `1px solid ${T.line}`, borderRadius: '16px', p: { xs: 3, sm: 4 }, mb: 3, boxShadow: T.shadow }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${T.primary}, #3b82f6)` }} />
                <Typography sx={{ mb: 2.5, fontSize: 11, letterSpacing: '.12em', color: T.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                  Tus datos
                </Typography>

                <TextField label="Nombre completo *" required fullWidth
                  value={form.nombre} onChange={set('nombre')}
                  sx={tfSx} />
                <TextField label="N° de camiseta" type="number" fullWidth
                  slotProps={{ htmlInput: { min: 0, max: 999 } }}
                  value={form.numero_camiseta} onChange={set('numero_camiseta')}
                  sx={tfSx} />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="r-pos-label" sx={labelSx}>Posición</InputLabel>
                  <Select labelId="r-pos-label" label="Posición" value={form.posicion} onChange={set('posicion')} sx={selectSx}>
                    {POSICIONES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField
                  label="Fecha de nacimiento"
                  type="date"
                  fullWidth
                  value={form.fecha_nacimiento}
                  onChange={set('fecha_nacimiento')}
                  sx={{ ...tfSx, colorScheme: 'light' }}
                />
                <TextField label="Documento de identidad" fullWidth
                  value={form.documento_identidad} onChange={set('documento_identidad')}
                  sx={tfSx} />
                <TextField label="Teléfono" fullWidth
                  value={form.telefono} onChange={set('telefono')}
                  sx={tfSx} />

                <Typography sx={{ mt: 2, mb: 2, fontSize: 11, letterSpacing: '.12em', color: T.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                  Datos médicos (opcional)
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="r-sangre-label" sx={labelSx}>Tipo de sangre</InputLabel>
                  <Select labelId="r-sangre-label" label="Tipo de sangre" value={form.tipo_sangre} onChange={set('tipo_sangre')} sx={selectSx}>
                    {TIPOS_SANGRE.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="EPS / Entidad de salud" fullWidth
                  value={form.eps} onChange={set('eps')}
                  sx={tfSx} />
                <TextField label="Contacto de emergencia (nombre y teléfono)" fullWidth
                  value={form.contacto_emergencia} onChange={set('contacto_emergencia')}
                  sx={tfSx} />
                <TextField label="Alergias o condiciones médicas" fullWidth
                  value={form.alergias} onChange={set('alergias')}
                  sx={tfSx} />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="r-pierna-label" sx={labelSx}>Pierna hábil</InputLabel>
                  <Select labelId="r-pierna-label" label="Pierna hábil" value={form.pierna_habil} onChange={set('pierna_habil')} sx={selectSx}>
                    {PIERNAS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField label="Altura (cm)" type="number" fullWidth
                  slotProps={{ htmlInput: { min: 100, max: 250 } }}
                  value={form.altura_cm} onChange={set('altura_cm')}
                  sx={tfSx} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                  <input id="r-foto-input" ref={setFotoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                    onChange={(e) => pickFoto(e.target.files?.[0])} />
                  <Avatar variant="rounded" src={form.foto_url || undefined}
                    sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: '#f1f5f9', border: `1px solid ${T.line}`, color: T.muted }}>
                    {!form.foto_url && <CameraAltIcon fontSize="small" />}
                  </Avatar>
                  <Box>
                    <Button size="small" component="label" htmlFor="r-foto-input" startIcon={<CameraAltIcon />}
                      sx={{ color: T.primary, bgcolor: '#ffffff', borderColor: T.lineStrong, border: '1px solid', borderRadius: '10px', px: 1.75, py: 0.75, cursor: 'pointer', '&:hover': { borderColor: T.primary, bgcolor: T.primarySoft } }}>
                      {form.foto_url ? 'Cambiar foto' : 'Subir foto (opcional)'}
                    </Button>
                    {form.foto_url && (
                      <Button size="small" onClick={() => setForm({ ...form, foto_url: '' })}
                        sx={{ ml: 1, color: T.red, '&:hover': { bgcolor: T.redSoft } }}>
                        Quitar
                      </Button>
                    )}
                  </Box>
                </Box>

                {error && <Alert severity="error" sx={{ mt: 1, mb: 1, bgcolor: T.redSoft, border: '1px solid rgba(185,28,28,.25)', color: T.red }}>{error}</Alert>}

                <Button type="submit" variant="contained" fullWidth disabled={enviando}
                  sx={{ mt: 2.5, py: 1.8, bgcolor: T.primary, color: '#ffffff', fontWeight: 700, fontSize: 15, borderRadius: '12px', letterSpacing: '.01em', textTransform: 'none', boxShadow: '0 8px 18px -8px rgba(0,74,198,.55)', '&:hover': { bgcolor: T.primaryDark, boxShadow: '0 10px 22px -8px rgba(0,74,198,.6)' }, '&:disabled': { opacity: .65, boxShadow: 'none' } }}>
                  {enviando ? <CircularProgress size={20} color="inherit" /> : 'Inscribirme'}
                </Button>
              </Box>

              <Box className="pl-fade-up" sx={{ display: 'flex', gap: 2, alignItems: 'center', color: T.muted, fontSize: 13, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupsIcon sx={{ fontSize: 16 }} />
                  <span><strong style={{ color: T.fgDim }}>{info.jugadores_inscritos}</strong> de {info.max_jugadores} cupos ocupados</span>
                </Box>
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Box sx={{ height: 6, borderRadius: 100, bgcolor: T.line, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: 100, background: `linear-gradient(90deg, ${T.primary}, #3b82f6)`, transition: 'width 1s ease', width: `${Math.min(100, Math.round((info.jugadores_inscritos / info.max_jugadores) * 100))}%` }} />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>

        <JugadorCarnet
          open={verCarnet}
          onClose={() => setVerCarnet(false)}
          jugador={exito?.jugador || null}
          equipo={info?.equipo.nombre}
          torneo={info?.torneo.nombre}
          organizador={info?.organizador}
        />
      </Box>
    </ThemeProvider>
  )
}