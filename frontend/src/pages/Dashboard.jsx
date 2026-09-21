import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Avatar from '@mui/material/Avatar'
import {
  Group as GroupIcon,
  SportsSoccer as SportsSoccerIcon,
  SportsScore as SportsScoreIcon,
  Style as StyleIcon,
  MilitaryTech as MilitaryTechIcon,
  AddCircle as AddCircleIcon,
  GroupAdd as GroupAddIcon,
  Schedule as ScheduleIcon,
  PendingActions as PendingActionsIcon,
  Feed as FeedIcon,
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  AssignmentLate as AssignmentLateIcon,
  PriorityHigh as PriorityHighIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarMonthIcon,
  WbSunny as WbSunnyIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material'
import { alpha, keyframes } from '@mui/material'
import { apiGet } from '../api'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.25; }
  100% { opacity: 1; }
`

const RESULTADOS_JUGADOS = ['LOCAL_GANO', 'VISITANTE_GANO', 'EMPATE', 'W_LOCAL', 'W_VISITANTE']

const ESTADO_BADGE = {
  CREADO: { label: 'Creado', color: 'default' },
  INSCRIPCIONES_ABIERTAS: { label: 'Inscripciones abiertas', color: 'success' },
  INSCRIPCIONES_CERRADAS: { label: 'Inscripciones cerradas', color: 'warning' },
  SORTEADO: { label: 'Sorteado', color: 'info' },
  EN_JUEGO: { label: 'En juego', color: 'primary' },
  FINALIZADO: { label: 'Finalizado', color: 'error' },
}

const RANK_COLORS = ['#d97706', '#94a3b8', '#b45309']

function fmtHora(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

function fmtFecha(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return null
  }
}

function hashColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 997
  const palette = ['#006591', '#006846', '#b45309', '#ba1a1a', '#003d9b', '#004c6e', '#737685']
  return palette[h % palette.length]
}

function initials(name = '?') {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function TeamAvatar({ name, size = 46 }) {
  const color = hashColor(name)
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 2,
        p: '3px',
        flexShrink: 0,
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'),
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 1.5,
          bgcolor: alpha(color, 0.16),
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: size * 0.3,
        }}
      >
        {initials(name)}
      </Box>
    </Box>
  )
}

function MatchCard({ p, st, posLocal, posVisita }) {
  const esVivo = st.key === 'vivo'
  const esFinalizado = st.key === 'fin'
  const esPostergado = st.key === 'post'
  const hora = fmtHora(p.fecha_programada)
  const fecha = fmtFecha(p.fecha_programada)
  const subLocal = posLocal ? `${posLocal.pos}° Posición • ${posLocal.PTS} pts` : 'Local'
  const subVisita = posVisita ? `${posVisita.pos}° Posición • ${posVisita.PTS} pts` : 'Visitante'
  const muestraMarcador = esVivo || esFinalizado

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow .2s ease',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, bgcolor: st.bar }} />

      {/* Meta: hora / fecha / jornada */}
      <Box
        sx={{
          pl: 3.25,
          pr: 2,
          pt: 1.5,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {esVivo ? (
            <Chip
              size="small"
              color="error"
              label={st.label}
              sx={{ height: 22, fontWeight: 800, fontSize: '0.7rem', '& .MuiChip-label': { px: 1 } }}
              icon={<Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff', ml: 1, animation: `${pulse} 1.2s ease-in-out infinite` }} />}
            />
          ) : esPostergado ? (
            <Chip size="small" color="warning" label={st.label} sx={{ height: 22, fontWeight: 800, fontSize: '0.7rem' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.25, borderRadius: 999, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main' }}>
              <ScheduleIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.03em' }}>
                {hora ? `${hora} HS` : 'PENDIENTE'}
              </Typography>
            </Box>
          )}
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>|</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
            <EventIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">{fecha || 'Sin fecha'}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <SportsSoccerIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">{p._jornada != null ? `Jornada ${p._jornada}` : 'Fecha por definir'}</Typography>
        </Box>
      </Box>

      {/* Marcador */}
      <Box
        sx={{
          pl: 3.25,
          px: 2,
          py: 1.5,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ textAlign: 'right', minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.equipo_local}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {subLocal}
            </Typography>
          </Box>
          <TeamAvatar name={p.equipo_local} />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          {muestraMarcador ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.75, py: 0.5, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', fontVariantNumeric: 'tabular-nums', color: esVivo ? 'success.main' : 'text.primary' }}>
                  {p.goles_local}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: 'text.disabled' }}>-</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', fontVariantNumeric: 'tabular-nums', color: esVivo ? 'success.main' : 'text.primary' }}>
                  {p.goles_visitante}
                </Typography>
              </Box>
              {esVivo && (
                <Chip
                  size="small"
                  color="success"
                  label={st.minute}
                  sx={{ height: 18, fontWeight: 800, fontSize: '0.62rem', '& .MuiChip-label': { px: 0.75 } }}
                />
              )}
            </>
          ) : (
            <Box sx={{ px: 1.75, py: 0.75, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'text.secondary' }}>VS</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.5, minWidth: 0 }}>
          <TeamAvatar name={p.equipo_visitante} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.equipo_visitante}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {subVisita}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Acciones */}
      <Box
        sx={{
          pl: 3.25,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
          {esFinalizado && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />}
          <Typography variant="caption">
            {esFinalizado ? 'Resultado registrado' : esVivo ? 'Partido en curso' : 'Esperando inicio'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" component={Link} to={`/planilla?partido=${p.id}`} startIcon={<FeedIcon sx={{ fontSize: 16 }} />}>
            Planilla
          </Button>
          {!esFinalizado && (
            <Button size="small" component={Link} to="/partidos" startIcon={<PendingActionsIcon sx={{ fontSize: 16 }} />}>
              Gestionar
            </Button>
          )}
        </Box>
      </Box>
    </Card>
  )
}

function SectionCardHeader({ icon, tone = 'primary', title, action }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette[tone]?.main ?? t.palette.primary.main, 0.05),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette[tone]?.main ?? t.palette.primary.main, 0.14),
            color: (t) => t.palette[tone]?.main ?? 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
      </Box>
      {action}
    </Box>
  )
}

// Tareas de ejemplo para el widget de operaciones pendientes (diseno placeholder)
const TAREAS_DEMO = [
  {
    icon: <PriorityHighIcon sx={{ fontSize: 20 }} />,
    color: 'error.main',
    title: '2 planillas por firmar',
    tag: 'Urgente',
    tagColor: 'error.main',
    desc: 'Validación del juez en Cancha 3 y Cancha 1.',
    cta: 'Ir a Planillas',
    to: '/planilla',
  },
  {
    icon: <BadgeIcon sx={{ fontSize: 20 }} />,
    color: 'secondary.main',
    title: '1 revisión de carnet',
    tag: 'Hoy',
    tagColor: 'text.secondary',
    desc: 'Ficha médica y habilitación de jugadores.',
    cta: 'Revisar Doc',
    to: '/equipos',
  },
  {
    icon: <CalendarMonthIcon sx={{ fontSize: 20 }} />,
    color: 'success.main',
    title: 'Publicar próxima fecha',
    tag: 'Mañana',
    tagColor: 'text.secondary',
    desc: 'Fixture tentativo listo para aprobación final.',
    cta: 'Ver Borrador',
    to: '/partidos',
  },
]

function PendientesCard() {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <SectionCardHeader
        tone="error"
        icon={<PriorityHighIcon sx={{ fontSize: 19 }} />}
        title="Operaciones Pendientes"
        action={<Chip size="small" label={`${TAREAS_DEMO.length}`} color="error" sx={{ height: 20, fontWeight: 800 }} />}
      />
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {TAREAS_DEMO.map((t) => (
          <Box key={t.title} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'background.default', display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
            <Box sx={{ color: t.color, mt: '2px', flexShrink: 0 }}>{t.icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.title}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: t.tagColor, whiteSpace: 'nowrap' }}>{t.tag}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {t.desc}
              </Typography>
              <Button
                size="small"
                component={Link}
                to={t.to}
                sx={{
                  mt: 1,
                  px: 1.5,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {t.cta}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Card>
  )
}

// Widget de estado del predio (placeholder visual: clima y canchas estaticos)
function PredioWidget({ user }) {
  return (
    <Card sx={{ p: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText', border: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, opacity: 0.75 }}>
            Estado del Predio
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mt: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.organizadorName || 'Sede principal'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.25 }}>
            Canchas habilitadas • Iluminación LED OK
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <WbSunnyIcon sx={{ fontSize: 30, color: 'secondary.main' }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.15rem' }}>22°C</Typography>
        </Box>
      </Box>
    </Card>
  )
}

export default function Dashboard({ user, selectedTorneoId }) {
  const [filtroPartidos, setFiltroPartidos] = useState('todos')

  const { data: torneos = [], isLoading, isError, error } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
  })

  const torneoId = selectedTorneoId || torneos[0]?.id
  const torneo = torneos.find((t) => String(t.id) === String(torneoId))

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['resumen', torneoId],
    queryFn: () => apiGet(`/panel/${torneoId}/resumen`),
    enabled: !!torneoId,
  })

  const { data: landingResumen } = useQuery({
    queryKey: ['landing-resumen', torneoId],
    queryFn: () => apiGet(`/landing/torneo/${torneoId}/resumen`),
    enabled: !!torneoId,
  })

  const { data: landingPartidos } = useQuery({
    queryKey: ['landing-partidos', torneoId],
    queryFn: () => apiGet(`/landing/torneo/${torneoId}/partidos`),
    enabled: !!torneoId,
  })

  const { data: goleadoresResp } = useQuery({
    queryKey: ['goleadores', torneoId, 3],
    queryFn: () => apiGet(`/panel/${torneoId}/goleadores?top=3`),
    enabled: !!torneoId,
  })

  const { data: tablaData } = useQuery({
    queryKey: ['tabla', torneoId],
    queryFn: () => apiGet(`/panel/${torneoId}/tabla`),
    enabled: !!torneoId,
  })

  const goleadores = goleadoresResp?.goleadores || []
  const posiciones = useMemo(() => tablaData?.posiciones || [], [tablaData])

  const tablaMap = useMemo(() => {
    const map = {}
    for (const f of posiciones) map[f.equipo] = f
    return map
  }, [posiciones])

  const partidos = useMemo(() => {
    const all = []
    for (const jornada of landingPartidos?.jornadas || []) {
      for (const p of jornada.partidos || []) {
        all.push({ ...p, _jornada: jornada.jornada })
      }
    }
    return all
      .sort((a, b) => (a.en_vivo?.iniciado ? -1 : 1) - (b.en_vivo?.iniciado ? -1 : 1))
      .slice(0, 5)
  }, [landingPartidos])

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  if (torneos.length === 0) {
    return (
      <Alert severity="info">
        Aún no tienes torneos. Ve a la sección <b>Torneos</b> para crear el primero.
      </Alert>
    )
  }

  const estadoCfg = ESTADO_BADGE[torneo?.estado] || { label: torneo?.estado, color: 'default' }

  const partidosFiltrados = partidos.filter((p) => {
    if (filtroPartidos === 'vivo') return !!p.en_vivo?.iniciado
    if (filtroPartidos === 'porjugar') return !RESULTADOS_JUGADOS.includes(p.resultado)
    return true
  })

  const jugados = resumen?.partidos_jugados || 0
  const totalPartidos = resumen?.partidos || 0
  const pctPartidos = totalPartidos ? Math.round((jugados / totalPartidos) * 100) : 0
  const fechaActiva = partidos.find((p) => !RESULTADOS_JUGADOS.includes(p.resultado) && p.resultado !== 'POSTERGADO')?._jornada

  const matchStatus = (p) => {
    if (p.en_vivo?.iniciado) {
      return { key: 'vivo', label: 'EN VIVO', minute: `${Math.floor((p.en_vivo.seg || 0) / 60)}'`, bar: 'success.main' }
    }
    if (RESULTADOS_JUGADOS.includes(p.resultado)) {
      return { key: 'fin', label: 'FINALIZADO', bar: 'text.secondary' }
    }
    if (p.resultado === 'POSTERGADO') {
      return { key: 'post', label: 'POSTERGADO', bar: 'warning.main' }
    }
    return { key: 'prox', label: 'POR JUGAR', bar: 'info.main' }
  }

  const statCards = [
    {
      label: 'Equipos Inscritos',
      value: resumen?.equipos ?? '—',
      icon: <GroupIcon sx={{ fontSize: 24 }} />,
      color: 'primary.main',
      footer: 'plantillas registradas',
    },
    {
      label: 'Partidos Disputados',
      value: `${jugados} / ${totalPartidos}`,
      icon: <SportsSoccerIcon sx={{ fontSize: 24 }} />,
      color: 'info.main',
      delta: `${pctPartidos}%`,
      progress: pctPartidos,
      footer: 'del calendario jugado',
    },
    {
      label: 'Goles Totales',
      value: landingResumen?.goles_totales ?? '—',
      icon: <SportsScoreIcon sx={{ fontSize: 24 }} />,
      color: 'success.main',
      footer: landingResumen?.goles_partido ? `prom. ${landingResumen.goles_partido} por partido` : 'sin goles registrados',
    },
    {
      label: 'Tarjetas',
      value: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={{ width: 14, height: 20, bgcolor: 'caution', borderRadius: '2px', display: 'inline-block' }} />
          <span>{landingResumen?.amarillas ?? 0}</span>
          <Box component="span" sx={{ width: 14, height: 20, bgcolor: 'error.main', borderRadius: '2px', display: 'inline-block', ml: 1 }} />
          <span>{landingResumen?.rojas ?? 0}</span>
        </Box>
      ),
      icon: <StyleIcon sx={{ fontSize: 24 }} />,
      color: 'error.main',
      valueSize: 'headlineMd',
      footer: 'amarillas · rojas acumuladas',
    },
  ]

  return (
    <Box>
      {/* Header con glow atmosferico */}
      <Box sx={{ position: 'relative', mb: 3 }}>
        <Box sx={{ position: 'absolute', top: -48, right: 48, width: 384, height: 384, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.primary.main, 0.1), filter: 'blur(90px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: 190, left: '33%', width: 320, height: 320, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.primary.main, 0.06), filter: 'blur(90px)', pointerEvents: 'none' }} />

        <PageHeader
          overline="Panel Principal"
          meta={torneo ? `${torneo.nombre}${fechaActiva != null ? ` • Fecha ${fechaActiva}` : ''}` : 'Selecciona un torneo'}
          title="Dashboard del Organizador"
          badge={torneo && (<Chip size="small" label={estadoCfg.label} color={estadoCfg.color} sx={{ height: 22, fontWeight: 700 }} />)}
          actions={[
            <Button
              key="equipos"
              component={Link}
              to="/equipos"
              startIcon={<GroupAddIcon sx={{ fontSize: 20 }} />}
              sx={{
                px: 2,
                py: 1.25,
                bgcolor: 'surfaceContainerLowest',
                color: 'onSurface',
                boxShadow: '0 1px 3px 0 rgba(15,23,42,0.05)',
                '&:hover': { bgcolor: 'surfaceContainerLow', boxShadow: '0 8px 20px -6px rgba(15,23,42,0.14)' },
                '& .MuiButton-startIcon': { color: 'primary.main' },
              }}
            >
              Inscribir Equipo
            </Button>,
            <Button
              key="partidos"
              component={Link}
              to="/partidos"
              variant="contained"
              startIcon={<AddCircleIcon sx={{ fontSize: 20 }} />}
              sx={{ px: 2, py: 1.25 }}
            >
              Nuevo Partido
            </Button>,
          ]}
        />
      </Box>

      {loadingResumen ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Stat cards */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {statCards.map((s) => (
              <Grid item xs={12} sm={6} xl={3} key={s.label}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2.5}>
            {/* Columna izquierda: banner + proximos partidos */}
            <Grid item xs={12} lg={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Banner de atencion (placeholder visual hasta conectar alertas reales) */}
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => alpha(t.palette.error.main, 0.08), display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'error.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AssignmentLateIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Atención: 2 planillas de juego sin asentar</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Los partidos de Cancha 1 y 3 terminaron hace más de 45 min y esperan la firma del árbitro.
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" variant="contained" color="error" component={Link} to="/planilla">
                    Revisar Planillas
                  </Button>
                </Box>

                {/* Encabezado de seccion + tabs segmentados */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Próximos Partidos de la Jornada</Typography>
                    <Chip
                      size="small"
                      label="HOY"
                      sx={(t) => ({
                        height: 20,
                        bgcolor: alpha(t.palette.tertiaryContainer, t.palette.mode === 'dark' ? 0.25 : 0.14),
                        color: 'tertiary',
                      })}
                    />
                  </Box>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={filtroPartidos}
                    onChange={(e, v) => v && setFiltroPartidos(v)}
                    sx={{
                      bgcolor: 'surfaceContainerLow',
                      p: '4px',
                      borderRadius: 999,
                      gap: 0.5,
                      '& .MuiToggleButton-root': {
                        border: 0,
                        borderRadius: 999,
                        px: 1.5,
                        py: 0.4,
                        fontSize: '0.6875rem',
                        letterSpacing: '0.04em',
                        color: 'onSurfaceVariant',
                        '&:hover': { bgcolor: 'surfaceContainerHigh', color: 'onSurface' },
                        '&.Mui-selected': {
                          bgcolor: 'surfaceContainerLowest',
                          color: 'primary.main',
                          boxShadow: '0 1px 3px 0 rgba(15,23,42,0.05)',
                        },
                      },
                    }}
                  >
                    <ToggleButton value="todos">Todos</ToggleButton>
                    <ToggleButton value="vivo">En Vivo</ToggleButton>
                    <ToggleButton value="porjugar">Por Jugar</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Stream de partidos */}
                {partidosFiltrados.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No hay partidos para mostrar. Genera un fixture automático en <b>Partidos</b> o crea partidos manualmente.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {partidosFiltrados.map((p) => {
                      const st = matchStatus(p)
                      return (
                        <MatchCard
                          key={p.id}
                          p={p}
                          st={st}
                          posLocal={tablaMap[p.equipo_local]}
                          posVisita={tablaMap[p.equipo_visitante]}
                        />
                      )
                    })}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Columna derecha */}
            <Grid item xs={12} lg={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Top Goleadores */}
                <Card sx={{ overflow: 'hidden' }}>
                  <SectionCardHeader
                    tone="primary"
                    icon={<MilitaryTechIcon sx={{ fontSize: 19 }} />}
                    title="Top Goleadores"
                    action={(
                      <Button size="small" component={Link} to="/estadisticas" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                        Ver Estadísticas
                      </Button>
                    )}
                  />
                  <Box sx={{ py: 0.5 }}>
                    {goleadores.length === 0 ? (
                      <Alert severity="info" sx={{ m: 1.5, borderRadius: 2 }}>Aún no hay goles registrados.</Alert>
                    ) : (
                      goleadores.map((g, idx) => (
                        <Box
                          key={g.jugador_id ?? g.jugador}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            px: 2,
                            py: 1.25,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:hover': { bgcolor: 'background.default' },
                          }}
                        >
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              color: RANK_COLORS[idx] || 'text.secondary',
                              bgcolor: alpha(RANK_COLORS[idx] || '#737685', 0.14),
                            }}
                          >
                            {g.pos ?? idx + 1}
                          </Box>
                          <Avatar sx={{ width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700, bgcolor: alpha(hashColor(g.jugador), 0.16), color: hashColor(g.jugador) }}>
                            {initials(g.jugador)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{g.jugador}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{g.equipo}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography sx={{ fontWeight: 800, lineHeight: 1 }}>{g.goles}</Typography>
                            <Typography variant="caption" color="text.secondary">goles</Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Card>

                {/* Lider de la tabla */}
                {landingResumen?.lider && (
                  <Card sx={{ overflow: 'hidden' }}>
                    <SectionCardHeader tone="success" icon={<EmojiEventsIcon sx={{ fontSize: 19 }} />} title="Líder de la tabla" />
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {landingResumen.lider.equipo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">1° en la tabla de posiciones</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.25rem', lineHeight: 1 }}>{landingResumen.lider.pts}</Typography>
                        <Typography variant="caption" color="text.secondary">puntos</Typography>
                      </Box>
                    </Box>
                  </Card>
                )}

                <PendientesCard />
                <PredioWidget user={user} />
              </Box>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}

