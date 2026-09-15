import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import {
  Check as CheckIcon, AccessTime as AccessTimeIcon,
  SportsSoccer as GolIcon, Square as YellowCardIcon,
  Block as RedCardIcon, Flag as AutogolIcon, Delete as DeleteIcon,
  SwapHoriz as SwapIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Replay as ReplayIcon, ArrowDownward as ArrowDownwardIcon, ArrowUpward as ArrowUpwardIcon,
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
  const dragJugador = useRef({ eqId: null, jugadorId: null, rol: '' })
  const lastLiveRef = useRef(null)
  const liveReadyRef = useRef(false)

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

  const marcadorMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/marcador`, body),
    onSuccess: (data) => { setMarcador({ local: data.goles_local, visitante: data.goles_visitante }) },
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
    if (!partido || partido.resultado !== 'PENDIENTE' || !eventos) return
    const local = eventos
      .filter((e) => e.tipo === 'GOL' && e.equipo_id === partido.equipo_local_id).length
      + eventos.filter((e) => e.tipo === 'AUTOGOL' && e.equipo_id === partido.equipo_visitante_id).length
    const visitante = eventos
      .filter((e) => e.tipo === 'GOL' && e.equipo_id === partido.equipo_visitante_id).length
      + eventos.filter((e) => e.tipo === 'AUTOGOL' && e.equipo_id === partido.equipo_local_id).length
    if (local !== marcador.local || visitante !== marcador.visitante) {
      marcadorMut.mutate({ id: partido.id, body: { goles_local: local, goles_visitante: visitante } })
    }
  }, [eventos])

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

  const enCanchaDe = (equipoId) => convocadosDe(equipoId)
    .filter((j) => alineacionMap[j.id].titular && !expulsados.has(j.id))
  const alBancoDe = (equipoId) => {
    const plantel = plantelDe(equipoId)
    const numerosTitulares = new Set(
      plantel.filter((j) => alineacionMap[j.id]?.titular).map((j) => numCamiseta(j, alineacionMap[j.id]))
    )
    return plantel
      .filter((j) => j.activo && !alineacionMap[j.id]?.titular && !expulsados.has(j.id))
      .filter((j) => (numCamiseta(j, alineacionMap[j.id]) == null || !numerosTitulares.has(numCamiseta(j, alineacionMap[j.id]))))
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
    if (!crono.running) setIniciado(true)
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
      <PageHeader title="Planilla" subtitle="Registra minuto a minuto las acciones del partido." />

      <FormControl size="small" fullWidth sx={{ maxWidth: 420, mb: 3 }}>
        <InputLabel>Partido</InputLabel>
        <Select value={selId} label="Partido" onChange={(e) => setSelId(e.target.value)}>
          {partidos.map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>
              {`J${p.jornada} · ${eqName(p.equipo_local_id)} vs ${eqName(p.equipo_visitante_id)} — ${(RESULTADOS[p.resultado] || [p.resultado])[0]}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!partido ? (
        <Alert severity="info">Selecciona un partido.</Alert>
      ) : partidos.length === 0 ? (
        <Alert severity="info">No hay partidos en este torneo.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 16px 40px rgba(15,23,42,0.25)' }}>
            <Box bgcolor="#111827" color="#fff">
              <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, bgcolor: '#1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip size="small" label={`Jornada ${partido.jornada}`} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' }} />
                  {partido.fecha_programada && (
                    <Chip size="small"
                      label={new Date(partido.fecha_programada).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' }} />
                  )}
                </Box>
                <Chip size="small" label={editable ? 'En curso' : label} color={editable ? 'success' : color} />
              </Box>

              <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                <Box sx={{ flex: 1, width: '100%', textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h6" fontWeight={800} color="#fff">{eqName(partido.equipo_local_id)}</Typography>
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
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 2, sm: 4 }, py: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 } }}>
                    <Typography variant="h2" fontWeight={900} color="#fff">{marcador.local}</Typography>
                    <Typography variant="h3" fontWeight={300} color="#4b5563">–</Typography>
                    <Typography variant="h2" fontWeight={900} color="#fff">{marcador.visitante}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                    <Chip size="small" icon={<AccessTimeIcon sx={{ fontSize: '0.9rem !important' }} />}
                      label={iniciado
                        ? `${fmtTiempo(crono.seg)} · ${half === 1 ? 'Primer tiempo' : 'Segundo tiempo'}`
                        : 'Sin iniciar'}
                      sx={{
                        bgcolor: iniciado ? '#1e3a8a' : '#1f2937',
                        color: iniciado ? '#93c5fd' : '#6b7280',
                        fontFamily: 'monospace', fontWeight: 700,
                      }} />
                    {editable && (
                      <>
                        <Tooltip title={crono.running ? 'Pausar' : (iniciado ? 'Reanudar' : 'Iniciar partido')}>
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
                  <Typography variant="h6" fontWeight={800} color="#fff">{eqName(partido.equipo_visitante_id)}</Typography>
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
                    </Box>
                  )}
                </Box>
              </Box>

              {editable ? (
                <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, bgcolor: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" color="error" startIcon={<CheckIcon />}
                    disabled={finalizarMut.isPending}
                    onClick={() => {
                      if (window.confirm('¿Finalizar el partido y guardar el resultado?')) {
                        finalizarMut.mutate({ id: partido.id, body: { goles_local: marcador.local, goles_visitante: marcador.visitante } })
                      }
                    }}>
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
                const numeroOcupado = (jugadorId, numero) => {
                  if (numero === '' || numero == null) return false
                  return alEquipo.filter((o) => o.id !== jugadorId)
                    .some((o) => numCamiseta(o, alineacionMap[o.id]) === Number(numero))
                }
                const tarjetasDe = (jugadorId) => (eventos || []).filter((e) => e.jugador_id === jugadorId)
                const hasAmarilla = (jugadorId) => tarjetasDe(jugadorId).some((e) => e.tipo === 'TARJETA_AMARILLA')
                const hasRoja = (jugadorId) => tarjetasDe(jugadorId).some((e) => e.tipo === 'TARJETA_ROJA')
                const ROLES = { POR: 1, DEF: 2, MED: 3, DEL: 4, OTROS: 5 }
                const rolDe = (j) => {
                  const al = alineacionMap[j.id]
                  const r = al?.posicion_tactica || (j.posicion === 'ARQUERO' ? 'POR'
                    : j.posicion === 'DEFENSOR' ? 'DEF'
                      : j.posicion === 'MEDIOCAMPISTA' ? 'MED'
                        : j.posicion === 'DELANTERO' ? 'DEL' : 'OTROS')
                  return (r === 'POR' || r === 'DEF' || r === 'MED' || r === 'DEL' || r === 'OTROS') ? r : 'OTROS'
                }
                const layoutDe = () => {
                  const ov = ordenLocal[eq.id] || {}
                  const grupos = { POR: [], DEF: [], MED: [], DEL: [], OTROS: [] }
                  alEquipo.filter((j) => alineacionMap[j.id].titular).forEach((j) => {
                    const over = ov[j.id]
                    grupos[over ? over.rol : rolDe(j)].push(j)
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
                  alEquipo.filter((j) => alineacionMap[j.id].titular).forEach((j) => {
                    const r = ov[j.id]?.rol || rolDe(j)
                    filas[r] = filas[r] || []
                    filas[r].push(j.id)
                  })
                  const origen = ov[jugadorId]?.rol || rolDe(alEquipo.find((j) => j.id === jugadorId))
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
                        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>{eq.nombre}</Typography>
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
                                  inputProps={{ min: 0, max: 99 }}
                                  value={form.numero}
                                  onChange={(e) => {
                                    const v = e.target.value.trim()
                                    if (/^\d*$/.test(v)) setForm({ ...form, numero: v })
                                  }}
                                  sx={{ width: 76 }} />
                                <Button size="medium" variant="contained" color="success"
                                  disabled={!form.jugador_id || alinearMut.isPending}
                                  onClick={() => {
                                    const jugador = eq.plantel.find((x) => String(x.id) === form.jugador_id)
                                    if (!jugador) return
                                    if (numeroOcupado(null, form.numero)) {
                                      toast.show(`El número ${form.numero} ya está siendo usado en este equipo`, 'error')
                                      return
                                    }
                                    const n = form.numero === '' ? null : Number(form.numero)
                                    const body = { jugadorId: jugador.id, titular: titulares < MAX_TITULARES }
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
                                      <Tooltip title={`${j.nombre} · camiseta ${numCamiseta(j, al)} · ${POSICION_LABEL[j.posicion] || 'Sin posición'}`}>
                                        <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: colorRol[rol], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>
                                          {numCamiseta(j, al)}
                                        </Box>
                                      </Tooltip>
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
                                {alEquipo.map((j, i) => {
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
                  <Typography variant="h6" fontWeight={700} mb={2}>Resumen del partido</Typography>
                  {loadingEventos ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                  ) : !eventos || eventos.length === 0 ? (
                    <Alert severity="info">No hay acciones registradas en este partido.</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      {[...eventos]
                        .sort((a, b) => a.minuto - b.minuto)
                        .map((ev) => {
                          const estilo = ESTILO_EVENTO[ev.tipo] || ESTILO_EVENTO.GOL
                          const sala = ev.jugador_sale_id ? nombreDe(ev.jugador_sale_id, ev.equipo_id) : null
                          const entra = ev.jugador_id ? nombreDe(ev.jugador_id, ev.equipo_id) : null
                          const primary = ev.tipo === 'CAMBIO'
                            ? `${sala || '?'} ↔ ${entra || '?'}`
                            : (ev.jugador_id ? entra : 'Sin jugador asociado')
                          return (
                            <Box key={ev.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
                              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: estilo.bg, border: `2px solid ${estilo.border}`, color: estilo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {estilo.icon}
                              </Box>
                              <Box sx={{ flex: 1, bgcolor: estilo.bg, border: `1px solid ${estilo.border}`, borderRadius: 2, p: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={700}>{primary}</Typography>
                                  <Typography variant="caption" color="text.secondary">{TIPO_LABEL[ev.tipo] || ev.tipo} · {eqName(ev.equipo_id)}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                  <Chip label={`${ev.minuto}'`} size="small" variant="outlined"
                                    sx={{ borderColor: estilo.border, bgcolor: '#fff', color: estilo.color, fontWeight: 700 }} />
                                  {editable && (
                                    <IconButton edge="end" size="small" color="error" onClick={() => { if (window.confirm('¿Eliminar esta acción?')) borrarEventoMut.mutate(ev.id) }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </Box>
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
                  <Typography variant="h6" fontWeight={700} mb={2}>Cambios realizados</Typography>
                  {loadingEventos ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                  ) : !eventos || eventos.filter((e) => e.tipo === 'CAMBIO').length === 0 ? (
                    <Alert severity="info">No hay cambios registrados aún.</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {eventos
                        .filter((e) => e.tipo === 'CAMBIO')
                        .sort((a, b) => a.minuto - b.minuto)
                        .map((ev) => {
                          const sala = ev.jugador_sale_id ? nombreDe(ev.jugador_sale_id, ev.equipo_id) : '?'
                          const entra = ev.jugador_id ? nombreDe(ev.jugador_id, ev.equipo_id) : '?'
                          return (
                            <Box key={ev.id} sx={{ bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', p: 1.25 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">{eqName(ev.equipo_id)}</Typography>
                                <Chip label={`Min ${ev.minuto}'`} size="small" variant="outlined" />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#fff', borderRadius: 1, border: '1px solid #fee2e2', color: '#b91c1c', px: 1, py: 0.75, minWidth: 0 }}>
                                  <ArrowDownwardIcon fontSize="small" />
                                  <Typography variant="body2" fontWeight={600} noWrap>Sale: {sala}</Typography>
                                </Box>
                                <Typography color="text.secondary" sx={{ fontSize: 14, flexShrink: 0 }}>→</Typography>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#fff', borderRadius: 1, border: '1px solid #bbf7d0', color: '#15803d', px: 1, py: 0.75, minWidth: 0 }}>
                                  <ArrowUpwardIcon fontSize="small" />
                                  <Typography variant="body2" fontWeight={600} noWrap>Entra: {entra}</Typography>
                                </Box>
                              </Box>
                            </Box>
                          )
                        })}
                    </Box>
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
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 1, justifyContent: 'center' }}>
                  {convocadosDe(accForm.equipo_id).map((j) => {
                    const pal = COLORES_ACCION[accion] || COLORES_ACCION.GOL
                    return (
                      <JugadorBtn key={j.id} num={numCamiseta(j, alineacionMap[j.id])} nombre={j.nombre}
                        base={pal.base} sel={pal.sel} seleccionado={false}
                        onClick={() => registrarRapido(j.id)} />
                    )
                  })}
                </Box>
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
    </Box>
  )
}