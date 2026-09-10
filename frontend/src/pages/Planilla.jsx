import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
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
import {
  Add as AddIcon, Remove as RemoveIcon, Check as CheckIcon,
  SportsSoccer as GolIcon, Square as YellowCardIcon,
  Block as RedCardIcon, Flag as AutogolIcon, Delete as DeleteIcon,
  SwapHoriz as SwapIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Replay as ReplayIcon,
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

const TIPO_EVENTO_META = {
  GOL: { color: 'primary', icon: <GolIcon /> },
  AUTOGOL: { color: 'secondary', icon: <AutogolIcon /> },
  TARJETA_AMARILLA: { color: 'warning', icon: <YellowCardIcon /> },
  TARJETA_ROJA: { color: 'error', icon: <RedCardIcon /> },
  CAMBIO: { color: 'info', icon: <SwapIcon /> },
}

const TIPO_LABEL = {
  GOL: 'Gol', AUTOGOL: 'Autogol',
  TARJETA_AMARILLA: 'Tarjeta amarilla', TARJETA_ROJA: 'Tarjeta roja',
  CAMBIO: 'Cambio',
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
  const [selId, setSelId] = useState('')
  const [marcador, setMarcador] = useState({ local: 0, visitante: 0 })
  const [accion, setAccion] = useState(null)
  const [accForm, setAccForm] = useState({ equipo_id: '', jugador_id: '', jugador_sale_id: '', minuto: 45 })
  const [crono, setCrono] = useState({ seg: 0, running: false })
  const [formEquipo, setFormEquipo] = useState({})
  const [vistaEquipo, setVistaEquipo] = useState({})
  const [ordenLocal, setOrdenLocal] = useState({})
  const [hoverKey, setHoverKey] = useState('')
  const dragJugador = useRef({ eqId: null, jugadorId: null, rol: '' })

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
      const pendiente = partidos.find((p) => p.resultado === 'PENDIENTE')
      setSelId(String((pendiente || partidos[0]).id))
    }
  }, [partidos, selId])

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

  const marcadorMut = useMutation({
    mutationFn: ({ id, body }) => apiPost(`/partidos/${id}/marcador`, body),
    onSuccess: (data) => { setMarcador({ local: data.goles_local, visitante: data.goles_visitante }) },
    onError: (e) => toast.show(e.message, 'error'),
  })

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

  const half = crono.seg <= 2700 ? 1 : 2
  const minutoCrono = () => (half === 1
    ? Math.max(1, Math.ceil(crono.seg / 60))
    : 45 + Math.max(1, Math.ceil((crono.seg - 2700) / 60)))

  const abrirAccion = (tipo, equipoId) => {
    setAccForm({ equipo_id: String(equipoId), jugador_id: '', jugador_sale_id: '', minuto: minutoCrono() })
    setAccion(tipo)
  }

  const registrarAccion = (e) => {
    e.preventDefault()
    const tipo = accion
    const body = {
      partido_id: Number(selId),
      tipo,
      equipo_id: Number(accForm.equipo_id),
      minuto: Number(accForm.minuto) || 0,
    }
    if (tipo === 'CAMBIO') {
      if (!accForm.jugador_id || !accForm.jugador_sale_id) {
        toast.show('Selecciona el jugador que sale y el que entra', 'error')
        return
      }
      if (accForm.jugador_id === accForm.jugador_sale_id) {
        toast.show('El jugador que sale y el que entra deben ser distintos', 'error')
        return
      }
      body.jugador_id = Number(accForm.jugador_id)
      body.jugador_sale_id = Number(accForm.jugador_sale_id)
    } else {
      if (tipo !== 'GOL' && tipo !== 'TARJETA_AMARILLA' && tipo !== 'TARJETA_ROJA' && tipo !== 'AUTOGOL') return
      body.jugador_id = accForm.jugador_id ? Number(accForm.jugador_id) : null
    }
    eventoMut.mutate(body)
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para planillar partidos.</Alert>
  if (loadingPartidos) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Planilla</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Registra minuto a minuto las acciones del partido.
      </Typography>

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
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Jornada ${partido.jornada}`} size="small" />
                  {partido.fecha_programada && (
                    <Chip label={new Date(partido.fecha_programada).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} size="small" variant="outlined" />
                  )}
                </Box>
                <Chip label={label} color={color} size="small" />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>{eqName(partido.equipo_local_id)}</Typography>
                  {editable && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                      <IconButton size="small" onClick={() => marcadorMut.mutate({ id: partido.id, body: { goles_local: Math.max(0, marcador.local - 1), goles_visitante: marcador.visitante } })}><RemoveIcon /></IconButton>
                      <IconButton size="small" onClick={() => marcadorMut.mutate({ id: partido.id, body: { goles_local: marcador.local + 1, goles_visitante: marcador.visitante } })}><AddIcon /></IconButton>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ px: 4, py: 1, borderRadius: 2, bgcolor: 'grey.100', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Typography variant="h4" fontWeight={800}>
                      {marcador.local} <Typography component="span" color="text.secondary" fontWeight={400}>–</Typography> {marcador.visitante}
                    </Typography>
                  </Box>
                  {editable && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" color={half === 1 ? 'primary' : 'info'}
                        label={`Tiempo: ${fmtTiempo(crono.seg)} · ${half === 1 ? '1T' : '2T'}`} />
                      <Tooltip title={crono.running ? 'Pausar' : 'Iniciar'}>
                        <IconButton size="small" onClick={() => setCrono((c) => ({ ...c, running: !c.running }))}>
                          {crono.running ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reiniciar cronómetro">
                        <IconButton size="small" color="error" onClick={() => setCrono({ seg: 0, running: false })}>
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>{eqName(partido.equipo_visitante_id)}</Typography>
                  {editable && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 1 }}>
                      <IconButton size="small" onClick={() => marcadorMut.mutate({ id: partido.id, body: { goles_local: marcador.local, goles_visitante: Math.max(0, marcador.visitante - 1) } })}><RemoveIcon /></IconButton>
                      <IconButton size="small" onClick={() => marcadorMut.mutate({ id: partido.id, body: { goles_local: marcador.local, goles_visitante: marcador.visitante + 1 } })}><AddIcon /></IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
            {editable && (
              <>
                <Divider />
                <CardActions sx={{ px: 2, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { tipo: 'GOL', id: partido.equipo_local_id, label: 'Gol local', color: 'success' },
                    { tipo: 'GOL', id: partido.equipo_visitante_id, label: 'Gol visitante', color: 'success' },
                    { tipo: 'AUTOGOL', id: partido.equipo_local_id, label: 'Autogol local', color: 'secondary' },
                    { tipo: 'AUTOGOL', id: partido.equipo_visitante_id, label: 'Autogol visitante', color: 'secondary' },
                    { tipo: 'TARJETA_AMARILLA', id: partido.equipo_local_id, label: 'Amarilla local', color: 'warning' },
                    { tipo: 'TARJETA_AMARILLA', id: partido.equipo_visitante_id, label: 'Amarilla visitante', color: 'warning' },
                    { tipo: 'TARJETA_ROJA', id: partido.equipo_local_id, label: 'Roja local', color: 'error' },
                    { tipo: 'TARJETA_ROJA', id: partido.equipo_visitante_id, label: 'Roja visitante', color: 'error' },
                    { tipo: 'CAMBIO', id: partido.equipo_local_id, label: 'Cambio local', color: 'info' },
                    { tipo: 'CAMBIO', id: partido.equipo_visitante_id, label: 'Cambio visitante', color: 'info' },
                  ].map((b) => (
                    <Tooltip key={`${b.tipo}-${b.id}`} title={b.label}>
                      <Button size="small" variant="outlined" color={b.color}
                        startIcon={TIPO_ACCION[b.tipo].icon}
                        onClick={() => abrirAccion(b.tipo, b.id)}>
                        {b.label}
                      </Button>
                    </Tooltip>
                  ))}
                </CardActions>
                <Divider />
                <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'flex-end' }}>
                  <Button variant="contained" color="success" startIcon={<CheckIcon />}
                    disabled={finalizarMut.isPending}
                    onClick={() => {
                      if (window.confirm('¿Finalizar el partido y guardar el resultado?')) {
                        finalizarMut.mutate({ id: partido.id, body: { goles_local: marcador.local, goles_visitante: marcador.visitante } })
                      }
                    }}>
                    Finalizar partido
                  </Button>
                </CardActions>
              </>
            )}
            {!editable && (
              <CardActions sx={{ px: 2, py: 1.5 }}>
                <Alert severity="info" sx={{ width: '100%' }}>Este partido ya fue jugado. Solo lectura.</Alert>
              </CardActions>
            )}
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
                                    const body = { jugadorId: jugador.id, titular: true }
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

          <Box>
            <Typography variant="h6" fontWeight={700} mb={1}>Acciones registradas</Typography>
            {loadingEventos ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            ) : !eventos || eventos.length === 0 ? (
              <Alert severity="info">No hay acciones registradas en este partido.</Alert>
            ) : (
              <Card elevation={0} variant="outlined">
                <List dense>
                  {[...eventos]
                    .sort((a, b) => a.minuto - b.minuto)
                    .map((ev, i) => {
                      const meta = TIPO_EVENTO_META[ev.tipo] || TIPO_EVENTO_META.GOL
                      const sala = ev.jugador_sale_id ? nombreDe(ev.jugador_sale_id, ev.equipo_id) : null
                      const entra = ev.jugador_id ? nombreDe(ev.jugador_id, ev.equipo_id) : null
                      const primary = ev.tipo === 'CAMBIO'
                        ? `${sala || '?'} ↔ ${entra || '?'}`
                        : (ev.jugador_id ? entra : 'Sin jugador asociado')
                      return (
                        <Box key={ev.id}>
                          {i > 0 && <Divider component="li" />}
                          <ListItem
                            secondaryAction={editable && (
                              <IconButton edge="end" size="small" color="error" onClick={() => { if (window.confirm('¿Eliminar esta acción?')) borrarEventoMut.mutate(ev.id) }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          >
                            <Box sx={{ color: `${meta.color}.main`, display: 'flex', mr: 1.5 }}>{meta.icon}</Box>
                            <Chip label={`${ev.minuto}'`} size="small" variant="outlined" sx={{ mr: 1.5 }} />
                            <ListItemText
                              primary={primary}
                              secondary={`${TIPO_LABEL[ev.tipo] || ev.tipo}${ev.tipo === 'CAMBIO' ? ' (sale ↔ entra)' : ''} · ${eqName(ev.equipo_id)}`}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        </Box>
                      )
                    })}
                </List>
              </Card>
            )}
          </Box>
        </Box>
      )}

      <Dialog open={!!accion} onClose={() => setAccion(null)} fullWidth maxWidth="xs">
        <form onSubmit={registrarAccion}>
          <DialogTitle>
            Registrar {accion ? TIPO_ACCION[accion]?.label : ''}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Equipo</InputLabel>
              <Select label="Equipo" value={accForm.equipo_id}
                onChange={(e) => setAccForm({ ...accForm, equipo_id: e.target.value, jugador_id: '', jugador_sale_id: '' })}>
                <MenuItem value={String(partido?.equipo_local_id)}>{partido ? eqName(partido.equipo_local_id) : ''}</MenuItem>
                <MenuItem value={String(partido?.equipo_visitante_id)}>{partido ? eqName(partido.equipo_visitante_id) : ''}</MenuItem>
              </Select>
            </FormControl>
            {accion === 'CAMBIO' ? (
              <>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Jugador que sale</InputLabel>
                  <Select label="Jugador que sale" value={accForm.jugador_sale_id} required
                    onChange={(e) => setAccForm({ ...accForm, jugador_sale_id: e.target.value })}>
                    {convocadosDe(accForm.equipo_id).map((j) => (
                      <MenuItem key={j.id} value={String(j.id)}>
                        #{numCamiseta(j, alineacionMap[j.id])} {j.nombre} {alineacionMap[j.id].titular ? '(T)' : '(S)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel>Jugador que entra</InputLabel>
                  <Select label="Jugador que entra" value={accForm.jugador_id} required
                    onChange={(e) => setAccForm({ ...accForm, jugador_id: e.target.value })}>
                    {convocadosDe(accForm.equipo_id).map((j) => (
                      <MenuItem key={j.id} value={String(j.id)}>
                        #{numCamiseta(j, alineacionMap[j.id])} {j.nombre} {alineacionMap[j.id].titular ? '(T)' : '(S)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Jugador (solo convocados)</InputLabel>
                <Select label="Jugador (solo convocados)" value={accForm.jugador_id}
                  onChange={(e) => setAccForm({ ...accForm, jugador_id: e.target.value })}>
                  <MenuItem value=""><em>Sin jugador</em></MenuItem>
                  {convocadosDe(accForm.equipo_id).map((j) => (
                    <MenuItem key={j.id} value={String(j.id)}>
                      #{numCamiseta(j, alineacionMap[j.id])} {j.nombre} {alineacionMap[j.id].titular ? '(T)' : '(S)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {convocadosDe(accForm.equipo_id).length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>Este equipo no tiene jugadores convocados en la alineación.</Alert>
            )}
            <TextField label="Minuto" type="number" fullWidth margin="normal" size="small"
              inputProps={{ min: 0, max: 120 }} required
              value={accForm.minuto}
              onChange={(e) => setAccForm({ ...accForm, minuto: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAccion(null)}>Cancelar</Button>
            <Button type="submit" variant="contained" color={accion ? TIPO_ACCION[accion]?.color : 'primary'} disabled={eventoMut.isPending}>
              {eventoMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Registrar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}