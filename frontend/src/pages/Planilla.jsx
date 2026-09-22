import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { apiGet, apiPost, apiDelete } from '../api'
import { useToast } from '../components/Toast'
import { usePartidoStream } from '../lib/sse'
import {
  Check as CheckIcon, AccessTime as AccessTimeIcon,
  SportsSoccer as GolIcon, Square as YellowCardIcon,
  Block as RedCardIcon, Flag as AutogolIcon, Delete as DeleteIcon,
  SwapHoriz as SwapIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Replay as ReplayIcon,
  Undo as UndoIcon, PersonAdd as PersonAddIcon, PictureAsPdf as PdfIcon,
  Verified as VerifiedIcon, HistoryToggleOff as HistoryToggleOffIcon,
  PublishedWithChanges as PublishedWithChangesIcon, VerifiedUser as VerifiedUserIcon,
  Stadium as StadiumIcon, EmojiPeople as EmojiPeopleIcon, Tune as TuneIcon,
} from '@mui/icons-material'

const RESULTADOS = {
  PENDIENTE: ['Pendiente', 'default'],
  POSTERGADO: ['Postergado', 'warning'],
  LOCAL_GANO: ['Local ganó', 'success'],
  VISITANTE_GANO: ['Visitante ganó', 'success'],
  EMPATE: ['Empate', 'info'],
  W_LOCAL: ['W local', 'secondary'],
  W_VISITANTE: ['W visitante', 'secondary'],
}

const TIPO_ACCION = {
  GOL: { label: 'Gol', icon: <GolIcon />, color: 'primary' },
  AUTOGOL: { label: 'Autogol', icon: <AutogolIcon />, color: 'secondary' },
  TARJETA_AMARILLA: { label: 'Amarilla', icon: <YellowCardIcon />, color: 'warning' },
  TARJETA_ROJA: { label: 'Roja', icon: <RedCardIcon />, color: 'error' },
  CAMBIO: { label: 'Cambio', icon: <SwapIcon />, color: 'info' },
}

const TIPO_LABEL = {
  GOL: 'Gol', AUTOGOL: 'Autogol',
  TARJETA_AMARILLA: 'Tarjeta amarilla', TARJETA_ROJA: 'Tarjeta roja',
  CAMBIO: 'Cambio',
}

const COLORES_ACCION = {
  GOL: { base: { bg: '#dcfce7', color: '#166534', border: '#4ade80' }, sel: { bg: '#22c55e', color: '#ffffff', border: '#15803d' } },
  AUTOGOL: { base: { bg: '#ede9fe', color: '#5b21b6', border: '#a78bfa' }, sel: { bg: '#8b5cf6', color: '#ffffff', border: '#6d28d9' } },
  TARJETA_AMARILLA: { base: { bg: '#fef9c3', color: '#854d0e', border: '#facc15' }, sel: { bg: '#eab308', color: '#ffffff', border: '#a16207' } },
  TARJETA_ROJA: { base: { bg: '#fee2e2', color: '#991b1b', border: '#f87171' }, sel: { bg: '#ef4444', color: '#ffffff', border: '#b91c1c' } },
}

const PALETA_CAMBIO = {
  sale: { base: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }, sel: { bg: '#ef4444', color: '#ffffff', border: '#b91c1c' } },
  entra: { base: { bg: '#dcfce7', color: '#15803d', border: '#86efac' }, sel: { bg: '#22c55e', color: '#ffffff', border: '#15803d' } },
}

const ESTILO_EVENTO = {
  GOL: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', icon: <GolIcon sx={{ fontSize: 16 }} /> },
  AUTOGOL: { bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed', icon: <AutogolIcon sx={{ fontSize: 16 }} /> },
  TARJETA_AMARILLA: { bg: '#fefce8', border: '#fef08a', color: '#ca8a04', icon: <YellowCardIcon sx={{ fontSize: 16 }} /> },
  TARJETA_ROJA: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: <RedCardIcon sx={{ fontSize: 16 }} /> },
  CAMBIO: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', icon: <SwapIcon sx={{ fontSize: 16 }} /> },
}

const MAX_TITULARES = 11

// Reparto por defecto cuando el equipo no tiene posiciones cargadas (todo OTROS):
// 4-3-3 para que la vista de formación sea homogénea.
const FORMACION_DEFECTO = ['POR', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL']

const accIconBtnSx = {
  width: 38, height: 38,
  border: '1px solid rgba(255,255,255,0.15)',
  bgcolor: 'rgba(255,255,255,0.06)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
}

const JugadorBtn = ({ num, nombre, base, sel, seleccionado = false, onClick }) => {
  const colores = seleccionado ? sel : base
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={`${num} · ${nombre}`}
      sx={{
        width: 60, height: 60, borderRadius: '50%', mx: 'auto', padding: '4px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 16, cursor: 'pointer',
        border: `2px solid ${colores.border}`, bgcolor: colores.bg, color: colores.color,
        transition: 'all .15s',
        '&:hover': { transform: 'scale(1.08)', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' },
      }}
    >
      <span style={{ lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 8, fontWeight: 700, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }}>
        {nombre}
      </span>
    </Box>
  )
}

const POSICION_LABEL = {
  ARQUERO: 'Arquero',
  DEFENSOR: 'Defensor',
  MEDIOCAMPISTA: 'Centrocampista',
  DELANTERO: 'Delantero',
}
const POSICION_FILA = { ARQUERO: 0, DEFENSOR: 1, MEDIOCAMPISTA: 2, DELANTERO: 3 }

const fmtTiempo = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const fmtFecha = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
}

export default function Planilla({ selectedTorneoId }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [selId, setSelId] = useState('')
  const [marcador, setMarcador] = useState({ local: 0, visitante: 0 })
  const [accion, setAccion] = useState(null)
  const [accForm, setAccForm] = useState({ equipo_id: '', jugador_id: '', jugador_sale_id: '', minuto: 45 })
  const [crono, setCrono] = useState({ seg: 0, running: false })
  const [iniciado, setIniciado] = useState(false)
  const [formEquipo, setFormEquipo] = useState({})
  const [vistaEquipo, setVistaEquipo] = useState({})
  const [ordenLocal, setOrdenLocal] = useState({})
  const [hoverKey, setHoverKey] = useState('')
  const [finalizarOpen, setFinalizarOpen] = useState(false)
  const [adicion, setAdicion] = useState(0)
  const [actaOpen, setActaOpen] = useState(false)
  const [actaForm, setActaForm] = useState({ arbitro_nombre: '', arbitro_asistente1: '', arbitro_asistente2: '', observaciones: '' })
  const navigate = useNavigate()
  const dragJugador = useRef({ eqId: null, jugadorId: null, rol: '' })
  const lastLiveRef = useRef(null)
  const liveReadyRef = useRef(false)

  // SSE real-time para cronómetro + eventos (reemplaza polling)
  usePartidoStream(selId, !!selId)

  const { data: partidos = [], isLoading: loadingPartidos } = useQuery({
    queryKey: ['partidos', selectedTorneoId],
    queryFn: () => apiGet(`/partidos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos', selectedTorneoId],
    queryFn: () => apiGet(`/equipos?torneo_id=${selectedTorneoId}`),
    enabled: !!selectedTorneoId,
  })

  const { data: partido } = useQuery({
    queryKey: ['partido', selId],
    queryFn: () => apiGet(`/partidos/${selId}`),
    enabled: !!selId,
  })

  const { data: eventos, isLoading: loadingEventos } = useQuery({
    queryKey: ['eventos', selId],
    queryFn: () => apiGet(`/eventos?partido_id=${selId}`),
    enabled: !!selId,
  })

  const { data: alineacion = [], isLoading: loadingAlineacion } = useQuery({
    queryKey: ['alineacion', selId],
    queryFn: () => apiGet(`/partidos/${selId}/alineacion`),
    enabled: !!selId,
  })

  const jugadoresLocalQ = useQuery({
    queryKey: ['jugadores', partido?.equipo_local_id],
    queryFn: () => apiGet(`/jugadores?equipo_id=${partido.equipo_local_id}`),
    enabled: !!selId && !!partido?.equipo_local_id,
  })
  const jugadoresVisitQ = useQuery({
    queryKey: ['jugadores', partido?.equipo_visitante_id],
    queryFn: () => apiGet(`/jugadores?equipo_id=${partido.equipo_visitante_id}`),
    enabled: !!selId && !!partido?.equipo_visitante_id,
  })

  useEffect(() => {
    if (!selId && partidos.length) {
      const param = searchParams.get('partido')
      const destino = param
        ? partidos.find((p) => String(p.id) === param)
        : partidos.find((p) => p.resultado === 'PENDIENTE')
      setSelId(String((destino || partidos[0]).id))
    }
  }, [partidos, selId, searchParams])

  // Marcador derivado de los eventos (fuente de verdad mientras el partido está pendiente).
  // Evita que un latido SSE rezagado haga "desaparecer" un gol recién registrado.
  const marcadorEventos = useMemo(() => {
    const localId = partido?.equipo_local_id
    const lista = Array.isArray(eventos) ? eventos : []
    return {
      local: lista.filter((e) => (e.tipo === 'GOL' && e.equipo_id === localId) || (e.tipo === 'AUTOGOL' && e.equipo_id !== localId)).length,
      visitante: lista.filter((e) => (e.tipo === 'GOL' && e.equipo_id !== localId) || (e.tipo === 'AUTOGOL' && e.equipo_id === localId)).length,
    }
  }, [eventos, partido?.equipo_local_id])

  const marcadorMostrado = partido?.resultado === 'PENDIENTE' ? marcadorEventos : marcador

  const marcadorMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/marcador`, body),
    onSuccess: (data) => {
      setMarcador({ local: data.goles_local, visitante: data.goles_visitante })
      qc.setQueryData(['partido', selId], (old) => (old
        ? { ...old, goles_local: data.goles_local, goles_visitante: data.goles_visitante }
        : old))
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const liveMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/en_vivo`, body),
    onError: () => {},
  })

  useEffect(() => {
    if (partido) setMarcador({ local: partido.goles_local, visitante: partido.goles_visitante })
  }, [partido])

  useEffect(() => {
    if (!partido || partido.resultado !== 'PENDIENTE' || !Array.isArray(eventos)) return
    if (marcadorEventos.local === (partido.goles_local ?? 0)
      && marcadorEventos.visitante === (partido.goles_visitante ?? 0)) return
    marcadorMut.mutate({ id: partido.id, body: { goles_local: marcadorEventos.local, goles_visitante: marcadorEventos.visitante } })
  }, [marcadorEventos, eventos, partido, marcadorMut])

  useEffect(() => {
    if (!crono.running) return
    const id = setInterval(() => {
      setCrono((c) => {
        if (c.seg >= 5400) { clearInterval(id); return { seg: 5400, running: false } }
        return { ...c, seg: c.seg + 1 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [crono.running])

  useEffect(() => {
    if (!selId) return
    let active = true
    liveReadyRef.current = false
    apiGet(`/partidos/${selId}/en_vivo`)
      .then((d) => {
        if (!active) return
        lastLiveRef.current = { seg: d.seg || 0, running: !!d.running, iniciado: !!d.iniciado }
        setCrono((c) => ({ ...c, seg: d.seg || 0, running: !!d.running }))
        setIniciado(!!d.iniciado)
        liveReadyRef.current = true
      })
      .catch(() => {
        if (active) {
          lastLiveRef.current = { seg: 0, running: false, iniciado: false }
          liveReadyRef.current = true
        }
      })
    return () => { active = false }
  }, [selId])

  useEffect(() => {
    if (!liveReadyRef.current) return
    if (!selId || !partido || partido.resultado !== 'PENDIENTE') return
    const cur = { seg: crono.seg, running: crono.running, iniciado }
    const prev = lastLiveRef.current
    const onlySeg = prev && prev.seg !== cur.seg && prev.running === cur.running && prev.iniciado === cur.iniciado
    if (onlySeg && cur.seg % 10 !== 0) return
    if (prev && prev.seg === cur.seg && prev.running === cur.running && prev.iniciado === cur.iniciado) return
    lastLiveRef.current = cur
    liveMut.mutate({ id: Number(selId), body: cur })
  }, [crono.seg, crono.running, iniciado, selId, partido?.resultado, liveMut, partido])

  const eventoMut = useMutation({
    mutationFn: (body) => apiPost('/eventos', body),
    onSuccess: () => { qc.invalidateQueries(['eventos', selId]); toast.show('Acción registrada', 'success'); setAccion(null) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const borrarEventoMut = useMutation({
    mutationFn: (id) => apiDelete(`/eventos/${id}`),
    onSuccess: () => { qc.invalidateQueries(['eventos', selId]); toast.show('Acción eliminada', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const actaMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/acta`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId])
      toast.show('Datos del acta guardados', 'success')
      setActaOpen(false)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const abrirActa = () => {
    setActaForm({
      arbitro_nombre: partido?.arbitro_nombre || '',
      arbitro_asistente1: partido?.arbitro_asistente1 || '',
      arbitro_asistente2: partido?.arbitro_asistente2 || '',
      observaciones: partido?.observaciones || '',
    })
    setActaOpen(true)
  }

  const finalizarMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/resultado`, body),
    onSuccess: () => {
      qc.invalidateQueries(['partidos', selectedTorneoId]); qc.invalidateQueries(['tabla', selectedTorneoId]); qc.invalidateQueries(['resumen']); qc.invalidateQueries(['eventos', selId])
      setCrono({ seg: 0, running: false })
      setIniciado(false)
      lastLiveRef.current = { seg: 0, running: false, iniciado: false }
      liveMut.mutate({ id: Number(selId), body: { seg: 0, running: false, iniciado: false } })
      toast.show('Resultado guardado', 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const abrirFinalizar = () => setFinalizarOpen(true)

  const alinearMut = useMutation({
    mutationFn: ({ jugadorId, titular, numeroCamiseta }) => {
      const body = { jugador_id: jugadorId, titular }
      if (numeroCamiseta !== undefined) body.numero_camiseta = numeroCamiseta
      return apiPost(`/partidos/${selId}/alineacion`, body)
    },
    onSuccess: () => { qc.invalidateQueries(['alineacion', selId]) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const desalinearMut = useMutation({
    mutationFn: (jugadorId) => apiDelete(`/partidos/${selId}/alineacion/${jugadorId}`),
    onSuccess: () => { qc.invalidateQueries(['alineacion', selId]) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const ordenMut = useMutation({
    mutationFn: ({ equipoId, items }) => apiPost(`/partidos/${selId}/alineacion/orden`, { equipo_id: equipoId, items }),
    onSuccess: () => { qc.invalidateQueries(['alineacion', selId]) },
    onError: (e) => {
      setOrdenLocal({})
      toast.show(e.message, 'error')
    },
  })

  const eqName = (id) => equipos.find((x) => String(x.id) === String(id))?.nombre || `Equipo #${id}`
  const tecnicoDe = (id) => equipos.find((x) => String(x.id) === String(id))?.tecnico_nombre || null
  const [label, color] = partido ? (RESULTADOS[partido.resultado] || [partido.resultado, 'default']) : ['', 'default']
  const editable = partido?.resultado === 'PENDIENTE'
  const plantelLocal = jugadoresLocalQ.data || []
  const plantelVisit = jugadoresVisitQ.data || []

  const alineacionMap = {}
  alineacion.forEach((a) => { alineacionMap[a.jugador_id] = a })

  const numCamiseta = (j, al) => (al ? (al.numero_camiseta ?? j.numero_camiseta) : j.numero_camiseta)

  const plantelDe = (equipoId) => (Number(equipoId) === partido?.equipo_local_id ? plantelLocal : plantelVisit)
  const nombreDe = (id, equipoId) => plantelDe(equipoId).find((j) => j.id === id)?.nombre || `#${id}`
  const convocadosDe = (equipoId) => plantelDe(equipoId)
    .filter((j) => alineacionMap[j.id])
    .sort((a, b) => {
      if (alineacionMap[a.id].titular !== alineacionMap[b.id].titular) return alineacionMap[a.id].titular ? -1 : 1
      return a.nombre.localeCompare(b.nombre)
    })

  const amarillasDe = (jugadorId) => (eventos || [])
    .filter((e) => e.jugador_id === jugadorId && e.tipo === 'TARJETA_AMARILLA').length
  // Roja directa o doble amarilla (expulsión)
  const rojaDe = (jugadorId) => (eventos || [])
    .some((e) => e.jugador_id === jugadorId && e.tipo === 'TARJETA_ROJA') || amarillasDe(jugadorId) >= 2

  const titularesDe = (equipoId) => convocadosDe(equipoId).filter((j) => alineacionMap[j.id]?.titular).length
  const faltantesInicio = partido
    ? [partido.equipo_local_id, partido.equipo_visitante_id]
      .map((eqId) => ({ eqId, faltan: MAX_TITULARES - titularesDe(eqId) }))
      .filter((x) => x.faltan > 0)
    : []
  const planillaCompleta = faltantesInicio.length === 0

  const expulsados = useMemo(() => {
    const contAmarillas = {}
    const set = new Set()
    ;(eventos || []).forEach((e) => {
      if (!e.jugador_id) return
      if (e.tipo === 'TARJETA_ROJA') set.add(e.jugador_id)
      if (e.tipo === 'TARJETA_AMARILLA') contAmarillas[e.jugador_id] = (contAmarillas[e.jugador_id] || 0) + 1
    })
    Object.entries(contAmarillas).forEach(([id, n]) => { if (n >= 2) set.add(Number(id)) })
    return set
  }, [eventos])

  const cambiosPorEquipo = useMemo(() => {
    const m = {}
    ;(eventos || []).forEach((e) => { if (e.tipo === 'CAMBIO') m[e.equipo_id] = (m[e.equipo_id] || 0) + 1 })
    return m
  }, [eventos])

  const lineaEventos = useMemo(() => {
    if (!partido) return []
    const localId = partido.equipo_local_id
    return [...(eventos || [])]
      .sort((a, b) => a.minuto - b.minuto || (a.id || 0) - (b.id || 0))
      .reduce((acc, ev) => {
        const prev = acc[acc.length - 1]?.score || { l: 0, v: 0 }
        const s = { ...prev }
        const golLocal = (ev.tipo === 'GOL' && ev.equipo_id === localId) || (ev.tipo === 'AUTOGOL' && ev.equipo_id !== localId)
        if (golLocal) s.l++
        else if (ev.tipo === 'GOL' || ev.tipo === 'AUTOGOL') s.v++
        acc.push({ ev, score: s })
        return acc
      }, [])
  }, [eventos, partido])

  // Jugadores EN CANCHA: titulares de la alineación, aplicando los cambios registrados
  // (CAMBIO: sale jugador_sale_id, entra jugador_id) y excluyendo expulsados.
  const enCanchaDe = (equipoId) => {
    const conv = convocadosDe(equipoId)
    const enCancha = new Set(conv.filter((j) => alineacionMap[j.id].titular).map((j) => j.id))
    ;(eventos || [])
      .filter((e) => e.tipo === 'CAMBIO' && Number(e.equipo_id) === Number(equipoId))
      .forEach((e) => {
        if (e.jugador_sale_id) enCancha.delete(e.jugador_sale_id)
        if (e.jugador_id) enCancha.add(e.jugador_id)
      })
    return conv.filter((j) => enCancha.has(j.id) && !expulsados.has(j.id))
  }
  const alBancoDe = (equipoId) => {
    const plantel = plantelDe(equipoId)
    const enCanchaIds = new Set(enCanchaDe(equipoId).map((j) => j.id))
    const numerosEnCancha = new Set(
      enCanchaDe(equipoId).map((j) => numCamiseta(j, alineacionMap[j.id]))
    )
    return plantel
      .filter((j) => j.activo && !enCanchaIds.has(j.id) && !expulsados.has(j.id))
      .filter((j) => (numCamiseta(j, alineacionMap[j.id]) == null || !numerosEnCancha.has(numCamiseta(j, alineacionMap[j.id]))))
  }

  const half = crono.seg <= 2700 ? 1 : 2
  const minutoCrono = () => (half === 1
    ? Math.max(1, Math.ceil(crono.seg / 60))
    : 45 + Math.max(1, Math.ceil((crono.seg - 2700) / 60)))

  const abrirAccion = (tipo, equipoId) => {
    if (!iniciado) {
      toast.show('El partido aún no ha iniciado. Pulsa Iniciar para registrar acciones.', 'info')
      return
    }
    setAccForm({ equipo_id: String(equipoId), jugador_id: '', jugador_sale_id: '', minuto: minutoCrono() })
    setAccion(tipo)
  }

  const toggleCrono = () => {
    if (!crono.running) {
      if (!planillaCompleta) {
        const detalle = faltantesInicio
          .map(({ eqId, faltan }) => `${eqName(eqId)} (faltan ${faltan})`)
          .join(' · ')
        toast.show(`No se puede iniciar: la planilla está incompleta. Cada equipo debe tener ${MAX_TITULARES} titulares. ${detalle}`, 'error')
        return
      }
      setIniciado(true)
    }
    setCrono((c) => ({ ...c, running: !c.running }))
  }

  const resetCrono = () => {
    setIniciado(false)
    setCrono({ seg: 0, running: false })
  }

  const registrarRapido = (jugadorId) => {
    if (!accion || accion === 'CAMBIO') return
    eventoMut.mutate({
      partido_id: Number(selId),
      tipo: accion,
      equipo_id: Number(accForm.equipo_id),
      minuto: Number(accForm.minuto) || 0,
      jugador_id: jugadorId ? Number(jugadorId) : null,
    })
  }

  const registrarTecnico = (equipoId, tipo) => {
    if (!iniciado) {
      toast.show('El partido aún no ha iniciado. Pulsa Iniciar para registrar acciones.', 'info')
      return
    }
    if (!window.confirm(`¿Tarjeta ${tipo === 'TARJETA_AMARILLA' ? 'AMARILLA' : 'ROJA'} al DT de ${eqName(equipoId)}?`)) return
    eventoMut.mutate({
      partido_id: Number(selId),
      tipo,
      equipo_id: Number(equipoId),
      minuto: minutoCrono(),
      tipo_sancionado: 'TECNICO',
      nombre_sancionado: tecnicoDe(equipoId) === 'DT' ? null : tecnicoDe(equipoId),
    })
  }

  const confirmarCambio = () => {
    const sale = Number(accForm.jugador_sale_id)
    const entra = Number(accForm.jugador_id)
    if (!sale || !entra) {
      toast.show('Selecciona el jugador que sale y el que entra', 'error')
      return
    }
    if (sale === entra) {
      toast.show('El jugador que sale y el que entra deben ser distintos', 'error')
      return
    }
    eventoMut.mutate({
      partido_id: Number(selId),
      tipo: 'CAMBIO',
      equipo_id: Number(accForm.equipo_id),
      minuto: Number(accForm.minuto) || 0,
      jugador_id: entra,
      jugador_sale_id: sale,
    })
  }

  const anularGol = (equipoId) => {
    const goles = (eventos || [])
      .filter((e) => {
        if (e.tipo === 'GOL') return e.equipo_id === equipoId
        if (e.tipo === 'AUTOGOL') return e.equipo_id !== equipoId
        return false
      })
      .sort((a, b) => (b.minuto - a.minuto) || ((b.id || 0) - (a.id || 0)))
    const ultimo = goles[0]
    if (!ultimo) {
      toast.show('No hay goles registrados para este equipo', 'info')
      return
    }
    const jugador = ultimo.jugador_id ? nombreDe(ultimo.jugador_id, ultimo.equipo_id) : 'sin jugador'
    const esGol = ultimo.tipo === 'GOL'
    if (window.confirm(`¿Anular el ${esGol ? 'gol' : 'autogol'} de ${jugador} al minuto ${ultimo.minuto}'?`)) {
      borrarEventoMut.mutate(ultimo.id)
    }
  }

  const anularGolModal = () => {
    const equipoId = Number(accForm.equipo_id) || partido?.equipo_local_id
    setAccion(null)
    anularGol(equipoId)
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para planillar partidos.</Alert>
  if (loadingPartidos) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>

  return (
    <Box>
      <Card elevation={0} sx={{ mb: 2, p: { xs: 2, sm: 2.5 }, borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 2, alignItems: { xl: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.3, borderRadius: 1, bgcolor: 'rgba(0,104,70,0.1)', color: '#006846', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#006846', animation: 'torneoPulse 1.6s ease-in-out infinite' }} />
                Transmisión oficial
              </Box>
              {partido && (
                <Box component="span" sx={{ fontFamily: 'JetBrains Mono, Menlo, monospace', fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
                  ACTA REF-{new Date().getFullYear()}-{String(partido.id).padStart(4, '0')}
                </Box>
              )}
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Planilla de Juego</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, maxWidth: 620 }}>
              Control reglamentario en tiempo real · Convocatorias, alineaciones, goles, tarjetas y cambios IFAB.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: { sm: 'center' }, gap: 1, flexWrap: 'wrap', width: { xs: '100%', xl: 'auto' } }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto', xl: '0 1 auto' } }}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <StadiumIcon sx={{ fontSize: 13, color: 'primary.main' }} /> Partido activo
              </Typography>
              <FormControl size="small" fullWidth>
                <Select value={selId} onChange={(e) => setSelId(e.target.value)} sx={{ bgcolor: 'background.default', borderRadius: 1.5, fontSize: 13, minWidth: { sm: 300 } }}>
                  {partidos.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {`J${p.jornada} · ${eqName(p.equipo_local_id)} vs ${eqName(p.equipo_visitante_id)}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<PdfIcon />} disabled={!partido} onClick={() => partido && navigate(`/acta/${partido.id}`)} sx={{ textTransform: 'none', fontWeight: 700, height: 40, borderRadius: 1.5 }}>
                Acta de Partido
              </Button>
              {editable && partido && (
                <Button variant="outlined" color="secondary" startIcon={<TuneIcon />} onClick={abrirActa} sx={{ textTransform: 'none', fontWeight: 700, height: 40, borderRadius: 1.5 }}>
                  Datos del acta
                </Button>
              )}
              {editable && !finalizarMut.isPending && (
                <Button variant="contained" startIcon={<VerifiedIcon />} onClick={abrirFinalizar} sx={{ textTransform: 'none', fontWeight: 700, height: 40, borderRadius: 1.5 }}>
                  Finalizar
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {!partido ? (
        <Alert severity="info">Selecciona un partido.</Alert>
      ) : partidos.length === 0 ? (
        <Alert severity="info">No hay partidos en este torneo.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,42,0.25)' }}>
            <Box bgcolor="#111827" color="#fff">
              <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.25, bgcolor: '#1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {editable ? (
                    <Chip size="small" label={iniciado ? '● EN CURSO' : 'SIN INICIAR'}
                      sx={{ bgcolor: iniciado ? '#059669' : '#374151', color: iniciado ? '#022c22' : '#d1d5db', fontWeight: 800, letterSpacing: '0.04em', ...(iniciado ? { animation: 'torneoPulse 1.6s ease-in-out infinite' } : {}) }} />
                  ) : (
                    <Chip size="small" label={label} color={color} />
                  )}
                  <Chip size="small" label={`Jornada ${partido.jornada} · ${partido.locacion?.nombre || 'Sede por definir'}`} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' }} />
                  {partido.fecha_programada && (
                    <Chip size="small" label={fmtFecha(partido.fecha_programada)} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip size="small" label={partido.arbitro_nombre ? `Árbitro: ${partido.arbitro_nombre}` : 'Árbitro por designar (AFA)'} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }} />
                  <Chip size="small" label={iniciado ? '● SINCRONIZADO' : 'CONECTADO'}
                    sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#34d399', fontFamily: 'JetBrains Mono, Menlo, monospace', letterSpacing: '0.05em', fontWeight: 700 }} />
                </Box>
              </Box>

              <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                <Box sx={{ flex: 1, width: '100%', textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Club Atlético</Typography>
                  <Typography variant="h5" fontWeight={900} color="#fff" sx={{ textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{eqName(partido.equipo_local_id)}</Typography>
                  {editable && (
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                      <Tooltip title={iniciado ? 'Registrar gol' : 'Inicia el partido para registrar acciones'}>
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => abrirAccion('GOL', partido.equipo_local_id)}>
                            <GolIcon sx={{ color: '#4ade80', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={iniciado ? 'Registrar tarjeta' : 'Inicia el partido para registrar acciones'}>
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => abrirAccion('TARJETA_AMARILLA', partido.equipo_local_id)}>
                            <YellowCardIcon sx={{ color: '#facc15', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={iniciado ? 'Registrar cambio' : 'Inicia el partido para registrar acciones'}>
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => abrirAccion('CAMBIO', partido.equipo_local_id)}>
                            <SwapIcon sx={{ color: '#60a5fa', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Anular último gol de este equipo">
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => anularGol(partido.equipo_local_id)}>
                            <UndoIcon sx={{ color: '#f87171', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap' }}>
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 11, fontWeight: 700 }}>
                      <EmojiPeopleIcon sx={{ fontSize: 13 }} /> DT: {tecnicoDe(partido.equipo_local_id) || 'Sin registrar'}
                    </Box>
                    {editable && (
                      <>
                        <Tooltip title={iniciado ? 'Amarilla al DT' : 'Inicia el partido para registrar acciones'}>
                          <span>
                            <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => registrarTecnico(partido.equipo_local_id, 'TARJETA_AMARILLA')}>
                              <YellowCardIcon sx={{ color: '#facc15', fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={iniciado ? 'Roja al DT' : 'Inicia el partido para registrar acciones'}>
                          <span>
                            <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => registrarTecnico(partido.equipo_local_id, 'TARJETA_ROJA')}>
                              <RedCardIcon sx={{ color: '#f87171', fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 2, sm: 4 }, py: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 } }}>
                    <Typography variant="h2" fontWeight={900} color="#fff">{marcadorMostrado.local}</Typography>
                    <Typography variant="h3" fontWeight={300} color="#4b5563">–</Typography>
                    <Typography variant="h2" fontWeight={900} color="#fff">{marcadorMostrado.visitante}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                    <Chip size="small" icon={<AccessTimeIcon sx={{ fontSize: '0.9rem !important' }} />}
                      label={iniciado
                        ? `${fmtTiempo(crono.seg)} ${adicion > 0 ? `(+${adicion}')` : ''}`
                        : 'Sin iniciar'}
                      sx={{
                        bgcolor: iniciado ? '#1e3a8a' : '#1f2937',
                        color: iniciado ? '#93c5fd' : '#6b7280',
                        fontFamily: 'JetBrains Mono, Menlo, monospace', fontWeight: 700,
                      }} />
                    <Chip size="small" label={half === 1 ? '1T' : '2T'} sx={{ bgcolor: '#334155', color: '#e2e8f0', fontFamily: 'JetBrains Mono, Menlo, monospace', fontWeight: 700 }} />
                    <Chip size="small" label={`+${adicion}' ADICIÓN`}
                      onClick={() => setAdicion((a) => (a === 0 ? 4 : a === 4 ? 6 : 0))}
                      sx={{ bgcolor: '#334155', color: '#6ee7b7', fontFamily: 'JetBrains Mono, Menlo, monospace', fontWeight: 700, cursor: 'pointer', '&:hover': { bgcolor: '#48738f' } }} />
                    {editable && (
                      <>
                        <Tooltip title={crono.running ? 'Pausar' : (iniciado ? 'Reanudar' : (planillaCompleta ? 'Iniciar partido' : 'Planilla incompleta: faltan titulares en algún equipo'))}>
                          <IconButton size="small" sx={{ color: '#fff', '&:hover': { bgcolor: '#374151' } }}
                            onClick={toggleCrono}>
                            {crono.running ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reiniciar cronómetro">
                          <IconButton size="small" color="error" onClick={resetCrono}>
                            <ReplayIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Box>

                <Box sx={{ flex: 1, width: '100%', textAlign: { xs: 'center', sm: 'right' } }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Club Deportivo</Typography>
                  <Typography variant="h5" fontWeight={900} color="#fff" sx={{ textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{eqName(partido.equipo_visitante_id)}</Typography>
                  {editable && (
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1, justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                      <Tooltip title={iniciado ? 'Registrar gol' : 'Inicia el partido para registrar acciones'}>
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => abrirAccion('GOL', partido.equipo_visitante_id)}>
                            <GolIcon sx={{ color: '#4ade80', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={iniciado ? 'Registrar tarjeta' : 'Inicia el partido para registrar acciones'}>
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => abrirAccion('TARJETA_AMARILLA', partido.equipo_visitante_id)}>
                            <YellowCardIcon sx={{ color: '#facc15', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={iniciado ? 'Registrar cambio' : 'Inicia el partido para registrar acciones'}>
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => abrirAccion('CAMBIO', partido.equipo_visitante_id)}>
                            <SwapIcon sx={{ color: '#60a5fa', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Anular último gol de este equipo">
                        <span>
                          <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => anularGol(partido.equipo_visitante_id)}>
                            <UndoIcon sx={{ color: '#f87171', fontSize: 19 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, justifyContent: { xs: 'center', sm: 'flex-end' }, flexWrap: 'wrap' }}>
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 11, fontWeight: 700 }}>
                      <EmojiPeopleIcon sx={{ fontSize: 13 }} /> DT: {tecnicoDe(partido.equipo_visitante_id) || 'Sin registrar'}
                    </Box>
                    {editable && (
                      <>
                        <Tooltip title={iniciado ? 'Amarilla al DT' : 'Inicia el partido para registrar acciones'}>
                          <span>
                            <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => registrarTecnico(partido.equipo_visitante_id, 'TARJETA_AMARILLA')}>
                              <YellowCardIcon sx={{ color: '#facc15', fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={iniciado ? 'Roja al DT' : 'Inicia el partido para registrar acciones'}>
                          <span>
                            <IconButton size="small" sx={accIconBtnSx} disabled={!iniciado} onClick={() => registrarTecnico(partido.equipo_visitante_id, 'TARJETA_ROJA')}>
                              <RedCardIcon sx={{ color: '#f87171', fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {editable ? (
                <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, bgcolor: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" color="error" startIcon={<CheckIcon />}
                    disabled={finalizarMut.isPending}
                    onClick={abrirFinalizar}>
                    {finalizarMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Finalizar partido'}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, bgcolor: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="body2" color="#9ca3af">Este partido ya fue jugado. Solo lectura.</Typography>
                </Box>
              )}
            </Box>
          </Card>

          <Box>
            <Typography variant="h6" fontWeight={700} mb={1}>Jugadores que juegan</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {editable ? 'Elige el jugador y el número con el que juega; se va agregando a la lista.' : 'Alineación registrada del partido.'}
            </Typography>
            <Grid container spacing={2}>
              {[{ nombre: eqName(partido.equipo_local_id), plantel: plantelLocal, q: jugadoresLocalQ, id: partido.equipo_local_id },
                { nombre: eqName(partido.equipo_visitante_id), plantel: plantelVisit, q: jugadoresVisitQ, id: partido.equipo_visitante_id }].map((eq) => {
                const alEquipo = eq.plantel.filter((j) => alineacionMap[j.id])
                const disponibles = eq.plantel.filter((j) => j.activo && !alineacionMap[j.id])
                const titulares = alEquipo.filter((j) => alineacionMap[j.id].titular).length
                const suplentes = alEquipo.length - titulares
                // Lista ordenada: primero titulares, luego suplentes; por número de camiseta dentro de cada grupo
                const alOrdenada = [...alEquipo].sort((a, b) =>
                  (alineacionMap[b.id].titular ? 1 : 0) - (alineacionMap[a.id].titular ? 1 : 0) ||
                  ((numCamiseta(a, alineacionMap[a.id]) ?? 999) - (numCamiseta(b, alineacionMap[b.id]) ?? 999)) ||
                  String(a.nombre).localeCompare(String(b.nombre)))
                const numeroOcupado = (jugadorId, numero) => {
                  if (numero === '' || numero == null) return false
                  return alEquipo.filter((o) => o.id !== jugadorId)
                    .some((o) => numCamiseta(o, alineacionMap[o.id]) === Number(numero))
                }
                const hasAmarilla = (jugadorId) => amarillasDe(jugadorId) > 0
                const hasRoja = (jugadorId) => rojaDe(jugadorId)
                const ROLES = { POR: 1, DEF: 2, MED: 3, DEL: 4, OTROS: 5 }
                const rolDe = (j) => {
                  const al = alineacionMap[j.id]
                  const r = al?.posicion_tactica || (j.posicion === 'ARQUERO' ? 'POR'
                    : j.posicion === 'DEFENSOR' ? 'DEF'
                      : j.posicion === 'MEDIOCAMPISTA' ? 'MED'
                        : j.posicion === 'DELANTERO' ? 'DEL' : 'OTROS')
                  return (r === 'POR' || r === 'DEF' || r === 'MED' || r === 'DEL' || r === 'OTROS') ? r : 'OTROS'
                }
                // Si ningún titular tiene posición real, se reparte 4-3-3 como base.
                const titularesEq = alEquipo.filter((j) => alineacionMap[j.id].titular)
                const rolBaseMap = {}
                if (titularesEq.length > 0 && titularesEq.every((j) => rolDe(j) === 'OTROS')) {
                  titularesEq.forEach((j, i) => { rolBaseMap[j.id] = FORMACION_DEFECTO[i] || 'OTROS' })
                }
                const rolBaseDe = (j) => rolBaseMap[j.id] || rolDe(j)
                const layoutDe = () => {
                  const ov = ordenLocal[eq.id] || {}
                  const grupos = { POR: [], DEF: [], MED: [], DEL: [], OTROS: [] }
                  titularesEq.forEach((j) => {
                    const over = ov[j.id]
                    grupos[over ? over.rol : rolBaseDe(j)].push(j)
                  })
                  Object.keys(grupos).forEach((k) => {
                    grupos[k].sort((a, b) =>
                      (ov[a.id]?.ord ?? (alineacionMap[a.id].posicion_orden ?? 999)) -
                      (ov[b.id]?.ord ?? (alineacionMap[b.id].posicion_orden ?? 999)))
                  })
                  return grupos
                }
                const moverJugador = (jugadorId, rolDestino, antesDe) => {
                  if (!editable || !jugadorId) return
                  if (antesDe === jugadorId) return
                  const ov = { ...(ordenLocal[eq.id] || {}) }
                  const filas = {}
                  titularesEq.forEach((j) => {
                    const r = ov[j.id]?.rol || rolBaseDe(j)
                    filas[r] = filas[r] || []
                    filas[r].push(j.id)
                  })
                  const origen = ov[jugadorId]?.rol || rolBaseDe(alEquipo.find((j) => j.id === jugadorId))
                  filas[origen] = (filas[origen] || []).filter((id) => id !== jugadorId)
                  const dest = filas[rolDestino] || []
                  const idx = antesDe ? dest.indexOf(antesDe) : -1
                  if (idx >= 0) dest.splice(idx, 0, jugadorId)
                  else dest.push(jugadorId)
                  filas[rolDestino] = dest
                  const nuevo = {}
                  Object.keys(filas).forEach((r) => filas[r].forEach((id, ord) => { nuevo[id] = { rol: r, ord } }))
                  setOrdenLocal({ ...ordenLocal, [eq.id]: nuevo })
                  const items = Object.keys(filas).reduce((acc, r) => acc.concat(filas[r]), [])
                    .map((id) => ({ jugador_id: id, posicion: nuevo[id].rol, orden: nuevo[id].ord }))
                  ordenMut.mutate({ equipoId: eq.id, items })
                }
                const arrastrable = editable && alEquipo.some((j) => alineacionMap[j.id].titular)
                const form = formEquipo[eq.id] || { jugador_id: '', numero: '' }
                const setForm = (f) => setFormEquipo({ ...formEquipo, [eq.id]: f })
                return (
                  <Grid item xs={12} sm={6} key={eq.id}>
                    <Card elevation={0} variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ pt: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: Number(eq.id) === partido.equipo_local_id ? '#dc2626' : '#2563eb' }} />
                        <Typography variant="subtitle1" fontWeight={700}>{eq.nombre} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 12 }}>· Plantel</Box></Typography>
                      </Box>
                        <Typography variant="caption" color="text.secondary">
                          {alEquipo.length} jugando · {titulares} titular(es) · {suplentes} suplente(s)
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <ToggleButtonGroup size="small" exclusive
                            value={vistaEquipo[eq.id] || 'lista'}
                            onChange={(_, v) => { if (v) setVistaEquipo({ ...vistaEquipo, [eq.id]: v }) }}>
                            <ToggleButton value="lista"><Box sx={{ fontSize: 11, fontWeight: 700 }}>Lista</Box></ToggleButton>
                            <ToggleButton value="cancha"><Box sx={{ fontSize: 11, fontWeight: 700 }}>Formación</Box></ToggleButton>
                          </ToggleButtonGroup>
                        </Box>
                        {eq.q.isLoading || loadingAlineacion ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>
                        ) : (
                          <>
                            {editable && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, mb: 1, flexWrap: 'wrap' }}>
                                <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
                                  <InputLabel>Agregar jugador</InputLabel>
                                  <Select label="Agregar jugador" value={form.jugador_id}
                                    onChange={(e) => {
                                      const j = eq.plantel.find((x) => String(x.id) === e.target.value)
                                      setForm({ jugador_id: e.target.value, numero: j ? String(j.numero_camiseta ?? '') : '' })
                                    }}>
                                    {disponibles.length === 0 && <MenuItem value="" disabled><em>No quedan jugadores por agregar</em></MenuItem>}
                                    {disponibles.map((j) => (
                                      <MenuItem key={j.id} value={String(j.id)}>
                                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 16, width: '100%' }}>
                                          <span>{j.nombre}</span>
                                          {j.posicion && (
                                            <span style={{ opacity: 0.6, fontSize: 12, whiteSpace: 'nowrap' }}>{POSICION_LABEL[j.posicion] || j.posicion}</span>
                                          )}
                                        </span>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <TextField label="N°" type="number" size="small"
                                  inputProps={{ min: 0, max: 999 }}
                                  value={form.numero}
                                  onChange={(e) => {
                                    const v = e.target.value.trim()
                                    if (/^\d*$/.test(v)) setForm({ ...form, numero: v })
                                  }}
                                  sx={{ width: 76 }} />
                                <Button size="medium" variant="contained" color="success" startIcon={<PersonAddIcon sx={{ fontSize: 17 }} />}
                                  disabled={!form.jugador_id || alinearMut.isPending}
                                  onClick={() => {
                                    const jugador = eq.plantel.find((x) => String(x.id) === form.jugador_id)
                                    if (!jugador) return
                                    if (!jugador.activo) {
                                      toast.show(`${jugador.nombre} está inactivo y no puede ser convocado`, 'error')
                                      return
                                    }
                                    const nRaw = form.numero.trim()
                                    if (nRaw !== '') {
                                      const nVal = Number(nRaw)
                                      if (!Number.isInteger(nVal) || nVal < 0 || nVal > 999) {
                                        toast.show('El número de camiseta debe ser un entero entre 0 y 999', 'error')
                                        return
                                      }
                                      if (numeroOcupado(null, nRaw)) {
                                        toast.show(`El número ${nRaw} ya está siendo usado en este equipo`, 'error')
                                        return
                                      }
                                    }
                                    const n = nRaw === '' ? null : Number(nRaw)
                                    // Con 11 titulares completos, el resto se registra automáticamente como suplente.
                                    const esTitular = titulares < MAX_TITULARES
                                    const body = { jugadorId: jugador.id, titular: esTitular }
                                    if (n !== null) body.numeroCamiseta = n
                                    alinearMut.mutate(body, {
                                      onSuccess: () => {
                                        setForm({ jugador_id: '', numero: '' })
                                        qc.invalidateQueries(['jugadores', eq.id])
                                      },
                                    })
                                  }}>
                                  Agregar
                                </Button>
                              </Box>
                            )}
                            {alEquipo.length === 0 ? (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Aún no hay jugadores seleccionados.</Typography>
                            ) : vistaEquipo[eq.id] === 'cancha' ? (
                              (() => {
                                const colorRol = { POR: '#f39c12', DEF: '#4aa3ff', MED: '#2ecc71', DEL: '#ff5b5b', OTROS: '#90a4ae' }
                                const grupos = layoutDe()
                                const dropFila = (rol) => (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  moverJugador(Number(e.dataTransfer.getData('text/plain')), rol, null)
                                  setHoverKey('')
                                }
                                const Token = ({ j, rol }) => {
                                  const al = alineacionMap[j.id]
                                  const key = `${eq.id}-${rol}-t${j.id}`
                                  const activo = hoverKey === key
                                  const amarilla = hasAmarilla(j.id)
                                  const roja = hasRoja(j.id)
                                  return (
                                    <Box
                                      draggable={editable}
                                      onDragStart={(e) => {
                                        dragJugador.current = { eqId: eq.id, jugadorId: j.id, rol }
                                        e.dataTransfer.setData('text/plain', String(j.id))
                                        e.dataTransfer.effectAllowed = 'move'
                                      }}
                                      onDragEnd={() => setHoverKey('')}
                                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setHoverKey(key) }}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        const arrastrado = Number(e.dataTransfer.getData('text/plain'))
                                        if (arrastrado !== j.id) moverJugador(arrastrado, rol, j.id)
                                        setHoverKey('')
                                      }}
                                      sx={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 0.4,
                                        cursor: editable ? 'grab' : 'default',
                                        '.MuiBox': { pointerEvents: 'none' },
                                        ...(activo ? { boxShadow: '0 0 0 3px rgba(255,255,255,0.9)', borderRadius: 2 } : {}),
                                      }}
                                    >
                                      <Box sx={{ position: 'relative', lineHeight: 0 }}>
                                        <Tooltip title={`${j.nombre} · camiseta ${numCamiseta(j, al)} · ${POSICION_LABEL[j.posicion] || 'Sin posición'}${roja ? ' · Expulsado' : amarilla ? ' · Amonestado' : ''}`}>
                                          <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: colorRol[rol], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.35)', opacity: roja ? 0.55 : 1 }}>
                                            {numCamiseta(j, al)}
                                          </Box>
                                        </Tooltip>
                                        {(amarilla || roja) && (
                                          <Box sx={{ position: 'absolute', bottom: -4, right: -4, lineHeight: 0, bgcolor: '#fff', borderRadius: '3px', p: '1px', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
                                            {roja
                                              ? <RedCardIcon sx={{ fontSize: 13, color: '#dc2626' }} />
                                              : <YellowCardIcon sx={{ fontSize: 13, color: '#eab308' }} />}
                                          </Box>
                                        )}
                                      </Box>
                                      <Box sx={{ fontSize: 10, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)', maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.25 }}>
                                        {j.nombre}
                                      </Box>
                                    </Box>
                                  )
                                }
                                const renderFila = (rol, etiqueta) => {
                                  const jugadores = grupos[rol]
                                  if (jugadores.length === 0) return null
                                  const filaActiva = hoverKey === `${eq.id}-${rol}-fila`
                                  return (
                                    <Box
                                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setHoverKey(`${eq.id}-${rol}-fila`) }}
                                      onDrop={dropFila(rol)}
                                      sx={{
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: 60,
                                        borderRadius: 1, py: 0.25,
                                        ...(filaActiva ? { outline: '2px dashed rgba(255,255,255,0.8)' } : {}),
                                      }}
                                    >
                                      <Typography variant="caption" sx={{ width: 34, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{etiqueta}</Typography>
                                      {jugadores.map((j) => <Token key={j.id} j={j} rol={rol} />)}
                                    </Box>
                                  )
                                }
                                return (
                                  <Box>
                                    {arrastrable && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        Arrastrá un jugador a la línea o posición deseada.
                                      </Typography>
                                    )}
                                    <Box sx={{
                                      mt: 1, background: 'linear-gradient(160deg,#1b5e20,#2c6e31 55%,#3a8f44)', borderRadius: 2,
                                      p: 1.5, position: 'relative', overflow: 'hidden',
                                    }}>
                                      <Box sx={{ position: 'absolute', top: '50%', left: 10, right: 10, borderTop: '2px dashed rgba(255,255,255,0.35)' }} />
                                      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 260, pt: 1 }}>
                                        {renderFila('OTROS', '⚑')}
                                        {renderFila('DEL', 'DEL')}
                                        {renderFila('MED', 'MED')}
                                        {renderFila('DEF', 'DEF')}
                                        {renderFila('POR', 'POR')}
                                      </Box>
                                    </Box>
                                    {suplentes > 0 && (
                                      <Box sx={{ mt: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Banca</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                          {alEquipo.filter((j) => !alineacionMap[j.id].titular).map((j) => (
                                            <Tooltip key={j.id} title={`${j.nombre} · ${j.posicion ? (POSICION_LABEL[j.posicion] || j.posicion) : 'Sin posición'}`}>
                                              <Chip label={`#${numCamiseta(j, alineacionMap[j.id])} ${j.nombre}`} size="small" variant="outlined" />
                                            </Tooltip>
                                          ))}
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                )
                              })()
                            ) : (
                              <List dense sx={{ mt: 0.5 }}>
                                {alOrdenada.map((j, i) => {
                                  const al = alineacionMap[j.id]
                                  return (
                                    <Box key={j.id}>
                                      {i > 0 && <Divider component="li" />}
                                      <ListItem
                                        disablePadding
                                        secondaryAction={(editable || hasAmarilla(j.id) || hasRoja(j.id)) && (
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Tooltip title={hasAmarilla(j.id) ? 'Tiene tarjeta amarilla en este partido' : 'Sin tarjeta amarilla'}>
                                              <YellowCardIcon sx={{ color: hasAmarilla(j.id) ? 'warning.main' : 'grey.300', fontSize: 18 }} />
                                            </Tooltip>
                                            <Tooltip title={hasRoja(j.id) ? 'Expulsado (roja) en este partido' : 'Sin tarjeta roja'}>
                                              <RedCardIcon sx={{ color: hasRoja(j.id) ? 'error.main' : 'grey.300', fontSize: 18 }} />
                                            </Tooltip>
                                            {editable && (
                                              <>
                                                <ToggleButtonGroup size="small" exclusive
                                                  value={al.titular ? 'T' : 'S'}
                                                  onChange={(_, v) => {
                                                    if (v === null) return
                                                    if (v === 'T' && !al.titular && titulares >= MAX_TITULARES) {
                                                      toast.show(`No pueden haber más de ${MAX_TITULARES} titulares`, 'error')
                                                      return
                                                    }
                                                    alinearMut.mutate({ jugadorId: j.id, titular: v === 'T' })
                                                  }}>
                                                  <ToggleButton value="T" sx={{ px: 1.2, py: 0 }}>
                                                    <Tooltip title="Titular"><Box sx={{ fontSize: 11, fontWeight: 700 }}>T</Box></Tooltip>
                                                  </ToggleButton>
                                                  <ToggleButton value="S" sx={{ px: 1.2, py: 0 }}>
                                                    <Tooltip title="Suplente"><Box sx={{ fontSize: 11, fontWeight: 700 }}>S</Box></Tooltip>
                                                  </ToggleButton>
                                                </ToggleButtonGroup>
                                                <Tooltip title="Quitar de la lista">
                                                  <IconButton edge="end" size="small" color="error"
                                                    onClick={() => { if (window.confirm(`¿Quitar a ${j.nombre} de la lista?`)) desalinearMut.mutate(j.id) }}>
                                                    <DeleteIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              </>
                                            )}
                                          </Box>
                                        )}
                                      >
                                        <Chip label={`#${numCamiseta(j, al)}`} size="small" variant="filled"
                                          color={al.titular ? 'primary' : 'info'} sx={{ mr: 1.5, minWidth: 44 }} />
                                        <ListItemText
                                          primary={j.nombre}
                                          secondary={al.titular ? 'Titular' : 'Suplente'}
                                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                          secondaryTypographyProps={{ variant: 'caption', color: al.titular ? 'primary.main' : 'info.main' }}
                                        />
                                      </ListItem>
                                    </Box>
                                  )
                                })}
                              </List>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryToggleOffIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight={700}>Resumen del partido</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>Cronología minuto a minuto</Typography>
                  </Box>
                  {loadingEventos ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                  ) : !eventos || eventos.length === 0 ? (
                    <Alert severity="info">No hay acciones registradas en este partido.</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      {lineaEventos.map(({ ev, score }) => {
                        const estilo = ESTILO_EVENTO[ev.tipo] || ESTILO_EVENTO.GOL
                        const sala = ev.jugador_sale_id ? nombreDe(ev.jugador_sale_id, ev.equipo_id) : null
                        const entra = ev.jugador_id ? nombreDe(ev.jugador_id, ev.equipo_id) : null
                        const esGol = ev.tipo === 'GOL' || ev.tipo === 'AUTOGOL'
                        const primary = ev.tipo === 'CAMBIO'
                          ? `${sala || '?'} ↔ ${entra || '?'}`
                          : (ev.tipo_sancionado === 'TECNICO'
                              ? `${ev.nombre_sancionado || 'DT'} (técnico)`
                              : (ev.jugador_id ? entra : 'Sin jugador asociado'))
                        return (
                          <Box key={ev.id} sx={{
                            display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 0.75,
                            borderBottom: '1px solid', borderColor: 'divider', minWidth: 0,
                            '&:last-of-type': { borderBottom: 'none' },
                            '&:hover': { bgcolor: 'action.hover' },
                          }}>
                            <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: estilo.bg, border: `1px solid ${estilo.border}`, color: estilo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {estilo.icon}
                            </Box>
                            <Typography sx={{ width: 32, flexShrink: 0, textAlign: 'right', fontFamily: 'JetBrains Mono, Menlo, monospace', fontWeight: 800, fontSize: 11, color: estilo.color }}>
                              {ev.minuto}'
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {primary}
                            </Typography>
                            {esGol && (
                              <Chip label={`${score.l} - ${score.v}`} size="small"
                                sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: estilo.border, color: estilo.color, flexShrink: 0 }} />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' }, whiteSpace: 'nowrap' }}>
                              {TIPO_LABEL[ev.tipo] || ev.tipo} · {eqName(ev.equipo_id)}
                            </Typography>
                            {editable && (
                              <IconButton edge="end" size="small" color="error" sx={{ p: 0.25, flexShrink: 0 }}
                                onClick={() => { if (window.confirm('¿Eliminar esta acción?')) borrarEventoMut.mutate(ev.id) }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        )
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PublishedWithChangesIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight={700}>Cambios y ventanas FIFA</Typography>
                    </Box>
                    <Chip label="Regla IFAB 3" size="small" sx={{ bgcolor: 'rgba(29,78,216,0.10)', color: 'primary.main', fontWeight: 800, fontSize: 10, height: 22 }} />
                  </Box>
                  {loadingEventos ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                  ) : !eventos || eventos.filter((e) => e.tipo === 'CAMBIO').length === 0 ? (
                    <Alert severity="info">No hay cambios registrados aún.</Alert>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                        {[partido.equipo_local_id, partido.equipo_visitante_id].map((eqId) => {
                          const n = cambiosPorEquipo[eqId] || 0
                          const ventanas = Math.min(3, Math.max(1, n))
                          return (
                            <Box key={eqId}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: Number(eqId) === partido.equipo_local_id ? '#dc2626' : '#2563eb' }} />
                                  <Typography variant="body2" fontWeight={700} noWrap>{eqName(eqId)}</Typography>
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'JetBrains Mono, Menlo, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                                  {n} cambio(s) · {ventanas} de 3 ventanas
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75, mt: 0.5 }}>
                                {[0, 1, 2].map((i) => <Box key={i} sx={{ height: 5, borderRadius: 1, bgcolor: i < ventanas ? 'primary.main' : 'divider' }} />)}
                              </Box>
                            </Box>
                          )
                        })}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {eventos
                          .filter((e) => e.tipo === 'CAMBIO')
                          .sort((a, b) => a.minuto - b.minuto || (a.id || 0) - (b.id || 0))
                          .map((ev) => {
                            const sala = ev.jugador_sale_id ? nombreDe(ev.jugador_sale_id, ev.equipo_id) : '?'
                            const entra = ev.jugador_id ? nombreDe(ev.jugador_id, ev.equipo_id) : '?'
                            return (
                              <Box key={ev.id} sx={{
                                display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 0.75,
                                borderBottom: '1px solid', borderColor: 'divider', minWidth: 0,
                                '&:last-of-type': { borderBottom: 'none' },
                                '&:hover': { bgcolor: 'action.hover' },
                              }}>
                                <SwapIcon sx={{ fontSize: 16, color: ESTILO_EVENTO.CAMBIO.color, flexShrink: 0 }} />
                                <Typography sx={{ width: 32, flexShrink: 0, textAlign: 'right', fontFamily: 'JetBrains Mono, Menlo, monospace', fontWeight: 800, fontSize: 11, color: ESTILO_EVENTO.CAMBIO.color }}>
                                  {ev.minuto}'
                                </Typography>
                                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <Box component="span" sx={{ fontWeight: 700, color: '#b91c1c' }}>{sala || '?'}</Box>
                                  <Box component="span" sx={{ color: 'text.secondary', mx: 0.5 }}>→</Box>
                                  <Box component="span" sx={{ fontWeight: 700, color: '#15803d' }}>{entra || '?'}</Box>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>{eqName(ev.equipo_id)}</Typography>
                                {editable && (
                                  <IconButton edge="end" size="small" color="error" sx={{ p: 0.25, flexShrink: 0 }}
                                    onClick={() => { if (window.confirm('¿Eliminar este cambio?')) borrarEventoMut.mutate(ev.id) }}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            )
                          })}
                      </Box>
                      {partido && (
                        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,104,70,0.06)', border: '1px solid', borderColor: 'rgba(0,104,70,0.20)', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <VerifiedUserIcon sx={{ color: '#006846', fontSize: 20, flexShrink: 0 }} />
                          <Box sx={{ fontSize: 12 }}>
                            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary', display: 'block' }}>Certificación federativa en tiempo real</Box>
                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Sincronizado con el Tribunal de Penas. Token criptográfico:{' '}
                              <Box component="span" sx={{ fontFamily: 'JetBrains Mono, Menlo, monospace', color: 'primary.main', fontWeight: 700 }}>
                                #{`TRN-${new Date().getFullYear()}-${String(partido.id).padStart(4, '0')}`}
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      <Dialog open={!!accion} onClose={() => setAccion(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Registrar {accion ? TIPO_ACCION[accion]?.label : ''}
        </DialogTitle>
        <DialogContent>
          {accion === 'CAMBIO' ? (
            <>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontWeight: 700, color: 'error.main', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                    Sale
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, maxHeight: 320, overflowY: 'auto', p: 0.5 }}>
                    {enCanchaDe(accForm.equipo_id).map((j) => (
                      <JugadorBtn key={j.id} num={numCamiseta(j, alineacionMap[j.id])} nombre={j.nombre}
                        base={PALETA_CAMBIO.sale.base} sel={PALETA_CAMBIO.sale.sel}
                        seleccionado={String(accForm.jugador_sale_id) === String(j.id)}
                        onClick={() => setAccForm((f) => {
                          if (String(f.jugador_sale_id) === String(j.id)) return { ...f, jugador_sale_id: '' }
                          if (String(f.jugador_id) === String(j.id)) return f
                          return { ...f, jugador_sale_id: String(j.id) }
                        })} />
                    ))}
                  </Box>
                  {enCanchaDe(accForm.equipo_id).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                      No hay titulares disponibles para sacar.
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontWeight: 700, color: 'success.main', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                    Entra
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, maxHeight: 320, overflowY: 'auto', p: 0.5 }}>
                    {alBancoDe(accForm.equipo_id).map((j) => (
                      <JugadorBtn key={j.id} num={numCamiseta(j, alineacionMap[j.id])} nombre={j.nombre}
                        base={PALETA_CAMBIO.entra.base} sel={PALETA_CAMBIO.entra.sel}
                        seleccionado={String(accForm.jugador_id) === String(j.id)}
                        onClick={() => setAccForm((f) => {
                          if (String(f.jugador_id) === String(j.id)) return { ...f, jugador_id: '' }
                          if (String(f.jugador_sale_id) === String(j.id)) return f
                          return { ...f, jugador_id: String(j.id) }
                        })} />
                    ))}
                  </Box>
                  {alBancoDe(accForm.equipo_id).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                      No hay suplentes disponibles para entrar.
                    </Typography>
                  )}
                </Grid>
              </Grid>
              {convocadosDe(accForm.equipo_id).length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>Este equipo no tiene jugadores convocados en la alineación.</Alert>
              )}
              {convocadosDe(accForm.equipo_id).some((j) => expulsados.has(j.id)) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Expulsados: {convocadosDe(accForm.equipo_id).filter((j) => expulsados.has(j.id)).map((j) => j.nombre).join(', ')} — no pueden participar en cambios.
                </Alert>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <Button variant="contained" startIcon={<CheckIcon />}
                  disabled={!accForm.jugador_id || !accForm.jugador_sale_id || eventoMut.isPending}
                  onClick={confirmarCambio}>
                  {eventoMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Confirmar cambio'}
                </Button>
              </Box>
            </>
          ) : (
            <>
              {(accion === 'GOL' || accion === 'AUTOGOL') && (
                <ToggleButtonGroup size="small" exclusive sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}
                  value={accion}
                  onChange={(e, val) => val && setAccion(val)}>
                  <ToggleButton value="GOL">Gol</ToggleButton>
                  <ToggleButton value="AUTOGOL">Autogol</ToggleButton>
                </ToggleButtonGroup>
              )}
              {(accion === 'TARJETA_AMARILLA' || accion === 'TARJETA_ROJA') && (
                <ToggleButtonGroup size="small" exclusive sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}
                  value={accion}
                  onChange={(e, val) => val && setAccion(val)}>
                  <ToggleButton value="TARJETA_AMARILLA"><YellowCardIcon sx={{ fontSize: 16, mr: 0.5 }} />Amarilla</ToggleButton>
                  <ToggleButton value="TARJETA_ROJA"><RedCardIcon sx={{ fontSize: 16, mr: 0.5 }} />Roja</ToggleButton>
                </ToggleButtonGroup>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1.5 }}>
                Haz clic en el número del jugador para registrar la acción inmediatamente.
              </Typography>
              {convocadosDe(accForm.equipo_id).length === 0 ? (
                <Alert severity="warning">Este equipo no tiene jugadores convocados en la alineación.</Alert>
              ) : (
                (() => {
                  // Goles/autogoles: solo jugadores EN CANCHA (titulares activos, sin expulsar)
                  const esGol = accion === 'GOL' || accion === 'AUTOGOL'
                  const titulares = esGol
                    ? enCanchaDe(accForm.equipo_id)
                    : convocadosDe(accForm.equipo_id).filter((j) => alineacionMap[j.id]?.titular && !expulsados.has(j.id))
                  const suplentes = esGol
                    ? []
                    : convocadosDe(accForm.equipo_id).filter((j) => !alineacionMap[j.id]?.titular && !expulsados.has(j.id))
                  if (titulares.length === 0 && suplentes.length === 0) {
                    return (
                      <Alert severity={esGol ? 'info' : 'warning'} sx={{ mt: 1 }}>
                        {esGol ? 'No hay jugadores en cancha para registrar el gol (verifica cambios y expulsiones).' : 'No hay jugadores habilitados para recibir tarjeta.'}
                      </Alert>
                    )
                  }
                  const pal = COLORES_ACCION[accion] || COLORES_ACCION.GOL
                  const fila = (j) => (
                    <JugadorBtn key={j.id} num={numCamiseta(j, alineacionMap[j.id])} nombre={j.nombre}
                      base={pal.base} sel={pal.sel} seleccionado={false}
                      onClick={() => registrarRapido(j.id)} />
                  )
                  return (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 1, justifyContent: 'center' }}>
                      {titulares.length > 0 && (
                        <Typography variant="caption" sx={{
                          gridColumn: '1 / -1', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1,
                        }}>
                          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          Titulares
                          <Divider sx={{ flex: 1 }} />
                        </Typography>
                      )}
                      {titulares.map(fila)}
                      {suplentes.length > 0 && (
                        <Typography variant="caption" sx={{
                          gridColumn: '1 / -1', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1,
                        }}>
                          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                          Suplentes
                          <Divider sx={{ flex: 1 }} />
                        </Typography>
                      )}
                      {suplentes.map(fila)}
                    </Box>
                  )
                })()
              )}
              {(accion === 'GOL' || accion === 'AUTOGOL') && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={anularGolModal}>
                    Anular último gol
                  </Button>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAccion(null)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Finalizar */}
      <Dialog open={finalizarOpen} onClose={() => setFinalizarOpen(false)} fullWidth maxWidth="xs">
        {partido && (
          <>
            <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
              <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, boxShadow: '0 2px 6px rgba(29,78,216,0.4)' }}>
                <VerifiedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h6" fontWeight={800}>¿Finalizar el partido?</Typography>
              {(() => {
                const ganador = marcadorMostrado.local > marcadorMostrado.visitante
                  ? eqName(partido.equipo_local_id)
                  : marcadorMostrado.visitante > marcadorMostrado.local ? eqName(partido.equipo_visitante_id) : null
                return (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    Se emitirá el Acta Oficial Federativa definitiva con el resultado final{' '}
                    <Box component="span" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: 'JetBrains Mono, Menlo, monospace' }}>{marcadorMostrado.local} - {marcadorMostrado.visitante}</Box>{' '}
                    {ganador ? <>a favor de <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{ganador}</Box>.</> : 'empate. '}
                    Esta acción cerrará la planilla.
                  </Typography>
                )
              })()}
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(29,78,216,0.05)', border: '1px solid', borderColor: 'rgba(59,130,246,0.30)', textAlign: 'left', fontSize: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  <Box component="span">Token arbitral:</Box>
                  <Box component="span" sx={{ fontFamily: 'JetBrains Mono, Menlo, monospace', color: 'primary.main', fontWeight: 800 }}>
                    #{`TRN-${new Date().getFullYear()}-${String(partido.id).padStart(4, '0')}`}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                  <Box component="span">Árbitro principal:</Box>
                  <Box component="span" fontWeight={700}>{partido.arbitro_nombre || 'Por designar (AFA)'}</Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setFinalizarOpen(false)} disabled={finalizarMut.isPending}>Volver</Button>
              <Button variant="contained" startIcon={<VerifiedIcon />} disabled={finalizarMut.isPending}
                onClick={() => {
                  finalizarMut.mutate({ id: partido.id, body: { goles_local: marcadorMostrado.local, goles_visitante: marcadorMostrado.visitante } }, {
                    onSettled: () => setFinalizarOpen(false),
                  })
                }}>
                {finalizarMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Firmar y finalizar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={actaOpen} onClose={() => setActaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <TuneIcon sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
          Datos del acta de partido
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Árbitros designados y observaciones que figurarán en el acta oficial. Se guardan de forma permanente.
          </Typography>
          <TextField label="Árbitro principal" fullWidth margin="dense" placeholder="Nombre del árbitro"
            value={actaForm.arbitro_nombre} onChange={(e) => setActaForm({ ...actaForm, arbitro_nombre: e.target.value })} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            <TextField label="Asistente 1" fullWidth margin="dense"
              value={actaForm.arbitro_asistente1} onChange={(e) => setActaForm({ ...actaForm, arbitro_asistente1: e.target.value })} />
            <TextField label="Asistente 2" fullWidth margin="dense"
              value={actaForm.arbitro_asistente2} onChange={(e) => setActaForm({ ...actaForm, arbitro_asistente2: e.target.value })} />
          </Box>
          <TextField label="Observaciones / incidencias" fullWidth margin="dense" multiline minRows={3}
            placeholder="Incidencias del público, instalaciones, equipo arbitral, jugadores, técnicos…"
            value={actaForm.observaciones} onChange={(e) => setActaForm({ ...actaForm, observaciones: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setActaOpen(false)} disabled={actaMut.isPending}>Cancelar</Button>
          <Button variant="contained" startIcon={<VerifiedIcon />} disabled={actaMut.isPending}
            onClick={() => actaMut.mutate({ id: partido.id, body: { ...actaForm } })}>
            {actaMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar datos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}