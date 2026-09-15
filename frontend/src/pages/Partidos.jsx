import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import { apiGet, apiPost } from '../api'
import { useToast } from '../components/Toast'
import {
  Add as AddIcon,
  Apps as AppsIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon,
  CalendarToday as CalendarTodayIcon,
  CheckCircle as CheckCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  EditNote as EditNoteIcon,
  FileDownload as FileDownloadIcon,
  Flag as FlagIcon,
  Print as PrintIcon,
  Schedule as ScheduleIcon,
  Scoreboard as ScoreboardIcon,
  Sports as SportsIcon,
  SportsSoccer as SportsSoccerIcon,
  Stadium as StadiumIcon,
  Tag as TagIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material'
import Alert from '@mui/material/Alert'

const RESULTADOS = {
  PENDIENTE: ['Programado', 'default'],
  POSTERGADO: ['Postergado', 'warning'],
  LOCAL_GANO: ['Local ganó', 'success'],
  VISITANTE_GANO: ['Visitante ganó', 'success'],
  EMPATE: ['Empate', 'info'],
  W_LOCAL: ['W local', 'secondary'],
  W_VISITANTE: ['W visitante', 'secondary'],
}

const ESTADOS_JUGADOS = ['LOCAL_GANO', 'VISITANTE_GANO', 'EMPATE', 'W_LOCAL', 'W_VISITANTE']

const TIPO_EVENTO_META = {
  GOL: { color: 'primary', icon: <SportsSoccerIcon /> },
  TARJETA_AMARILLA: { color: 'warning', icon: <Box component="span" sx={{ width: 10, height: 14, bgcolor: '#f59e0b', borderRadius: 0.5 }} /> },
  TARJETA_ROJA: { color: 'error', icon: <Box component="span" sx={{ width: 10, height: 14, bgcolor: '#ef4444', borderRadius: 0.5 }} /> },
  AUTOGOL: { color: 'secondary', icon: <SportsSoccerIcon /> },
}

const RESULT_PILL = {
  LOCAL_GANO: { text: 'Local ganó', color: '#0c56d0' },
  VISITANTE_GANO: { text: 'Visitante ganó', color: '#0c56d0' },
  EMPATE: { text: 'Empate', color: '#334155' },
  W_LOCAL: { text: 'W Local', color: '#334155' },
  W_VISITANTE: { text: 'W Visitante', color: '#334155' },
}

const initials = (name) => String(name || '?')
  .split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fmtFecha = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

const fmtFechaCorta = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })
}

const ordinal = (n) => `${n}º`

function Pill({ bg, color, sx, children }) {
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.9, py: 0.35, borderRadius: 99, fontSize: 11, fontWeight: 700, lineHeight: 1.2,
      bgcolor: bg, color, whiteSpace: 'nowrap', ...sx,
    }}>
      {children}
    </Box>
  )
}

export default function Partidos({ selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ equipo_local_id: '', equipo_visitante_id: '', jornada: 1 })
  const [resultOpen, setResultOpen] = useState(null)
  const [resultForm, setResultForm] = useState({ goles_local: 0, goles_visitante: 0 })
  const [wOpen, setWOpen] = useState(null)
  const [wForm, setWForm] = useState({ bando: 'LOCAL' })
  const [progOpen, setProgOpen] = useState(null)
  const [progForm, setProgForm] = useState({ fecha_programada: '' })
  const [eventosOpen, setEventosOpen] = useState(null)
  const [jornadaSel, setJornadaSel] = useState('')
  const [filtro, setFiltro] = useState('TODOS')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 6

  useEffect(() => { setPage(0) }, [jornadaSel, filtro])

  const { data: partidos = [], isLoading, isError, error } = useQuery({
    queryKey: ['partidos', selectedTorneoId],
    queryFn: () => apiGet(`/partidos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos', selectedTorneoId],
    queryFn: () => apiGet(`/equipos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: tablaResp } = useQuery({
    queryKey: ['tabla', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/tabla`),
    enabled: !!selectedTorneoId,
  })

  const posByName = useMemo(() => {
    const m = {}
    ;(tablaResp?.posiciones || []).forEach((r, i) => { m[r.equipo] = i + 1 })
    return m
  }, [tablaResp])

  const { data: eventosData, isLoading: eventosLoading } = useQuery({
    queryKey: ['eventos', eventosOpen?.id],
    queryFn: () => apiGet(`/landing/partido/${eventosOpen.id}/eventos`),
    enabled: !!eventosOpen?.id,
  })

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/partidos', body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido creado', 'success'); setOpen(false) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const resultMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/resultado`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen'])
      toast.show('Resultado guardado', 'success'); setResultOpen(null)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const programarMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/programar`, body),
    onSuccess: () => { qc.invalidateQueries(['partidos', selectedTorneoId]); toast.show('Partido programado', 'success'); setProgOpen(null) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const wMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/w`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen'])
      toast.show('W registrado', 'success'); setWOpen(null)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const liveMut = useMutation({
    mutationFn: (id) => apiPost(`/partidos/${id}/en_vivo`, { seg: 0, running: true, iniciado: true }),
    onSuccess: (d, id) => {
      qc.invalidateQueries(['partidos', selectedTorneoId])
      toast.show('Marcador en vivo iniciado', 'success')
      navigate(`/planilla?partido=${id}`)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMut.mutate({
      ...form, torneo_id: selectedTorneoId,
      equipo_local_id: Number(form.equipo_local_id), equipo_visitante_id: Number(form.equipo_visitante_id),
    })
  }

  const handleResult = (e) => {
    e.preventDefault()
    resultMut.mutate({ id: resultOpen.id, body: resultForm })
  }

  const eqName = (id) => equipos.find((x) => String(x.id) === String(id))?.nombre || `Equipo #${id}`

  const jornadas = [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b)

  const visibles = partidos.filter((p) => {
    if (jornadaSel !== '' && String(p.jornada) !== String(jornadaSel)) return false
    if (filtro === 'PENDIENTES') return !ESTADOS_JUGADOS.includes(p.resultado)
    if (filtro === 'JUGADOS') return ESTADOS_JUGADOS.includes(p.resultado)
    return true
  })

  const jugadosCount = partidos.filter((p) => ESTADOS_JUGADOS.includes(p.resultado)).length
  const totalVisible = visibles.length
  const pageCount = Math.max(1, Math.ceil(totalVisible / PAGE_SIZE))
  const pagina = Math.min(page, pageCount - 1)
  const paginados = visibles.slice(pagina * PAGE_SIZE, pagina * PAGE_SIZE + PAGE_SIZE)

  const ScoreTeam = ({ p, lado, strong }) => {
    const nombre = eqName(lado === 'local' ? p.equipo_local_id : p.equipo_visitante_id)
    const posicion = posByName[nombre]
    const goles = lado === 'local' ? p.goles_local : p.goles_visitante
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Avatar sx={{
            width: 36, height: 36, borderRadius: 1.5, fontSize: 13, fontWeight: 800, flexShrink: 0,
            bgcolor: strong ? 'primary.main' : 'background.paper',
            color: strong ? 'primary.contrastText' : 'text.secondary',
            boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
          }}>
            {initials(nombre)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontWeight: strong ? 800 : 700, fontSize: 14, lineHeight: 1.2,
              color: strong ? 'primary.main' : 'text.primary',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {nombre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {lado === 'local' ? 'Local' : 'Visitante'}
              {!ESTADOS_JUGADOS.includes(p.resultado) && posicion ? ` · Posición: ${ordinal(posicion)}` : ''}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{
          fontWeight: 800, fontSize: 22, lineHeight: 1, fontVariantNumeric: 'tabular-nums', pl: 1, flexShrink: 0,
          color: strong ? 'primary.main' : 'text.secondary',
        }}>
          {goles}
        </Typography>
      </Box>
    )
  }

  const MatchCard = ({ p }) => {
    const jugado = ESTADOS_JUGADOS.includes(p.resultado)
    const [label, color] = RESULTADOS[p.resultado] || [p.resultado, 'default']
    const localGano = jugado && ['LOCAL_GANO', 'W_LOCAL'].includes(p.resultado)
    const visitanteGano = jugado && ['VISITANTE_GANO', 'W_VISITANTE'].includes(p.resultado)
    const barColor = jugado ? (p.resultado === 'EMPATE' ? '#006846' : '#0052cc') : '#006591'
    const pill = RESULT_PILL[p.resultado]

    return (
      <Card elevation={0} sx={{
        position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: 2, bgcolor: 'background.paper', p: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        '&:hover': { boxShadow: '0 10px 26px -6px rgba(12,86,208,0.16)' },
        transition: 'all 0.2s ease', border: '1px solid', borderColor: 'divider', minWidth: 0,
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, bgcolor: barColor, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} />

        {/* Header strip */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pl: 1.5, pb: 1, mb: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flexWrap: 'wrap' }}>
            <Pill bg="background.default" color="text.secondary">Jornada {p.jornada}</Pill>
            {jugado ? (
              <Pill bg="rgba(0,104,70,0.1)" color="#006846" sx={{ display: 'inline-flex' }}>
                <CheckCircleIcon sx={{ fontSize: 13 }} /> Finalizado
              </Pill>
            ) : p.resultado === 'POSTERGADO' ? (
              <Pill bg="rgba(180,83,9,0.12)" color="#92400e">Postergado</Pill>
            ) : (
              <Pill bg="rgba(0,101,145,0.1)" color="#006591">
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#006591' }} /> Programado
              </Pill>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: 12, fontWeight: 600, pl: 0.5 }}>
            {p.fecha_programada ? (
              <>
                <CalendarMonthIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                <span className="trim-fecha">{fmtFechaCorta(p.fecha_programada)}</span>
              </>
            ) : (
              <Pill bg="rgba(180,83,9,0.1)" color="#92400e">Sin fecha</Pill>
            )}
          </Box>
        </Box>

        {/* Scoreboard */}
        <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <ScoreTeam p={p} lado="local" strong={localGano} />
          <Box sx={{ display: 'flex', alignItems: 'center', py: 0.25 }}>
            <Pill bg={jugado ? 'background.paper' : 'rgba(0,101,145,0.1)'} color={pill ? pill.color : (jugado ? 'text.secondary' : '#006591')} sx={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10, px: 1 }}>
              {jugado ? pill.text : 'Por jugar'}
            </Pill>
            <Box sx={{ flex: 1, mx: 1.5, borderTop: '1px dashed', borderColor: 'outline.main' }} />
            {jugado && <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>FT</Typography>}
          </Box>
          <ScoreTeam p={p} lado="visitante" strong={visitanteGano} />
        </Box>

        {/* Metadata */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.5, py: 1.5, color: 'text.secondary', fontSize: 13 }}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <ScheduleIcon sx={{ fontSize: 15, color: 'primary.main' }} />
            {p.fecha_programada ? fmtFecha(p.fecha_programada) : 'Sin programar'}
          </Box>
          {jugado ? (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, flexShrink: 0 }}>
              <StadiumIcon sx={{ fontSize: 15, color: 'primary.main' }} /> Jornada {p.jornada}
            </Box>
          ) : (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, flexShrink: 0 }}>
              <VerifiedUserIcon sx={{ fontSize: 15, color: '#006591' }} /> Por designar
            </Box>
          )}
        </Box>

        {/* CTAs */}
        <Box sx={{ mt: 'auto' }}>
          {jugado ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', pl: 1.5 }}>
              <Button
                variant="contained" startIcon={<AssignmentIcon sx={{ fontSize: 17 }} />}
                onClick={() => navigate(`/planilla?partido=${p.id}`)}
                sx={{ flex: 1, textTransform: 'none', fontWeight: 700, borderRadius: 1.5, py: 1 }}
              >
                Abrir planilla
              </Button>
              <IconButton size="small" title="Editar resultado" onClick={() => { setResultOpen(p); setResultForm({ goles_local: p.goles_local, goles_visitante: p.goles_visitante }) }}
                sx={{ color: 'text.secondary', bgcolor: 'background.default', '&:hover': { color: 'primary.main' } }}>
                <EditNoteIcon sx={{ fontSize: 19 }} />
              </IconButton>
              <IconButton size="small" title="Ver eventos del partido" onClick={() => setEventosOpen(p)}
                sx={{ color: 'text.secondary', bgcolor: 'background.default', '&:hover': { color: '#006591' } }}>
                <SportsSoccerIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, pl: 1.5, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
              {[
                { key: 'planilla', label: 'Planilla', icon: AssignmentIcon, tone: 'primary', onClick: () => navigate(`/planilla?partido=${p.id}`) },
                { key: 'marcador', label: 'Marcador', icon: ScoreboardIcon, tone: 'secondary', onClick: () => { if (window.confirm('¿Iniciar el marcador en vivo? Se abrirá la planilla del partido.')) liveMut.mutate(p.id) } },
                { key: 'horario', label: 'Horario', icon: ScheduleIcon, tone: 'default', onClick: () => { setProgOpen(p); setProgForm({ fecha_programada: toLocalInput(p.fecha_programada) }) } },
                { key: 'w', label: 'W (W/O)', icon: FlagIcon, tone: 'error', onClick: () => { setWOpen(p); setWForm({ bando: 'LOCAL' }) } },
              ].map((b) => (
                <Button
                  key={b.key}
                  onClick={b.onClick}
                  sx={{
                    display: 'flex', flexDirection: 'column', gap: 0.4, py: 1.1, px: 0.25, borderRadius: 1.25,
                    bgcolor: b.tone === 'error' ? 'rgba(186,26,26,0.08)' : 'background.default',
                    color: b.tone === 'primary' ? 'primary.main' : b.tone === 'secondary' ? '#006591' : b.tone === 'error' ? '#b91c1c' : 'text.primary',
                    textTransform: 'none', fontSize: 10.5, fontWeight: 700, lineHeight: 1,
                    '&:hover': { bgcolor: b.tone === 'error' ? 'rgba(186,26,26,0.16)' : 'action.hover' },
                  }}
                >
                  <b.icon sx={{ fontSize: 18 }} />
                  {b.label}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      </Card>
    )
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver los partidos.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <SportsIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'text.secondary' }}>
            Temporada Regular · {tablaResp?.torneo || 'Fase Regular'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Partidos</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, fontSize: 14 }}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: 'text.primary' }}>{partidos.length} partidos</Box>
              <Box component="span" sx={{ color: 'text.disabled' }}>/</Box>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: 'success.main' }}>{jugadosCount} jugados</Box>
              <Box component="span" sx={{ color: 'text.disabled' }}>/</Box>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: '#006591' }}>{partidos.length - jugadosCount} por jugar</Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
            <Box sx={{
              display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75, px: 1.5, py: 1, borderRadius: 1.5,
              bgcolor: 'background.paper', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider',
            }}>
              <CalendarTodayIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{jornadas.length} jornadas</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, height: 44, flex: { xs: '1 1 auto', md: '0 0 auto' } }}>
              Nuevo partido
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Banner */}
      <Box sx={{ mb: 2, position: 'relative', overflow: 'hidden', borderRadius: 2.5, boxShadow: '0 4px 16px -6px rgba(33,49,69,0.5)' }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #213145 0%, #24394f 55%, #1d2c3e 100%)',
        }} />
        <Box sx={{ position: 'absolute', right: -40, top: -60, width: 300, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(12,86,208,0.45), transparent 70%)', opacity: 0.6 }} />
        <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2, md: 3 }, py: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 1.5, bgcolor: 'rgba(12,86,208,0.40)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4d2ff', flexShrink: 0 }}>
              <SportsSoccerIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4edea3', animation: 'torneoPulse 1.6s ease-in-out infinite' }} />
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#5debaf' }}>Feed Oficial de Competencia</Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#eaf1ff', letterSpacing: '-0.01em' }}>Panel de Arbitraje y Programación</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(220,233,255,0.75)' }}>Control en directo de actas de juego, designación arbitral y homologación de resultados.</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>
            <Button
              size="small" startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
              onClick={() => toast.show('Planillas del día próximamente', 'info')}
              sx={{ flex: { xs: 1, md: '0 0 auto' }, color: '#eaf1ff', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, textTransform: 'none', fontWeight: 700, borderRadius: 1.25 }}
            >
              Planillas del Día
            </Button>
            <Button
              size="small" startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
              onClick={() => toast.show('Exportar calendario próximamente', 'info')}
              sx={{ flex: { xs: 1, md: '0 0 auto' }, color: '#eaf1ff', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, textTransform: 'none', fontWeight: 700, borderRadius: 1.25 }}
            >
              Exportar Calendario
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Filter toolbar */}
      <Card elevation={0} sx={{ mb: 2, p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 1.5, alignItems: { lg: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflowX: 'auto', pb: { xs: 0.5 }, scrollbarWidth: 'thin', maxWidth: '100%' }}>
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mr: 0.5 }}>
              <TagIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 800, color: 'text.secondary' }}>Jornada:</Typography>
            </Box>
            <Button
              size="small"
              onClick={() => setJornadaSel('')}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700, borderRadius: 99, px: 2, minHeight: 32, bgcolor: jornadaSel === '' ? 'primary.main' : 'background.default', color: jornadaSel === '' ? 'primary.contrastText' : 'text.primary', '&:hover': { bgcolor: jornadaSel === '' ? 'primary.dark' : 'action.hover' } }}
            >
              Todas
            </Button>
            {jornadas.map((j) => {
              const sel = String(jornadaSel) === String(j)
              return (
                <Button
                  key={j} size="small" onClick={() => setJornadaSel(String(j))}
                  sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700, borderRadius: 99, px: 1.75, minHeight: 32, bgcolor: sel ? 'primary.main' : 'background.default', color: sel ? 'primary.contrastText' : 'text.primary', '&:hover': { bgcolor: sel ? 'primary.dark' : 'action.hover' } }}
                >
                  Jornada {j}
                </Button>
              )
            })}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'background.default', p: 0.5, borderRadius: 1.5, flexShrink: 0, alignSelf: { xs: 'flex-start', lg: 'auto' } }}>
            {[
              { key: 'TODOS', label: 'Todos', icon: AppsIcon, dot: null, count: partidos.length },
              { key: 'JUGADOS', label: 'Jugados', icon: null, dot: '#006846', count: jugadosCount },
              { key: 'PENDIENTES', label: 'Por jugar', icon: null, dot: '#006591', count: partidos.length - jugadosCount },
            ].map((s) => {
              const sel = filtro === s.key
              return (
                <Button
                  key={s.key} size="small" onClick={() => setFiltro(s.key)}
                  sx={{
                    textTransform: 'none', fontWeight: sel ? 800 : 600, px: 1.5, minHeight: 34, borderRadius: 1.25,
                    bgcolor: sel ? 'background.paper' : 'transparent', color: sel ? 'text.primary' : 'text.secondary',
                    boxShadow: sel ? '0 1px 2px rgba(0,0,0,0.10)' : 'none',
                  }}
                >
                  {s.icon ? <s.icon sx={{ fontSize: 15, color: 'primary.main', mr: 0.5 }} /> : <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.dot, mr: 0.75 }} />}
                  {s.label}
                  <Box component="span" sx={{ ml: 0.5, px: 0.8, py: 0.1, borderRadius: 1, bgcolor: sel ? 'background.default' : 'background.paper', fontSize: 10, fontWeight: 800 }}>{s.count}</Box>
                </Button>
              )
            })}
          </Box>
        </Box>
      </Card>

      {partidos.length === 0 && <Alert severity="info">No hay partidos aún. Genera un fixture desde la sección Torneos o crea uno manualmente.</Alert>}
      {partidos.length > 0 && totalVisible === 0 && (
        <Alert severity="info">No hay partidos con los filtros seleccionados.</Alert>
      )}

      {/* Match grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {paginados.map((p) => <MatchCard key={p.id} p={p} />)}
      </Box>

      {/* Footer */}
      {totalVisible > 0 && (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'background.default', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#006846' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Sincronización de resultados en tiempo real activa</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">Mostrando {paginados.length} de {totalVisible} partidos</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" disabled={pagina === 0} onClick={() => setPage(pagina - 1)} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={pagina >= pageCount - 1} onClick={() => setPage(pagina + 1)} sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* Crear */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleCreate}>
          <DialogTitle>Nuevo partido</DialogTitle>
          <DialogContent>
            <TextField select label="Equipo local" fullWidth required margin="normal" value={form.equipo_local_id}
              onChange={(e) => setForm({ ...form, equipo_local_id: e.target.value })}>
              {equipos.map((eq) => <MenuItem key={eq.id} value={eq.id}>{eq.nombre}</MenuItem>)}
            </TextField>
            <TextField select label="Equipo visitante" fullWidth required margin="normal" value={form.equipo_visitante_id}
              onChange={(e) => setForm({ ...form, equipo_visitante_id: e.target.value })}>
              {equipos.map((eq) => <MenuItem key={eq.id} value={eq.id}>{eq.nombre}</MenuItem>)}
            </TextField>
            <TextField label="Jornada" type="number" fullWidth margin="normal" value={form.jornada}
              onChange={(e) => setForm({ ...form, jornada: Number(e.target.value) })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMut.isPending}>
              {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Resultado */}
      <Dialog open={!!resultOpen} onClose={() => setResultOpen(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleResult}>
          <DialogTitle>Registrar resultado</DialogTitle>
          <DialogContent>
            {resultOpen && (
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {eqName(resultOpen.equipo_local_id)} vs {eqName(resultOpen.equipo_visitante_id)}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Goles local" type="number" fullWidth value={resultForm.goles_local}
                onChange={(e) => setResultForm({ ...resultForm, goles_local: Number(e.target.value) })} />
              <TextField label="Goles visitante" type="number" fullWidth value={resultForm.goles_visitante}
                onChange={(e) => setResultForm({ ...resultForm, goles_visitante: Number(e.target.value) })} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setResultOpen(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={resultMut.isPending}>
              {resultMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Programar */}
      <Dialog open={!!progOpen} onClose={() => setProgOpen(null)} fullWidth maxWidth="xs">
        <form onSubmit={(e) => { e.preventDefault(); programarMut.mutate({ id: progOpen.id, body: progForm }) }}>
          <DialogTitle>Programar partido</DialogTitle>
          <DialogContent>
            {progOpen && (
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {eqName(progOpen.equipo_local_id)} vs {eqName(progOpen.equipo_visitante_id)} · Jornada {progOpen.jornada}
              </Typography>
            )}
            <TextField label="Fecha y hora" type="datetime-local" fullWidth required margin="normal"
              value={progForm.fecha_programada}
              onChange={(e) => setProgForm({ fecha_programada: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start"><ScheduleIcon fontSize="small" /></InputAdornment> }} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProgOpen(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={programarMut.isPending}>
              {programarMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Programar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* W */}
      <Dialog open={!!wOpen} onClose={() => setWOpen(null)} fullWidth maxWidth="xs">
        <DialogTitle>Registrar W (inasistencia)</DialogTitle>
        <DialogContent>
          {wOpen && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {eqName(wOpen.equipo_local_id)} vs {eqName(wOpen.equipo_visitante_id)} — elige el equipo que se PRESENTÓ.
              Gana por W con el marcador definido en el reglamento.
            </Typography>
          )}
          <TextField select label="Gana por W" fullWidth value={wForm.bando}
            onChange={(e) => setWForm({ bando: e.target.value })}>
            <MenuItem value="LOCAL">Local — {wOpen ? eqName(wOpen.equipo_local_id) : ''}</MenuItem>
            <MenuItem value="VISITANTE">Visitante — {wOpen ? eqName(wOpen.equipo_visitante_id) : ''}</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWOpen(null)}>Cancelar</Button>
          <Button variant="contained" color="warning" disabled={wMut.isPending}
            onClick={() => wMut.mutate({ id: wOpen.id, body: wForm })}>
            {wMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Registrar W'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Eventos */}
      <Dialog open={!!eventosOpen} onClose={() => setEventosOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {eventosOpen ? `${eqName(eventosOpen.equipo_local_id)} ${eventosOpen.goles_local} – ${eventosOpen.goles_visitante} ${eqName(eventosOpen.equipo_visitante_id)}` : ''}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {eventosLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (eventosData?.eventos || []).length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>Este partido no registra eventos (también puede ser un W).</Alert>
          ) : (
            <List dense>
              {(eventosData?.eventos || []).map((ev) => {
                const meta = TIPO_EVENTO_META[ev.tipo] || TIPO_EVENTO_META.GOL
                return (
                  <ListItem key={ev.id} sx={{ gap: 1.5 }}>
                    <Box sx={{ color: `${meta.color}.main`, display: 'flex' }}>{meta.icon}</Box>
                    <Box sx={{ px: 0.6, py: 0.2, borderRadius: 1, bgcolor: 'background.default', fontWeight: 800, fontSize: 11 }}>{ev.minuto}'</Box>
                    <ListItemText
                      primary={ev.jugador || 'Jugador eliminado'}
                      secondary={ev.tipo === 'TARJETA_AMARILLA' ? 'Tarjeta amarilla' : ev.tipo === 'TARJETA_ROJA' ? 'Tarjeta roja' : ev.equipo}
                    />
                  </ListItem>
                )
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEventosOpen(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}