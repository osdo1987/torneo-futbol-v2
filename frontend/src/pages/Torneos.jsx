import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import { alpha } from '@mui/material'
import {
  Add as AddIcon,
  Badge as BadgeIcon,
  Balance as BalanceIcon,
  Block as BlockIcon,
  Bolt as BoltIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  CheckCircle as CheckCircleIcon,
  DeleteForever as DeleteForeverIcon,
  EmojiEvents as EmojiEventsIcon,
  EventAvailable as EventAvailableIcon,
  Flag as FlagIcon,
  Gavel as GavelIcon,
  Groups as GroupsIcon,
  HowToReg as HowToRegIcon,
  Leaderboard as LeaderboardIcon,
  Lock as LockIcon,
  MilitaryTech as MilitaryTechIcon,
  PlayArrow as PlayArrowIcon,
  PlayCircle as PlayCircleIcon,
  Search as SearchIcon,
  Shuffle as ShuffleIcon,
  SportsSoccer as SportsSoccerIcon,
} from '@mui/icons-material'
import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import { useToast } from '../components/Toast'

const ESTADO_META = {
  CREADO: {
    label: 'Creado', eyebrow: 'Torneo Oficial', icon: EmojiEventsIcon,
    accent: '#8b8fa3', chipBg: '#eef0f6', chipColor: '#52525b', dot: null,
  },
  INSCRIPCIONES_ABIERTAS: {
    label: 'Inscripciones', eyebrow: 'Convocatoria Abierta', icon: BoltIcon,
    accent: '#006591', chipBg: 'rgba(0,101,145,0.12)', chipColor: '#004c6e', dot: '#006591',
  },
  INSCRIPCIONES_CERRADAS: {
    label: 'Cerradas', eyebrow: 'Convocatoria Cerrada', icon: LockIcon,
    accent: '#b45309', chipBg: 'rgba(180,83,9,0.12)', chipColor: '#92400e', dot: null,
  },
  SORTEADO: {
    label: 'Sorteado', eyebrow: 'Fixture Listo', icon: ShuffleIcon,
    accent: '#0ea5e9', chipBg: 'rgba(14,165,233,0.12)', chipColor: '#0369a1', dot: null,
  },
  EN_JUEGO: {
    label: 'En Juego', eyebrow: 'Fase Regular', icon: SportsSoccerIcon,
    accent: '#0c56d0', chipBg: 'rgba(0,78,51,0.12)', chipColor: '#004e33', dot: '#004e33',
  },
  FINALIZADO: {
    label: 'Finalizado', eyebrow: 'Ciclo Completado', icon: FlagIcon,
    accent: '#8b8fa3', chipBg: '#eef0f6', chipColor: '#52525b', dot: null,
  },
}

const FORMATO_LABEL = { ROUND_ROBIN: 'Todos Contra Todos', ELIMINATORIA: 'Eliminación Directa' }

const TRANSICIONES = {
  CREADO: [{ to: 'INSCRIPCIONES_ABIERTAS', label: 'Abrir Inscripciones', icon: HowToRegIcon }],
  INSCRIPCIONES_ABIERTAS: [{ to: 'INSCRIPCIONES_CERRADAS', label: 'Cerrar Cupos', icon: BlockIcon }],
  INSCRIPCIONES_CERRADAS: [
    { to: 'SORTEADO', label: 'Realizar Sorteo', icon: ShuffleIcon },
    { to: 'INSCRIPCIONES_ABIERTAS', label: 'Reabrir', icon: BoltIcon },
  ],
  SORTEADO: [{ to: 'EN_JUEGO', label: 'Iniciar Torneo', icon: PlayArrowIcon }],
  EN_JUEGO: [{ to: 'FINALIZADO', label: 'Finalizar Torneo', icon: FlagIcon }],
}

const emptyForm = { nombre: '', max_jugadores_por_equipo: 18, puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0, formato_tipo: 'ROUND_ROBIN' }

const DESEMPATES_DISPONIBLES = ['DIF_GOL', 'GOLES_FAVOR', 'MENOS_AMARILLAS', 'MENOS_ROJAS', 'GOLES_CONTRA']
const DESEMPATE_LABELS = {
  DIF_GOL: 'Diferencia de goles',
  GOLES_FAVOR: 'Goles a favor',
  MENOS_AMARILLAS: 'Menos tarjetas amarillas',
  MENOS_ROJAS: 'Menos tarjetas rojas',
  GOLES_CONTRA: 'Menos goles en contra',
}

const toForm = (r) => {
  const x = r || {}
  return {
    formato_tipo: x.formato_tipo ?? 'ROUND_ROBIN',
    rondas: x.rondas ?? 1,
    clasifican_a_final: x.clasifican_a_final ?? '',
    desempates: x.desempates ?? [...DESEMPATES_DISPONIBLES],
    edad_min: x.edad_min ?? '',
    edad_max: x.edad_max ?? '',
    max_jugadores: x.max_jugadores ?? '',
    bloquear_baja_tras_jugar: x.bloquear_baja_tras_jugar ?? false,
    comodines_cantidad: x.comodines_cantidad ?? 0,
    comodines_edad_min: x.comodines_edad_min ?? 30,
    tolerancia_w_min: x.tolerancia_w_min ?? 10,
    marcador_w: x.marcador_w ?? 3,
    fechas_doble_amarilla: x.fechas_doble_amarilla ?? 1,
    fechas_roja_directa: x.fechas_roja_directa ?? 2,
  }
}

const initials = (name) => String(name || '?')
  .split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

function Pill({ bg, color, sx, children }) {
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: 0.4, borderRadius: 99, fontSize: 11, fontWeight: 700, lineHeight: 1.2,
      bgcolor: bg, color, whiteSpace: 'nowrap', ...sx,
    }}>
      {children}
    </Box>
  )
}

function ReglasDialog({ torneo, onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(toForm(torneo.reglas))

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const saveMut = useMutation({
    mutationFn: (body) => apiPut(`/torneos/${torneo.id}/reglas`, body),
    onSuccess: () => { qc.invalidateQueries(['torneos']); toast.show('Reglamento guardado', 'success'); onClose() },
    onError: (e) => toast.show(typeof e.message === 'string' ? e.message : 'Error de validación del reglamento', 'error'),
  })

  const mover = (i, dir) => {
    const arr = [...form.desempates]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setForm({ ...form, desempates: arr })
  }

  const handleSave = (e) => {
    e.preventDefault()
    saveMut.mutate({
      formato_tipo: form.formato_tipo,
      rondas: Number(form.rondas),
      clasifican_a_final: form.clasifican_a_final === '' ? null : Number(form.clasifican_a_final),
      desempates: form.desempates,
      edad_min: form.edad_min === '' ? null : Number(form.edad_min),
      edad_max: form.edad_max === '' ? null : Number(form.edad_max),
      max_jugadores: form.max_jugadores === '' ? null : Number(form.max_jugadores),
      bloquear_baja_tras_jugar: !!form.bloquear_baja_tras_jugar,
      comodines_cantidad: Number(form.comodines_cantidad),
      comodines_edad_min: form.comodines_edad_min === '' ? null : Number(form.comodines_edad_min),
      tolerancia_w_min: Number(form.tolerancia_w_min),
      marcador_w: Number(form.marcador_w),
      fechas_doble_amarilla: Number(form.fechas_doble_amarilla),
      fechas_roja_directa: Number(form.fechas_roja_directa),
    })
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSave}>
        <DialogTitle>Reglamento — {torneo.nombre}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Formato</InputLabel>
              <Select value={form.formato_tipo} label="Formato" onChange={set('formato_tipo')}>
                <MenuItem value="ROUND_ROBIN">Todos contra todos</MenuItem>
                <MenuItem value="ELIMINATORIA">Eliminatoria</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Rondas</InputLabel>
              <Select value={form.rondas} label="Rondas" onChange={(e) => setForm({ ...form, rondas: Number(e.target.value) })}>
                <MenuItem value={1}>Una ronda (ida)</MenuItem>
                <MenuItem value={2}>Ida y vuelta (2)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Clasifican a final" type="number" fullWidth
              value={form.clasifican_a_final} onChange={set('clasifican_a_final')} />
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Criterios de desempate (en orden)</Typography>
          {form.desempates.map((c, i) => (
            <Box key={c} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ width: 24 }}>{i + 1}.</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{DESEMPATE_LABELS[c]}</Typography>
              <Button size="small" variant="outlined" disabled={i === 0} onClick={() => mover(i, -1)}>↑</Button>
              <Button size="small" variant="outlined" disabled={i === form.desempates.length - 1} onClick={() => mover(i, 1)}>↓</Button>
            </Box>
          ))}

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Categoría (edades)</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Edad mínima" type="number" fullWidth
              value={form.edad_min} onChange={set('edad_min')} />
            <TextField label="Edad máxima" type="number" fullWidth
              value={form.edad_max} onChange={set('edad_max')} />
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Plantilla</Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField label="Máx. jugadores" type="number" fullWidth
              value={form.max_jugadores} onChange={set('max_jugadores')} />
            <TextField label="Comodines (cantidad)" type="number" fullWidth
              value={form.comodines_cantidad} onChange={(e) => setForm({ ...form, comodines_cantidad: Number(e.target.value) })} />
            <TextField label="Edad mín. comodín" type="number" fullWidth
              value={form.comodines_edad_min} onChange={set('comodines_edad_min')} />
          </Box>
          <FormControlLabel
            control={<Checkbox checked={!!form.bloquear_baja_tras_jugar} onChange={(e) => setForm({ ...form, bloquear_baja_tras_jugar: e.target.checked })} />}
            label="No permitir dar de baja a un jugador que ya disputó un partido"
            sx={{ mt: 1 }}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Inasistencia (W) y sanciones</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Tolerancia W (min)" type="number" fullWidth
              value={form.tolerancia_w_min} onChange={(e) => setForm({ ...form, tolerancia_w_min: Number(e.target.value) })} />
            <TextField label="Marcador por W" type="number" fullWidth
              value={form.marcador_w} onChange={(e) => setForm({ ...form, marcador_w: Number(e.target.value) })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField label="Fechas sanción doble amarilla" type="number" fullWidth
              value={form.fechas_doble_amarilla} onChange={(e) => setForm({ ...form, fechas_doble_amarilla: Number(e.target.value) })} />
            <TextField label="Fechas sanción roja directa" type="number" fullWidth
              value={form.fechas_roja_directa} onChange={(e) => setForm({ ...form, fechas_roja_directa: Number(e.target.value) })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saveMut.isPending}>
            {saveMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar reglamento'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function MetricTile({ label, value, color, icon: Icon, bg }) {
  return (
    <Card elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', display: 'block' }}>{label}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1.1, mt: 0.5 }}>{value}</Typography>
      </Box>
      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 22 }} />
      </Box>
    </Card>
  )
}

function TorneoCard({ t, resumen, equipos, selected, onSelect, onOpenReglas, muts }) {
  const meta = ESTADO_META[t.estado] || ESTADO_META.CREADO
  const Icon = meta.icon
  const formato = FORMATO_LABEL[t.reglas?.formato_tipo] || FORMATO_LABEL.ROUND_ROBIN
  const clubes = resumen?.equipos ?? equipos?.length ?? 0
  const partidos = resumen?.partidos ?? 0
  const jugados = resumen?.partidos_jugados ?? 0
  const pct = partidos ? Math.round((jugados / partidos) * 100) : 0
  const conIncripcionesAbiertas = ['CREADO', 'INSCRIPCIONES_ABIERTAS'].includes(t.estado)

  const trans = TRANSICIONES[t.estado] || []
  const puedeFixture = t.reglas?.formato_tipo !== 'ELIMINATORIA' && ['INSCRIPCIONES_CERRADAS', 'SORTEADO', 'EN_JUEGO'].includes(t.estado)
  const puedeFaseFinal = t.reglas?.formato_tipo !== 'ELIMINATORIA' && t.estado === 'EN_JUEGO'

  const acciones = []
  if (puedeFaseFinal) acciones.push({ key: 'fasefinal', label: 'Fase Final', icon: MilitaryTechIcon, primary: true, onClick: (e) => { e.stopPropagation(); muts.finalMut.mutate(t.id) }, disabled: muts.finalMut.isPending })
  if (puedeFixture) acciones.push({ key: 'fixture', label: 'Generar Fixture', icon: CalendarViewWeekIcon, primary: false, onClick: (e) => { e.stopPropagation(); muts.fixtureMut.mutate(t.id) }, disabled: muts.fixtureMut.isPending })
  if (t.estado === 'FINALIZADO') acciones.push({ key: 'tabla', label: 'Ver Tabla Final', icon: LeaderboardIcon, primary: false, onClick: (e) => { e.stopPropagation(); onSelect(String(t.id)); muts.onTable() } })

  trans.forEach((tr, i) => {
    acciones.push({
      key: tr.to, label: tr.label, icon: tr.icon || PlayArrowIcon,
      primary: acciones.length === 0,
      warn: tr.to === 'INSCRIPCIONES_ABIERTAS',
      action: 'estado',
      onClick: (e) => { e.stopPropagation(); muts.estadoMut.mutate({ id: t.id, estado: tr.to }) },
      disabled: muts.estadoMut.isPending,
      pos: i,
    })
  })

  const slots = acciones.slice(0, 2)

  return (
    <Card
      elevation={0}
      onClick={() => onSelect(String(t.id))}
      sx={{
        position: 'relative', borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
        bgcolor: 'background.paper', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: selected ? '0 12px 28px -8px rgba(12,86,208,0.22), 0 4px 10px -4px rgba(15,23,42,0.08)' : '0 1px 3px rgba(0,0,0,0.06)',
        '&:hover': { boxShadow: '0 12px 28px -8px rgba(12,86,208,0.18), 0 4px 10px -4px rgba(15,23,42,0.10)' },
        border: '1px solid', borderColor: selected ? 'rgba(12,86,208,0.35)' : 'divider',
        transition: 'all 0.2s ease',
      }}
    >
      <Box sx={{ height: 6, bgcolor: meta.accent, width: '100%' }} />
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: alpha(meta.accent, 0.1), color: meta.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon sx={{ fontSize: 26 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, color: meta.accent, display: 'block' }}>{meta.eyebrow} • {formato}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em', mt: 0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.nombre}
              </Typography>
            </Box>
          </Box>
          <Pill bg={meta.chipBg} color={meta.chipColor} sx={{ py: 0.7 }}>
            {meta.dot && <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: meta.dot, animation: 'torneoPulse 1.6s ease-in-out infinite' }} />}
            {meta.label}
          </Pill>
        </Box>

        {/* Progreso contextual */}
        <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t.estado === 'EN_JUEGO' || t.estado === 'SORTEADO' ? 'Partidos jugados' : 'Cupos de equipos'}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: meta.accent }}>
              {t.estado === 'EN_JUEGO' || t.estado === 'SORTEADO' ? `${jugados} de ${partidos}` : `${clubes} inscritos`}
            </Typography>
          </Box>
          {t.estado === 'EN_JUEGO' || t.estado === 'SORTEADO' ? (
            <Box sx={{ height: 8, bgcolor: alpha(meta.accent, 0.12), borderRadius: 4, overflow: 'hidden' }}>
              <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, color: meta.accent, bgcolor: 'transparent', '.MuiLinearProgress-bar': { transition: 'width 0.5s ease' } }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ display: 'flex', pl: 0.5 }}>
                {(equipos || []).slice(0, 4).map((e) => (
                  <Avatar key={String(e.id)} sx={{ width: 22, height: 22, fontSize: 9, fontWeight: 800, border: '2px solid', borderColor: 'background.default', bgcolor: alpha(meta.accent, 0.9), color: '#fff', ml: -0.75, '&:first-of-type': { ml: 0 } }}>
                    {initials(e.nombre)}
                  </Avatar>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap>
                {conIncripcionesAbiertas
                  ? (t.estado === 'CREADO' ? 'Inscripciones por abrir' : t.inscripciones_jugadores_abiertas ? 'Altas de jugadores habilitadas' : 'Inscripciones abiertas')
                  : t.estado === 'INSCRIPCIONES_CERRADAS' ? 'Convocatoria cerrada, listo para sorteo' : 'Fixture generado'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Specs */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, bgcolor: 'background.default', borderRadius: 1.5, p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <BadgeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Máx. Jugadores</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.max_jugadores_por_equipo} por nómina
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <CheckCircleIcon sx={{ fontSize: 18, color: t.inscripciones_jugadores_abiertas ? 'success.main' : 'error.main' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Estado Altas</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: t.inscripciones_jugadores_abiertas ? 'success.main' : 'error.main', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.inscripciones_jugadores_abiertas ? 'Habilitadas' : 'Cerradas'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, gridColumn: '1 / -1', borderTop: '1px dashed', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Esquema de Puntos:</Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Pill bg="background.paper" color="#0040a2" sx={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>V: {t.puntos_victoria}</Pill>
              <Pill bg="background.paper" color="#52525b" sx={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>E: {t.puntos_empate}</Pill>
              <Pill bg="background.paper" color="#b91c1c" sx={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>D: {t.puntos_derrota}</Pill>
            </Box>
          </Box>
        </Box>

        {/* Snapshot */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, color: 'text.secondary' }}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}>
            <GroupsIcon sx={{ fontSize: 15, color: meta.accent }} /> {clubes} Clubes registrados
          </Box>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}>
            {t.estado === 'FINALIZADO' ? <GavelIcon sx={{ fontSize: 15, color: meta.accent }} /> : <EventAvailableIcon sx={{ fontSize: 15, color: meta.accent }} />}
            {t.estado === 'FINALIZADO' ? `${jugados} Partidos jugados` : `${jugados} / ${partidos} Partidos`}
          </Box>
        </Box>

        {t.estado === 'FINALIZADO' && resumen?.goleador && (
          <Box sx={{ bgcolor: alpha('#0c56d0', 0.07), borderRadius: 1.5, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MilitaryTechIcon sx={{ fontSize: 22, color: '#0c56d0' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Campeón Titular</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resumen.goleador}</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Acciones de ciclo de vida */}
      <Box sx={{ bgcolor: 'background.default', p: 1.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(slots.length > 0 || true) && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {slots.map((a) => (
              <Button
                key={a.key}
                fullWidth
                startIcon={<a.icon sx={{ fontSize: 18 }} />}
                onClick={a.onClick}
                disabled={a.disabled}
                variant={a.primary ? 'contained' : a.action === 'estado' && a.warn ? 'outlined' : 'outlined'}
                color={a.warn ? 'error' : 'primary'}
                sx={{
                  textTransform: 'none', fontWeight: 700, py: 1, borderRadius: 1.5, fontSize: 13,
                  boxShadow: a.primary ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {a.label}
              </Button>
            ))}
            {slots.length === 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <IconButton size="small" title="Reglamento Oficial" onClick={(e) => { e.stopPropagation(); onOpenReglas(t) }}
                  sx={{ color: 'text.secondary', bgcolor: 'background.paper', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', '&:hover': { color: 'primary.main' } }}>
                  <GavelIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {slots.length === 2 ? (
              <IconButton size="small" title="Reglamento Oficial" onClick={(e) => { e.stopPropagation(); onOpenReglas(t) }}
                sx={{ color: 'text.secondary', bgcolor: 'background.paper', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', '&:hover': { color: 'primary.main' } }}>
                <GavelIcon sx={{ fontSize: 18 }} />
              </IconButton>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'inline' } }}>
              {t.reglas?.rondas === 2 ? 'Ida y vuelta' : 'Sistema Liga'} • {formato}
            </Typography>
          </Box>
          <IconButton size="small" title="Eliminar torneo"
            onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar definitivamente el torneo "${t.nombre}" y todo su contenido?`)) muts.deleteMut.mutate(t.id) }}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) } }}>
            <DeleteForeverIcon sx={{ fontSize: 19 }} />
          </IconButton>
        </Box>
      </Box>
    </Card>
  )
}

export default function Torneos({ user, selectedTorneoId, onSelectTorneo }) {
  const qc = useQueryClient()
  const toast = useToast()
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [reglasTorneo, setReglasTorneo] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { data: torneos = [], isLoading, isError, error } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
  })

  const enrich = useQueries({
    queries: torneos.map((t) => [
      { queryKey: ['equipos', t.id], queryFn: () => apiGet(`/equipos?torneo_id=${t.id}`) },
      { queryKey: ['torneos-resumen', t.id], queryFn: () => apiGet(`/panel/${t.id}/resumen`) },
    ]).flat(),
  })

  const equiposByTorneo = useMemo(() => {
    const m = {}
    enrich.forEach((q, i) => {
      if (i % 2 === 0) m[torneos[Math.floor(i / 2)]?.id] = q.data || []
    })
    return m
  }, [enrich, torneos])

  const resumenByTorneo = useMemo(() => {
    const m = {}
    enrich.forEach((q, i) => {
      if (i % 2 === 1) m[torneos[Math.floor(i / 2)]?.id] = q.data
    })
    return m
  }, [enrich, torneos])

  const createMut = useMutation({
    mutationFn: (body) => apiPost('/torneos', body),
    onSuccess: (t) => {
      qc.invalidateQueries(['torneos'])
      qc.invalidateQueries(['resumen'])
      toast.show('Torneo creado', 'success')
      onSelectTorneo(String(t.id))
      setOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const estadoMut = useMutation({
    mutationFn: ({ id, estado }) => apiPost(`/torneos/${id}/estado`, { estado }),
    onSuccess: () => { qc.invalidateQueries(['torneos']); toast.show('Estado actualizado', 'success') },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => apiDelete(`/torneos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['torneos'])
      qc.invalidateQueries(['resumen'])
      toast.show('Torneo eliminado', 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const fixtureMut = useMutation({
    mutationFn: (id) => apiPost(`/torneos/${id}/fixture`, {}),
    onSuccess: (d, id) => {
      qc.invalidateQueries(['partidos'])
      qc.invalidateQueries(['torneos-resumen', id])
      toast.show(`${d.message}: ${d.partidos} partidos en ${d.jornadas} jornadas`, 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const finalMut = useMutation({
    mutationFn: (id) => apiPost(`/torneos/${id}/fase-final`, {}),
    onSuccess: (d, id) => {
      qc.invalidateQueries(['partidos'])
      qc.invalidateQueries(['torneos-resumen', id])
      const cruces = (d.partidos || []).map((p) => `${p.local} vs ${p.visitante}`).join(' | ')
      toast.show(`${d.message}: ${cruces}`, 'success')
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    const { formato_tipo, ...rest } = form
    createMut.mutate({
      ...rest,
      max_jugadores_por_equipo: Number(form.max_jugadores_por_equipo),
      puntos_victoria: Number(form.puntos_victoria),
      puntos_empate: Number(form.puntos_empate),
      puntos_derrota: Number(form.puntos_derrota),
      organizador_id: user?.organizadorId,
      reglas: { formato_tipo },
    })
  }

  const visibles = torneos.filter((t) => {
    const q = String(busqueda || '').toLowerCase().trim()
    if (!q) return true
    return String(t.nombre).toLowerCase().includes(q)
  })

  const activos = torneos.filter((t) => t.estado === 'EN_JUEGO').length
  const convocatoria = torneos.filter((t) => ['CREADO', 'INSCRIPCIONES_ABIERTAS'].includes(t.estado)).length
  const finalizados = torneos.filter((t) => t.estado === 'FINALIZADO').length
  const totalEquipos = torneos.reduce((acc, t) => acc + (resumenByTorneo[t.id]?.equipos ?? 0), 0)

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Pill bg="rgba(12,86,208,0.1)" color="#003d9b">Gestión Operativa</Pill>
              <Typography variant="caption" color="text.secondary">• Liga de Fútbol</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Torneos</Typography>
            <Typography variant="body2" color="text.secondary">Crea formatos, define reglamentos oficiales y comanda el ciclo de vida de la liga.</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
            <Box sx={{
              display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
              bgcolor: 'background.paper', borderRadius: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider',
            }}>
              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <TextField
                inputRef={searchRef}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por nombre..."
                variant="standard"
                size="small"
                sx={{ width: { sm: 160, md: 220 }, '& .MuiInputBase-root:before, & .MuiInputBase-root:after': { border: 'none' } }}
              />
              <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', bgcolor: 'background.default', px: 1, py: 0.4, borderRadius: 1 }}>⌘K</Box>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, height: 44, flex: { xs: '1 1 auto', md: '0 0 auto' } }}>
              Nuevo Torneo
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Metric ribbon */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        <MetricTile label="Activos en Juego" value={activos} color="#005236" bg="rgba(111,251,190,0.35)" icon={PlayCircleIcon} />
        <MetricTile label="En Convocatoria" value={convocatoria} color="#004c6e" bg="rgba(137,206,255,0.4)" icon={HowToRegIcon} />
        <MetricTile label="Finalizados" value={finalizados} color="#52525b" bg="#e5eeff" icon={EmojiEventsIcon} />
        <MetricTile label="Total Planteles" value={totalEquipos} color="#003d9b" bg="#dae2ff" icon={GroupsIcon} />
      </Box>

      {torneos.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>No hay torneos. Crea el primero con «Nuevo Torneo».</Alert>
      )}

      {visibles.length === 0 && torneos.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>Sin resultados para «{busqueda}».</Alert>
      )}

      {/* Cards */}
      <Grid container spacing={2.5}>
        {visibles.map((t) => (
          <Grid item xs={12} sm={6} lg={4} key={t.id}>
            <TorneoCard
              t={t}
              resumen={resumenByTorneo[t.id]}
              equipos={equiposByTorneo[t.id]}
              selected={String(t.id) === String(selectedTorneoId)}
              onSelect={onSelectTorneo}
              onOpenReglas={setReglasTorneo}
              muts={{ estadoMut, deleteMut, fixtureMut, finalMut }}
            />
          </Grid>
        ))}
      </Grid>

      {/* Estatuto banner */}
      <Card elevation={0} sx={{ mt: 2.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider', p: 2.5, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: '#e5eeff', color: '#0c56d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BalanceIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Estatuto y Código Disciplinario General</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Normas de desempate, cómputo de tarjetas amarillas acumulativas y prórroga de partidos suspendidos vigentes para la edición actual.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, width: { xs: '100%', lg: 'auto' }, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => {
              const target = torneos.find((t) => String(t.id) === String(selectedTorneoId)) || torneos[0]
              if (target) setReglasTorneo(target)
              else toast.show('Primero crea un torneo', 'info')
            }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, flex: { xs: '1 1 auto', lg: '0 0 auto' } }}
          >
            Editar Reglamentos Base
          </Button>
        </Box>
      </Card>

      {/* Crear torneo */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#dae2ff', color: '#0c56d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmojiEventsIcon sx={{ fontSize: 22 }} />
            </Box>
            Crear Nuevo Torneo
          </DialogTitle>
          <DialogContent>
            <TextField label="Nombre Oficial del Torneo" placeholder="Ej: Torneo Clausura 2025" fullWidth required margin="normal"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <FormControl fullWidth margin="normal">
              <InputLabel>Sistema de Competencia</InputLabel>
              <Select label="Sistema de Competencia" value={form.formato_tipo} onChange={(e) => setForm({ ...form, formato_tipo: e.target.value })}>
                <MenuItem value="ROUND_ROBIN">Todos contra todos (Liga)</MenuItem>
                <MenuItem value="ELIMINATORIA">Eliminación Directa</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
              <TextField label="Máx. jugadores por equipo" type="number" fullWidth margin="normal"
                value={form.max_jugadores_por_equipo} onChange={(e) => setForm({ ...form, max_jugadores_por_equipo: Number(e.target.value) })} />
            </Box>
            <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, p: 1.5, mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {[
                { k: 'puntos_victoria', label: 'Pts Victoria' },
                { k: 'puntos_empate', label: 'Pts Empate' },
                { k: 'puntos_derrota', label: 'Pts Derrota' },
              ].map((f) => (
                <Box key={f.k}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, textAlign: 'center', mb: 0.5 }}>{f.label}</Typography>
                  <TextField
                    type="number" size="small" value={form[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: Number(e.target.value) })}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' }, '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 700 } }}
                  />
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMut.isPending}>
              {createMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar y Configurar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {reglasTorneo && (
        <ReglasDialog torneo={reglasTorneo} onClose={() => setReglasTorneo(null)} />
      )}
    </Box>
  )
}