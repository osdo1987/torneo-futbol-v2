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
import { PUB, FONT_DISPLAY, FONT_BODY } from '../publicTheme'
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

const campo = {
  display: 'block',
  width: '100%',
  bgcolor: 'rgba(255,255,255,.04)',
  border: `1px solid ${PUB.line}`,
  borderRadius: '10px',
  px: 2.5, py: 1.7,
  mb: 1.5,
  fontSize: 14.5,
  color: PUB.fg,
  outline: 'none',
  fontFamily: FONT_BODY,
  transition: 'border-color .2s',
  '&:focus': { borderColor: PUB.lineStrong, bgcolor: 'rgba(0,240,255,.04)' },
  '&::placeholder': { color: PUB.muted },
  '&:disabled': { opacity: .5, cursor: 'not-allowed' },
}

const selectSx = {
  color: PUB.fg,
  fontSize: 14.5,
  bgcolor: 'transparent',
  '&:before': { borderBottom: `1px solid ${PUB.line}` },
  '&:after': { borderBottom: `2px solid ${PUB.cyan}` },
  '& .MuiSvgIcon-root': { color: PUB.muted },
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
    <Box sx={{
      minHeight: '100vh',
      bgcolor: PUB.bg,
      background: 'radial-gradient(circle at 50% 10%, #071749 0%, #020621 60%)',
      color: PUB.fg, fontFamily: FONT_BODY,
    }}>
      {/* Header */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', bgcolor: 'rgba(2,6,33,.85)', borderBottom: '2px solid rgba(0,240,255,.1)' }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto', px: { xs: 2, sm: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '8px', background: 'linear-gradient(135deg, #0b2a6b, #061138)', border: `1px solid ${PUB.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmojiEventsIcon sx={{ color: PUB.cyan, fontSize: 17 }} />
            </Box>
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, letterSpacing: '2px', textTransform: 'uppercase', color: PUB.fg }}>
              {info?.organizador || 'Torneos'}
            </Typography>
          </Box>
          <Button
            onClick={() => navigate('/login')}
            sx={{ fontSize: 12, fontWeight: 700, color: PUB.fg, textDecoration: 'none', border: `1px solid ${PUB.lineStrong}`, bgcolor: 'rgba(255,255,255,.04)', px: 2, py: 1, borderRadius: '8px', cursor: 'pointer', transition: 'all .2s', '&:hover': { borderColor: PUB.cyan, color: PUB.cyan } }}
          >
            Ingresar
          </Button>
        </Box>
      </Box>

      <Box component="main" sx={{ position: 'relative', zIndex: 1, maxWidth: 560, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        {organo ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={28} sx={{ color: PUB.cyan }} /></Box>
        ) : noExiste ? (
          <Alert severity="error" sx={{ bgcolor: PUB.liveSoft, border: `1px solid ${PUB.live}`, color: PUB.fg }}>
            El link de inscripción no es válido o fue desactivado.
          </Alert>
        ) : exito ? (
          <Box className="pl-fade-up" sx={{ background: PUB.panel, border: `1px solid ${PUB.line}`, borderRadius: 3, p: { xs: 4, sm: 5 }, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
            <HowToRegIcon sx={{ fontSize: 52, color: PUB.green }} />
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 24, sm: 30 }, mt: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              ¡Inscripción registrada!
            </Typography>
            <Typography sx={{ color: PUB.fgDim, mt: 2, fontSize: 15 }}>
              <strong style={{ color: PUB.fg }}>{exito.jugador?.nombre}</strong> quedó inscripto en{' '}
              <strong style={{ color: PUB.cyan }}>{info.equipo.nombre}</strong> ({info.torneo.nombre}).
            </Typography>
            {exito.jugador?.numero_camiseta != null && (
              <Typography sx={{ color: PUB.muted, fontSize: 13, mt: 1 }}>
                Camiseta N° {exito.jugador.numero_camiseta}
              </Typography>
            )}
            <Box sx={{ mt: 4, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<BadgeIcon />} onClick={() => setVerCarnet(true)}
                sx={{ color: PUB.cyan, borderColor: PUB.lineStrong, '&:hover': { borderColor: PUB.cyan, bgcolor: PUB.goldSoft } }}>
                Ver mi carnet
              </Button>
              <Button variant="outlined" onClick={reiniciar}
                sx={{ color: PUB.fgDim, borderColor: PUB.line, '&:hover': { borderColor: PUB.lineStrong } }}>
                Registrar otro jugador
              </Button>
              <Button variant="contained" onClick={() => navigate('/login')}
                sx={{ bgcolor: PUB.cyan, color: '#020621', fontWeight: 700, '&:hover': { bgcolor: '#8ff5ff', color: '#020621' } }}>
                Ir al panel
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <Box className="pl-fade-up" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: 3, background: 'linear-gradient(135deg, #0b2a6b, #061138)', border: `1px solid ${PUB.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SportsSoccerIcon sx={{ color: PUB.cyan, fontSize: 28 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', color: PUB.cyan, textTransform: 'uppercase' }}>
                  Inscripción de jugadores
                </Typography>
                <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 20, sm: 26 }, mt: 0.5, textTransform: 'uppercase', color: PUB.fg }}>
                  {info.equipo.nombre}
                </Typography>
                <Typography sx={{ color: PUB.fgDim, fontSize: 13.5, mt: 0.5 }}>{info.torneo.nombre}</Typography>
              </Box>
            </Box>

            {info.inscripciones_abiertas === false && (
              <Alert severity="warning" className="pl-fade-up" sx={{ mb: 3, bgcolor: 'rgba(255,170,0,.08)', border: `1px solid ${PUB.yellow}`, color: PUB.fg }}>
                Las inscripciones están cerradas por ahora. Si el torneo las rehabilita, este link vuelve a funcionar.
              </Alert>
            )}

            <Box className="pl-fade-up" component="form" onSubmit={handleSubmit}
              sx={{ background: PUB.panelDeep, border: `1px solid ${PUB.line}`, borderRadius: 3, p: { xs: 3, sm: 4 }, mb: 3 }}>
              <Typography sx={{ mb: 2.5, fontSize: 10, letterSpacing: '.14em', color: PUB.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                Tus datos
              </Typography>

              <Box component="input" required placeholder="Nombre completo *" value={form.nombre} onChange={set('nombre')} sx={campo} />
              <Box component="input" type="number" min={0} max={999} placeholder="N° de camiseta" value={form.numero_camiseta} onChange={set('numero_camiseta')} sx={campo} />

              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="r-pos-label" sx={{ color: PUB.muted }}>Posición</InputLabel>
                <Select labelId="r-pos-label" label="Posición" value={form.posicion} onChange={set('posicion')} sx={selectSx}>
                  {POSICIONES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </Select>
              </FormControl>

              <Box component="input" type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} sx={{ ...campo, colorScheme: 'dark' }} />
              <Box component="input" placeholder="Documento de identidad" value={form.documento_identidad} onChange={set('documento_identidad')} sx={campo} />
              <Box component="input" placeholder="Teléfono" value={form.telefono} onChange={set('telefono')} sx={campo} />

              <Typography sx={{ mt: 2, mb: 1.5, fontSize: 10, letterSpacing: '.14em', color: PUB.muted, fontWeight: 700, textTransform: 'uppercase' }}>
                Datos médicos (opcional)
              </Typography>

              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="r-sangre-label" sx={{ color: PUB.muted }}>Tipo de sangre</InputLabel>
                <Select labelId="r-sangre-label" label="Tipo de sangre" value={form.tipo_sangre} onChange={set('tipo_sangre')} sx={selectSx}>
                  {TIPOS_SANGRE.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <Box component="input" placeholder="EPS / Entidad de salud" value={form.eps} onChange={set('eps')} sx={campo} />
              <Box component="input" placeholder="Contacto de emergencia (nombre y teléfono)" value={form.contacto_emergencia} onChange={set('contacto_emergencia')} sx={campo} />
              <Box component="input" placeholder="Alergias o condiciones médicas" value={form.alergias} onChange={set('alergias')} sx={campo} />

              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="r-pierna-label" sx={{ color: PUB.muted }}>Pierna hábil</InputLabel>
                <Select labelId="r-pierna-label" label="Pierna hábil" value={form.pierna_habil} onChange={set('pierna_habil')} sx={selectSx}>
                  {PIERNAS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </Select>
              </FormControl>

              <Box component="input" type="number" min={100} max={250} placeholder="Altura (cm)" value={form.altura_cm} onChange={set('altura_cm')} sx={campo} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                <input id="r-foto-input" ref={setFotoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                  onChange={(e) => pickFoto(e.target.files?.[0])} />
                <Avatar variant="rounded" src={form.foto_url || undefined}
                  sx={{ width: 52, height: 52, bgcolor: form.foto_url ? 'transparent' : 'rgba(255,255,255,.08)', border: `1px solid ${PUB.line}`, color: PUB.muted }}>
                  {!form.foto_url && <CameraAltIcon fontSize="small" />}
                </Avatar>
                <Box>
                  <Button size="small" component="label" htmlFor="r-foto-input" startIcon={<CameraAltIcon />}
                    sx={{ color: PUB.cyan, borderColor: PUB.lineStrong, border: '1px solid', borderRadius: '8px', px: 1.5, py: 0.5, cursor: 'pointer' }}>
                    {form.foto_url ? 'Cambiar foto' : 'Subir foto (opcional)'}
                  </Button>
                  {form.foto_url && (
                    <Button size="small" onClick={() => setForm({ ...form, foto_url: '' })}
                      sx={{ ml: 1, color: PUB.live }}>
                      Quitar
                    </Button>
                  )}
                </Box>
              </Box>

              {error && <Alert severity="error" sx={{ mt: 1, mb: 1, bgcolor: PUB.liveSoft, border: `1px solid ${PUB.live}`, color: PUB.fg }}>{error}</Alert>}

              <Button type="submit" variant="contained" fullWidth disabled={enviando}
                sx={{ mt: 2, py: 1.8, bgcolor: PUB.cyan, color: '#020621', fontWeight: 800, fontSize: 15, letterSpacing: '.04em', textTransform: 'uppercase', '&:hover': { bgcolor: '#8ff5ff' }, '&:disabled': { opacity: .6 } }}>
                {enviando ? <CircularProgress size={20} color="inherit" /> : 'Inscribirme'}
              </Button>
            </Box>

            <Box className="pl-fade-up" sx={{ display: 'flex', gap: 2, alignItems: 'center', color: PUB.muted, fontSize: 12.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon sx={{ fontSize: 15 }} />
                <span><strong style={{ color: PUB.fgDim }}>{info.jugadores_inscritos}</strong> de {info.max_jugadores} cupos ocupados</span>
              </Box>
              <Box sx={{ flex: 1, minWidth: 120 }}>
                <Box sx={{ height: 6, borderRadius: 100, bgcolor: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                  <Box className="pl-stat-bar-fill" sx={{ height: '100%', width: `${Math.min(100, Math.round((info.jugadores_inscritos / info.max_jugadores) * 100))}%` }} />
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
  )
}