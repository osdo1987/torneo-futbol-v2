import { useCallback, useEffect, useMemo, useState } from 'react'
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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { apiGet, apiPost, apiPut } from '../api'
import { useToast } from '../components/Toast'
import {
  Add as AddIcon,
  Apps as AppsIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarMonthIcon,
  CalendarToday as CalendarTodayIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  CheckCircle as CheckCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  EditNote as EditNoteIcon,
  Edit as EditIcon,
  Place as PlaceIcon,
  Schedule as ScheduleIcon,
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

const fmtFechaCorta = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })
}

const hoyISO = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ISO (UTC) → valor para <input type="datetime-local"> (zona local).
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Combina 'YYYY-MM-DD' + 'HH:MM' en un Date local (naive, igual que la API).
const combinarFechaHora = (iso, hora) => {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const [hh, mm] = String(hora || '08:00').split(':').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

const desplazarFecha = (dt, dias, horas) => {
  if (!dt) return null
  const out = new Date(dt.getTime())
  out.setDate(out.getDate() + (Number(dias) || 0))
  out.setHours(out.getHours() + (Number(horas) || 0))
  return out
}

const isoDe = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const DIAS_SEMANA = [
  { valor: 1, label: 'Lun' }, { valor: 2, label: 'Mar' }, { valor: 3, label: 'Mié' },
  { valor: 4, label: 'Jue' }, { valor: 5, label: 'Vie' }, { valor: 6, label: 'Sáb' },
  { valor: 0, label: 'Dom' },
]

// Espacios de juego = combinación (día, hora, locación); el patrón se repite cada semana.
// diasConfig = [{ dia: 0-6, horas: ['16:00', ...] }] permite horarios distintos por día
// (p. ej. sábados 16:00 y domingos 08:00).
const construirEspacios = ({ fechaInicio, diasConfig, locacionIds, semanas }) => {
  const inicio = combinarFechaHora(fechaInicio, '00:00')
  if (!inicio || !diasConfig?.length || !semanas) return []
  const sedes = locacionIds?.length ? locacionIds : [null]
  const salida = []
  for (let s = 0; s < semanas; s += 1) {
    for (let d = 0; d < 7; d += 1) {
      const dia = desplazarFecha(inicio, s * 7 + d, 0)
      const cfg = diasConfig.find((c) => c.dia === dia.getDay())
      if (!cfg || !cfg.horas.length) continue
      const fecha = isoDe(dia)
      const horasDia = [...cfg.horas].sort()
      horasDia.forEach((hora) => {
        sedes.forEach((locacionId) => salida.push({ fecha, hora, locacion_id: locacionId }))
      })
    }
  }
  return salida
}

const fmtDiaLocal = (fechaISO) => {
  const d = combinarFechaHora(fechaISO, '00:00')
  return d ? d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' }) : ''
}

const fmtFechaHora = (dt) => (dt
  ? `${dt.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })} · ${dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
  : '')

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

export default function Partidos({ selectedTorneoId, user }) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const isReferee = user?.role === 'REFEREE'
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ equipo_local_id: '', equipo_visitante_id: '', jornada: 1 })
  const [resultOpen, setResultOpen] = useState(null)
  const [resultForm, setResultForm] = useState({ goles_local: 0, goles_visitante: 0 })
  const [wOpen, setWOpen] = useState(null)
  const [wForm, setWForm] = useState({ bando: 'LOCAL' })
  const [progOpen, setProgOpen] = useState(null)
  const [progForm, setProgForm] = useState({ fecha_programada: '' })
  const [eventosOpen, setEventosOpen] = useState(null)
  const [editOpen, setEditOpen] = useState(null)
  const [editForm, setEditForm] = useState({ equipo_local_id: '', equipo_visitante_id: '', jornada: 1, fecha_programada: '', locacion_id: '' })
  const [jornadaSel, setJornadaSel] = useState('')
  const [filtro, setFiltro] = useState('TODOS')
  const [page, setPage] = useState(0)
  const [fixtureOpen, setFixtureOpen] = useState(false)
  const [fixtureForm, setFixtureForm] = useState({
    modo: 'ESPACIOS',
    fecha_inicio: hoyISO(),
    dias: [6, 0],
    horasPorDia: { 6: ['16:00'], 0: ['08:00'] },
    horaNuevaPorDia: {},
    locacionIds: [],
    semanas: '',
    dias_entre_jornadas: 7,
    horas_entre_partidos: 2,
    reemplazar: false,
  })
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

  // Torneo activo desde la caché compartida de App.jsx (reglas + estado)
  const { data: torneos = [] } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
    enabled: !!user && user.role !== 'SUPERADMIN',
  })
  const torneo = useMemo(
    () => torneos.find((t) => String(t.id) === String(selectedTorneoId)),
    [torneos, selectedTorneoId],
  )

  // Locaciones (sedes) del organizador: se ofrecen al generar el fixture
  const { data: locaciones = [] } = useQuery({
    queryKey: ['locaciones'],
    queryFn: () => apiGet('/locaciones'),
    enabled: !!user && user.role !== 'SUPERADMIN' && user.role !== 'REFEREE',
  })
  const locacionesActivas = useMemo(
    () => locaciones.filter((l) => l.activa !== false),
    [locaciones],
  )

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

  const editMut = useMutation({
    mutationFn: ({ id, body }) => apiPut(`/partidos/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen']); qc.invalidateQueries(['equipos', selectedTorneoId])
      toast.show('Partido actualizado', 'success'); setEditOpen(null)
    },
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

  const fixtureMut = useMutation({
    mutationFn: (body) => apiPost(`/torneos/${selectedTorneoId}/fixture`, body),
    onSuccess: (d) => {
      qc.invalidateQueries(['partidos', selectedTorneoId])
      qc.invalidateQueries(['tabla', selectedTorneoId])
      qc.invalidateQueries(['resumen'])
      qc.invalidateQueries(['torneos'])
      setJornadaSel('')
      setFiltro('TODOS')
      setFixtureOpen(false)
      setFixtureForm((f) => ({ ...f, reemplazar: false }))
      toast.show(`${d.message}: ${d.partidos} partidos en ${d.jornadas} jornadas${d.programados ? ` (${d.programados} con fecha y hora${d.locaciones ? ` · ${d.locaciones} locación(es)` : ''})` : ''}`, 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleGenerarFixture = (e) => {
    e.preventDefault()
    const body = { reemplazar: partidos.length > 0 ? fixtureForm.reemplazar : false }
    if (fixtureForm.modo === 'ESPACIOS') {
      body.espacios = espaciosUsados
    } else if (fixtureForm.modo === 'SIMPLE') {
      body.programacion = {
        fecha_inicio: fixtureForm.fecha_inicio,
        hora_inicio: fixtureForm.hora_inicio,
        dias_entre_jornadas: Number(fixtureForm.dias_entre_jornadas),
        horas_entre_partidos: Number(fixtureForm.horas_entre_partidos),
      }
    }
    fixtureMut.mutate(body)
  }

  const abrirFixture = () => {
    setFixtureForm((f) => ({
      ...f,
      reemplazar: false,
      locacionIds: locacionesActivas.map((l) => l.id),
    }))
    setFixtureOpen(true)
  }

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

  const handleAbrirEdicion = (p) => {
    setEditForm({
      equipo_local_id: p.equipo_local_id,
      equipo_visitante_id: p.equipo_visitante_id,
      jornada: p.jornada,
      fecha_programada: toLocalInput(p.fecha_programada),
      locacion_id: p.locacion_id || '',
    })
    setEditOpen(p)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    const body = {
      equipo_local_id: Number(editForm.equipo_local_id),
      equipo_visitante_id: Number(editForm.equipo_visitante_id),
      jornada: Number(editForm.jornada || 1),
    }
    body.fecha_programada = editForm.fecha_programada ? new Date(editForm.fecha_programada).toISOString() : null
    if (editForm.locacion_id) body.locacion_id = Number(editForm.locacion_id)
    editMut.mutate({ id: editOpen.id, body })
  }

  const eqName = useCallback((id) => equipos.find((x) => String(x.id) === String(id))?.nombre || `Equipo #${id}`, [equipos])

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

  // ---- Fixture automático (estimaciones + bloqueos) ----
  const rondasTorneo = torneo?.reglas?.rondas === 2 ? 2 : 1
  const equiposCount = equipos.length
  const jornadasBase = equiposCount > 1 && equiposCount % 2 === 0 ? equiposCount - 1 : equiposCount
  const jornadasTotales = jornadasBase * rondasTorneo
  const partidosPorJornada = Math.floor(equiposCount / 2)
  const partidosEstimados = ((equiposCount * (equiposCount - 1)) / 2) * rondasTorneo
  const esEliminatoria = torneo?.reglas?.formato_tipo === 'ELIMINATORIA'
  const faltanEquipos = equiposCount < 3
  const hayJugados = jugadosCount > 0
  const estadoHabilitaFixture = ['INSCRIPCIONES_CERRADAS', 'SORTEADO', 'EN_JUEGO'].includes(torneo?.estado)
  const bloqueoFixture = esEliminatoria
    ? 'El generador automático solo está disponible para formato Todos Contra Todos.'
    : faltanEquipos
      ? 'Se necesitan al menos 3 equipos registrados para generar el fixture.'
      : hayJugados
        ? 'Ya hay partidos con resultado: el fixture no se puede regenerar.'
        : null
  const requiereReemplazo = partidos.length > 0 && !hayJugados
  const motivoBloqueo = bloqueoFixture
    || (estadoHabilitaFixture ? '' : 'Cierra las inscripciones en Torneos para habilitar el sorteo.')
  const puedeGenerarFixture = !isReferee && !bloqueoFixture && estadoHabilitaFixture
  // Espacios de juego (día + hora + sede) para el modo ESPACIOS; horarios por día
  const diasConfig = DIAS_SEMANA
    .filter((d) => fixtureForm.dias.includes(d.valor))
    .map((d) => ({ dia: d.valor, horas: fixtureForm.horasPorDia[d.valor] || [] }))
  const canchas = fixtureForm.locacionIds.length || 1
  const espaciosPorSemana = diasConfig.reduce((acc, c) => acc + c.horas.length, 0) * canchas
  const semanasAuto = partidosEstimados && espaciosPorSemana
    ? Math.max(1, Math.ceil(partidosEstimados / espaciosPorSemana))
    : 1
  const semanas = fixtureForm.semanas === ''
    ? semanasAuto
    : Math.max(1, Number(fixtureForm.semanas) || 1)
  const espaciosTotales = construirEspacios({
    fechaInicio: fixtureForm.fecha_inicio,
    diasConfig,
    locacionIds: fixtureForm.locacionIds,
    semanas,
  })
  const espaciosUsados = espaciosTotales.slice(0, partidosEstimados || 0)
  const sinEspacios = espaciosUsados.length < partidosEstimados
  const modoEspacios = fixtureForm.modo === 'ESPACIOS'
  const ultimoEspacio = espaciosUsados[espaciosUsados.length - 1]
  const inicioPrev = modoEspacios
    ? (espaciosUsados[0] ? combinarFechaHora(espaciosUsados[0].fecha, espaciosUsados[0].hora) : null)
    : combinarFechaHora(fixtureForm.fecha_inicio, fixtureForm.hora_inicio)
  const finPrev = modoEspacios
    ? (ultimoEspacio ? combinarFechaHora(ultimoEspacio.fecha, ultimoEspacio.hora) : null)
    : (inicioPrev
      ? desplazarFecha(
        inicioPrev,
        (jornadasTotales - 1) * Number(fixtureForm.dias_entre_jornadas || 0),
        (partidosPorJornada - 1) * Number(fixtureForm.horas_entre_partidos || 0),
      )
      : null)
  const nombreLocacion = (id) => locaciones.find((l) => l.id === id)?.nombre || 'Sin sede'
  const faltaConfigurarEspacios = modoEspacios
    && (!diasConfig.length || diasConfig.some((c) => !c.horas.length))
  const paginados = visibles.slice(pagina * PAGE_SIZE, pagina * PAGE_SIZE + PAGE_SIZE)

  // Forma reciente: últimos 5 resultados (G/E/P) por equipo, calculados de los partidos jugados
  const formaByName = useMemo(() => {
    const m = {}
    partidos
      .filter((x) => ESTADOS_JUGADOS.includes(x.resultado))
      .sort((a, b) => String(a.fecha_programada || '').localeCompare(String(b.fecha_programada || '')))
      .forEach((x) => {
        const res = x.resultado === 'EMPATE'
          ? ['E', 'E']
          : (['LOCAL_GANO', 'W_LOCAL'].includes(x.resultado) ? ['G', 'P'] : ['P', 'G'])
        ;[[eqName(x.equipo_local_id), res[0]], [eqName(x.equipo_visitante_id), res[1]]].forEach(([n, r]) => {
          if (!m[n]) m[n] = []
          m[n].push(r)
          if (m[n].length > 5) m[n].shift()
        })
      })
    return m
  }, [partidos, eqName])

  // Estadísticas por equipo (PJ, PTS, DF) desde la tabla de posiciones
  const statsByEquipo = useMemo(() => {
    const m = {}
    ;(tablaResp?.posiciones || []).forEach((r) => { m[r.equipo] = r })
    return m
  }, [tablaResp])

  // Probabilidades 1X2 estimadas: fuerza (puntos/juego + mitad de dif. de gol) + ventaja de localía
  const probsDe = (p) => {
    const sL = statsByEquipo[eqName(p.equipo_local_id)]
    const sV = statsByEquipo[eqName(p.equipo_visitante_id)]
    if (!sL || !sV || !sL.PJ || !sV.PJ) return null
    const fuerza = (s) => s.PTS / s.PJ + (s.DF || 0) / (2 * s.PJ)
    const d = fuerza(sL) - fuerza(sV) + 0.3
    const raw = 1 / (1 + Math.pow(10, -d * 0.9))
    const pE = Math.max(0.12, 0.32 - 0.35 * Math.abs(raw - 0.5))
    const l = Math.round(raw * (1 - pE) * 100)
    const e = Math.round(pE * 100)
    return { l, e, v: 100 - l - e }
  }

  const TeamBox = ({ p, lado, gano }) => {
    const nombre = eqName(lado === 'local' ? p.equipo_local_id : p.equipo_visitante_id)
    const pos = posByName[nombre]
    const forma = formaByName[nombre]
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
        <Avatar sx={{
          width: 52, height: 52, borderRadius: '50%', fontSize: 18, fontWeight: 800,
          bgcolor: gano ? 'primary.main' : 'background.default',
          color: gano ? 'primary.contrastText' : 'text.secondary',
          border: '2px solid', borderColor: gano ? 'primary.main' : 'divider',
        }}>
          {initials(nombre)}
        </Avatar>
        <Typography sx={{
          fontWeight: 800, fontSize: 14, lineHeight: 1.15, textAlign: 'center', maxWidth: '100%',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: gano ? 'primary.main' : 'text.primary',
        }}>
          {nombre}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {pos ? `${ordinal(pos)} · ${lado === 'local' ? 'Local' : 'Visitante'}` : (lado === 'local' ? 'Local' : 'Visitante')}
        </Typography>
        {forma?.length ? (
          <Box sx={{ display: 'flex', gap: 0.4 }}>
            {forma.map((r, i) => (
              <Box key={i} title={r === 'G' ? 'Ganó' : r === 'E' ? 'Empató' : 'Perdió'} sx={{
                width: 7, height: 7, borderRadius: '50%',
                bgcolor: r === 'G' ? '#28a745' : r === 'E' ? '#f59e0b' : '#dc3545',
              }} />
            ))}
          </Box>
        ) : null}
      </Box>
    )
  }

  const MatchCard = ({ p }) => {
    const jugado = ESTADOS_JUGADOS.includes(p.resultado)
    const localGano = jugado && ['LOCAL_GANO', 'W_LOCAL'].includes(p.resultado)
    const visitanteGano = jugado && ['VISITANTE_GANO', 'W_VISITANTE'].includes(p.resultado)
    const postergado = p.resultado === 'POSTERGADO'
    const probs = jugado ? null : probsDe(p)
    const hora = p.fecha_programada ? String(p.fecha_programada).slice(11, 16) : null
    const statusColor = jugado ? '#006846' : postergado ? '#92400e' : '#0052cc'
    const statusBg = jugado ? 'rgba(0,104,70,0.08)' : postergado ? 'rgba(180,83,9,0.10)' : '#eaf4ff'

    return (
      <Card elevation={0} sx={{
        position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
        borderRadius: 2, bgcolor: 'background.paper', p: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        '&:hover': { boxShadow: '0 10px 26px -6px rgba(12,86,208,0.16)' },
        transition: 'all 0.2s ease', border: '1px solid', borderColor: 'divider', minWidth: 0,
      }}>

        {/* Header: contexto */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.75, py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <SportsSoccerIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Jornada {p.jornada}</Typography>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {p.fecha_programada ? fmtFechaCorta(p.fecha_programada) : 'Sin fecha'}
          </Typography>
        </Box>

        {/* Banda de estado */}
        <Box sx={{ bgcolor: statusBg, py: 0.7, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75 }}>
          <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor }} />
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: statusColor }}>
            {jugado ? (RESULT_PILL[p.resultado]?.text?.toUpperCase() || 'FINALIZADO') : postergado ? 'POSTERGADO' : 'POR JUGAR'}
          </Typography>
        </Box>

        {/* Cuerpo: equipos enfrentados + marcador/hora */}
        <Box sx={{ px: 2, py: 2, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 1 }}>
          <TeamBox p={p} lado="local" gano={localGano} />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            {jugado ? (
              <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'text.primary', whiteSpace: 'nowrap' }}>
                {p.goles_local} - {p.goles_visitante}
              </Typography>
            ) : (
              <Typography sx={{
                fontWeight: 800, fontSize: 17, lineHeight: 1.2, bgcolor: 'background.default',
                px: 1.2, py: 0.4, borderRadius: 1, color: 'text.primary', whiteSpace: 'nowrap',
              }}>
                {hora || '--:--'}
              </Typography>
            )}
            {jugado ? (
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>FT</Typography>
            ) : (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>VS</Typography>
            )}
          </Box>
          <TeamBox p={p} lado="visitante" gano={visitanteGano} />
        </Box>

        {/* Probabilidades (solo partidos por jugar con historial de ambos equipos) */}
        {probs && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              <Box component="span" sx={{ fontSize: 12, fontWeight: 800, color: '#0052cc' }}>{probs.l}%</Box>
              <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Empate {probs.e}%</Box>
              <Box component="span" sx={{ fontSize: 12, fontWeight: 800, color: '#ff6b00' }}>{probs.v}%</Box>
            </Box>
            <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'background.default' }}>
              <Box sx={{ width: `${probs.l}%`, bgcolor: '#0052cc', transition: 'width 0.4s ease' }} />
              <Box sx={{ width: `${probs.e}%`, bgcolor: '#cbd0d6', transition: 'width 0.4s ease' }} />
              <Box sx={{ width: `${probs.v}%`, bgcolor: '#ff6b00', transition: 'width 0.4s ease' }} />
            </Box>
          </Box>
        )}

        {/* Sede */}
        {p.locacion?.nombre && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, px: 2, pb: 1.5,
            color: 'text.secondary', fontSize: 12, fontWeight: 600, minWidth: 0,
          }}>
            <PlaceIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.locacion.nombre}
              {p.locacion.direccion ? ` · ${p.locacion.direccion}` : ''}
            </Box>
          </Box>
        )}

        {/* Footer: acciones */}
        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, px: 1.5, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Tooltip title="Abrir planilla">
            <IconButton
              size="small" onClick={() => navigate(`/planilla?partido=${p.id}`)}
              sx={{ color: 'primary.main', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <AssignmentIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
          {!isReferee && (
            <Tooltip title="Ver eventos">
              <IconButton
                size="small" onClick={() => setEventosOpen(p)}
                sx={{ color: 'text.secondary', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <SportsSoccerIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          )}
          {!isReferee && ['PENDIENTE', 'POSTERGADO'].includes(p.resultado) && (
            <Tooltip title="Editar partido">
              <IconButton
                size="small" onClick={() => handleAbrirEdicion(p)}
                sx={{ color: 'text.secondary', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <EditIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
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
            {isReferee ? (
              <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'text.secondary' }}>Solo lectura · Anotaciones</Typography>
              </Box>
            ) : (
              <>
                <Tooltip title={motivoBloqueo}>
                  <Box component="span" sx={{ display: 'inline-flex', flex: { xs: '1 1 auto', md: '0 0 auto' } }}>
                    <Button
                      variant="outlined"
                      startIcon={<CalendarViewWeekIcon />}
                      disabled={!puedeGenerarFixture}
                      onClick={abrirFixture}
                      sx={{ textTransform: 'none', fontWeight: 700, height: 44, width: { xs: '100%', md: 'auto' } }}
                    >
                      Generar Fixture
                    </Button>
                  </Box>
                </Tooltip>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, height: 44, flex: { xs: '1 1 auto', md: '0 0 auto' } }}>
                  Nuevo partido
                </Button>
              </>
            )}
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

      {partidos.length === 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2, alignItems: 'center' }}
          action={!isReferee && (
            <Button
              color="inherit"
              size="small"
              startIcon={<CalendarViewWeekIcon />}
              disabled={!puedeGenerarFixture}
              onClick={abrirFixture}
              sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              Generar fixture
            </Button>
          )}
        >
          {puedeGenerarFixture
            ? `Aún no hay fixture. Genera automáticamente ${partidosEstimados} partidos en ${jornadasTotales} jornadas${rondasTorneo === 2 ? ' (ida y vuelta)' : ''}.`
            : `No hay partidos aún. ${motivoBloqueo || 'Crea un partido manualmente o genera el fixture automático.'}`}
        </Alert>
      )}
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

      {/* Editar (solo partidos pendientes/postergados) */}
      <Dialog open={!!editOpen} onClose={() => setEditOpen(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Editar partido</DialogTitle>
          <DialogContent>
            {editOpen && (
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {eqName(editOpen.equipo_local_id)} vs {eqName(editOpen.equipo_visitante_id)} · Jornada {editOpen.jornada}
              </Typography>
            )}
            <TextField select label="Equipo local" fullWidth required margin="normal" value={editForm.equipo_local_id}
              onChange={(e) => {
                const v = e.target.value
                setEditForm({ ...editForm, equipo_local_id: v, equipo_visitante_id: editForm.equipo_visitante_id === v ? '' : editForm.equipo_visitante_id })
              }}>
              {equipos.map((eq) => <MenuItem key={eq.id} value={eq.id}>{eq.nombre}</MenuItem>)}
            </TextField>
            <TextField select label="Equipo visitante" fullWidth required margin="normal" value={editForm.equipo_visitante_id}
              onChange={(e) => {
                const v = e.target.value
                setEditForm({ ...editForm, equipo_visitante_id: v, equipo_local_id: editForm.equipo_local_id === v ? '' : editForm.equipo_local_id })
              }}>
              {equipos.map((eq) => <MenuItem key={eq.id} value={eq.id}>{eq.nombre}</MenuItem>)}
            </TextField>
            <TextField label="Jornada" type="number" fullWidth margin="normal" value={editForm.jornada}
              onChange={(e) => setEditForm({ ...editForm, jornada: Number(e.target.value) })} />
            <TextField label="Fecha y hora" type="datetime-local" fullWidth margin="normal"
              value={editForm.fecha_programada}
              onChange={(e) => setEditForm({ ...editForm, fecha_programada: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start"><ScheduleIcon fontSize="small" /></InputAdornment> }} />
            <TextField select label="Locación (sede)" fullWidth margin="normal" value={editForm.locacion_id}
              onChange={(e) => setEditForm({ ...editForm, locacion_id: e.target.value })}>
              <MenuItem value="">Sin sede asignada</MenuItem>
              {locacionesActivas.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.nombre}{l.direccion ? ` · ${l.direccion}` : ''}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={editMut.isPending}>
              {editMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Fixture automático */}
      <Dialog open={fixtureOpen} onClose={() => setFixtureOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleGenerarFixture}>
          <DialogTitle sx={{ fontWeight: 800 }}>Generar fixture automático</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              <Pill bg="rgba(12,86,208,0.1)" color="#003d9b">{torneo?.nombre || 'Torneo activo'}</Pill>
              <Pill bg="background.default" color="text.secondary">{esEliminatoria ? 'Eliminación Directa' : 'Todos Contra Todos'}</Pill>
              <Pill bg="background.default" color="text.secondary">{rondasTorneo === 2 ? 'Ida y vuelta' : 'Una ronda'}</Pill>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <b>{equiposCount} equipos</b> → <b>{partidosEstimados} partidos</b> en <b>{jornadasTotales} jornadas</b>
              {equiposCount % 2 === 1 ? ' · cada jornada descansa un equipo' : ''}
            </Alert>

            {bloqueoFixture && <Alert severity="warning" sx={{ mb: 2 }}>{bloqueoFixture}</Alert>}

            {requiereReemplazo && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Ya existen {partidos.length} partidos programados. Marca la casilla de reemplazo al final para
                regenerarlos: se eliminarán los partidos pendientes (no hay resultados registrados).
              </Alert>
            )}

            <ToggleButtonGroup
              value={fixtureForm.modo}
              exclusive
              size="small"
              fullWidth
              onChange={(e, v) => { if (v) setFixtureForm({ ...fixtureForm, modo: v }) }}
            >
              <ToggleButton value="ESPACIOS" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5 }}>Espacios de juego</ToggleButton>
              <ToggleButton value="SIMPLE" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5 }}>Fechas simples</ToggleButton>
              <ToggleButton value="SIN_FECHAS" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5 }}>Sin programar</ToggleButton>
            </ToggleButtonGroup>

            {modoEspacios && (
              <Box sx={{ mt: 2, bgcolor: 'background.default', borderRadius: 1.5, p: 2, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    label="Primer día de juego" type="date" size="small" fullWidth required
                    InputLabelProps={{ shrink: true }} value={fixtureForm.fecha_inicio}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, fecha_inicio: e.target.value })}
                  />
                  <TextField
                    label="Semanas a programar" type="number" size="small" fullWidth
                    inputProps={{ min: 1, max: 52 }} value={fixtureForm.semanas}
                    placeholder={String(semanasAuto)} helperText={`Automático: ${semanasAuto}`}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, semanas: e.target.value })}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: 'text.secondary' }}>Días de juego</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                    {DIAS_SEMANA.map((d) => {
                      const sel = fixtureForm.dias.includes(d.valor)
                      return (
                        <Button
                          key={d.valor}
                          size="small"
                          onClick={() => setFixtureForm((f) => {
                            const dias = sel
                              ? f.dias.filter((x) => x !== d.valor)
                              : [...f.dias, d.valor]
                            const horasPorDia = { ...f.horasPorDia }
                            if (sel) delete horasPorDia[d.valor]
                            else if (!horasPorDia[d.valor]) horasPorDia[d.valor] = ['08:00']
                            return { ...f, dias, horasPorDia }
                          })}
                          sx={{
                            minWidth: 46, minHeight: 30, px: 1.25, borderRadius: 99, textTransform: 'none',
                            fontWeight: 700, fontSize: 12.5,
                            bgcolor: sel ? 'primary.main' : 'background.paper',
                            color: sel ? 'primary.contrastText' : 'text.primary',
                            border: '1px solid', borderColor: sel ? 'primary.main' : 'divider',
                            '&:hover': { bgcolor: sel ? 'primary.dark' : 'action.hover' },
                          }}
                        >
                          {d.label}
                        </Button>
                      )
                    })}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: 'text.secondary' }}>Horarios por día</Typography>
                  {DIAS_SEMANA.filter((d) => fixtureForm.dias.includes(d.valor)).map((d) => {
                    const horasDia = [...(fixtureForm.horasPorDia[d.valor] || [])].sort()
                    const horaNuevaDia = fixtureForm.horaNuevaPorDia[d.valor] || '08:00'
                    const setHorasDia = (horas) => setFixtureForm({
                      ...fixtureForm,
                      horasPorDia: { ...fixtureForm.horasPorDia, [d.valor]: horas },
                    })
                    return (
                      <Box key={d.valor} sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mt: 0.75 }}>
                        <Chip
                          label={d.label} size="small"
                          sx={{ fontWeight: 800, minWidth: 46, bgcolor: 'primary.main', color: 'primary.contrastText' }}
                        />
                        {horasDia.map((h) => (
                          <Chip
                            key={h} label={h} size="small" sx={{ fontWeight: 700, bgcolor: 'background.paper' }}
                            onDelete={() => setHorasDia(horasDia.filter((x) => x !== h))}
                          />
                        ))}
                        <TextField
                          type="time" size="small" value={horaNuevaDia} sx={{ width: 118 }}
                          onChange={(e) => setFixtureForm({
                            ...fixtureForm,
                            horaNuevaPorDia: { ...fixtureForm.horaNuevaPorDia, [d.valor]: e.target.value },
                          })}
                        />
                        <Button
                          size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            if (!horaNuevaDia || horasDia.includes(horaNuevaDia)) return
                            setHorasDia([...horasDia, horaNuevaDia])
                          }}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          Agregar
                        </Button>
                      </Box>
                    )
                  })}
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: 'text.secondary' }}>Locaciones (juegos en paralelo)</Typography>
                  {locacionesActivas.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 0.75 }}>
                      No hay locaciones configuradas: los partidos quedarán sin sede. Créalas en <b>Configuración → Locaciones</b>.
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                      {locacionesActivas.map((l) => {
                        const sel = fixtureForm.locacionIds.includes(l.id)
                        return (
                          <Button
                            key={l.id}
                            size="small"
                            startIcon={<PlaceIcon sx={{ fontSize: 15 }} />}
                            onClick={() => setFixtureForm({
                              ...fixtureForm,
                              locacionIds: sel
                                ? fixtureForm.locacionIds.filter((x) => x !== l.id)
                                : [...fixtureForm.locacionIds, l.id],
                            })}
                            sx={{
                              minHeight: 32, px: 1.25, borderRadius: 99, textTransform: 'none',
                              fontWeight: 700, fontSize: 12.5,
                              bgcolor: sel ? 'rgba(12,86,208,0.12)' : 'background.paper',
                              color: sel ? '#003d9b' : 'text.primary',
                              border: '1px solid', borderColor: sel ? 'primary.main' : 'divider',
                              '&:hover': { bgcolor: sel ? 'rgba(12,86,208,0.2)' : 'action.hover' },
                            }}
                          >
                            {l.nombre}
                          </Button>
                        )
                      })}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {faltaConfigurarEspacios && (
              <Alert severity="warning" sx={{ mt: 1 }}>Elige al menos un día de juego y un horario de inicio.</Alert>
            )}

            {fixtureForm.modo === 'SIMPLE' && (
              <Box sx={{
                mt: 2, bgcolor: 'background.default', borderRadius: 1.5, p: 2,
                display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5,
              }}>
                <TextField
                  label="Fecha de inicio" type="date" size="small" fullWidth required
                  InputLabelProps={{ shrink: true }} value={fixtureForm.fecha_inicio}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, fecha_inicio: e.target.value })}
                />
                <TextField
                  label="Hora de inicio" type="time" size="small" fullWidth required
                  InputLabelProps={{ shrink: true }} value={fixtureForm.hora_inicio}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, hora_inicio: e.target.value })}
                />
                <TextField
                  label="Días entre jornadas" type="number" size="small" fullWidth
                  inputProps={{ min: 0, max: 60 }} value={fixtureForm.dias_entre_jornadas}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, dias_entre_jornadas: e.target.value })}
                />
                <TextField
                  label="Horas entre partidos" type="number" size="small" fullWidth
                  inputProps={{ min: 0, max: 12 }} value={fixtureForm.horas_entre_partidos}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, horas_entre_partidos: e.target.value })}
                />
                {inicioPrev && finPrev && (
                  <Box sx={{
                    gridColumn: { sm: '1 / -1' }, display: 'flex', alignItems: 'center', gap: 0.75,
                    color: '#006846', fontWeight: 700, fontSize: 13,
                  }}>
                    <CalendarTodayIcon sx={{ fontSize: 16 }} />
                    Del {fmtFechaHora(inicioPrev)} al {fmtFechaHora(finPrev)}
                  </Box>
                )}
              </Box>
            )}

            {fixtureForm.modo === 'SIN_FECHAS' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Los partidos se crearán sin fecha ni sede; podrás programar cada uno con la acción «Horario».
              </Typography>
            )}

            {modoEspacios && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={sinEspacios ? 'error' : 'info'} sx={{ mb: inicioPrev ? 1 : 0 }}>
                  <b>{espaciosPorSemana}</b> espacios por semana · se usarán <b>{espaciosUsados.length}</b> de{' '}
                  {espaciosTotales.length} para <b>{partidosEstimados} partidos</b>
                  {fixtureForm.locacionIds.length === 0
                    ? ' · sin sede asignada'
                    : ` · ${fixtureForm.locacionIds.length} locación(es)`}
                </Alert>
                {inicioPrev && finPrev && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#006846', fontWeight: 700, fontSize: 13, mb: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16 }} />
                    Del {fmtFechaHora(inicioPrev)} al {fmtFechaHora(finPrev)}
                  </Box>
                )}
                {espaciosUsados.length > 0 && (
                  <Box sx={{ maxHeight: 140, overflowY: 'auto', borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                    {espaciosUsados.slice(0, 8).map((esp, i) => (
                      <Box
                        key={`${esp.fecha}-${esp.hora}-${esp.locacion_id}-${i}`}
                        sx={{ display: 'flex', gap: 1, px: 1.25, py: 0.6, fontSize: 12.5, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Box sx={{ fontWeight: 700, minWidth: 92 }}>{fmtDiaLocal(esp.fecha)}</Box>
                        <Box>{esp.hora}</Box>
                        <Box sx={{ color: 'text.secondary', ml: 'auto' }}>{nombreLocacion(esp.locacion_id)}</Box>
                      </Box>
                    ))}
                    {espaciosUsados.length > 8 && (
                      <Box sx={{ px: 1.25, py: 0.6, fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                        … y {espaciosUsados.length - 8} espacios más
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {requiereReemplazo && (
              <FormControlLabel
                sx={{ mt: 1 }}
                control={(
                  <Checkbox
                    checked={fixtureForm.reemplazar}
                    onChange={(e) => setFixtureForm({ ...fixtureForm, reemplazar: e.target.checked })}
                  />
                )}
                label={<Typography sx={{ fontSize: 14 }}>Reemplazar los {partidos.length} partidos programados existentes</Typography>}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFixtureOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<CalendarViewWeekIcon />}
              disabled={!!bloqueoFixture || fixtureMut.isPending || faltaConfigurarEspacios
                || (modoEspacios && sinEspacios) || (requiereReemplazo && !fixtureForm.reemplazar)}
            >
              {fixtureMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Generar fixture'}
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