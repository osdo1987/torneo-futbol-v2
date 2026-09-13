import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import PushPinIcon from '@mui/icons-material/PushPin'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ShieldIcon from '@mui/icons-material/Shield'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PublicIcon from '@mui/icons-material/Public'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import BarChartIcon from '@mui/icons-material/BarChart'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import CloseIcon from '@mui/icons-material/Close'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import GroupsIcon from '@mui/icons-material/Groups'
import { apiGet } from '../api'
import { PUB, FONT_DISPLAY, FONT_BODY, ESTADO_META, teamStyle, teamAbbr, FORMAT_FECHA } from '../publicTheme'
import '../publicLanding.css'

const ZONES = {
  direct: { color: PUB.green, label: 'Clasificación' },
  playoff: { color: PUB.yellow, label: 'Play-offs' },
  eliminated: { color: PUB.red, label: 'Eliminados' },
}

function zonesFor(rows) {
  const n = rows.length
  const direct = rows.filter((r) => r.clasifica).length
  const playoff = Math.floor((n - direct) / 2)
  return rows.map((r) => (r.pos <= direct ? 'direct' : r.pos <= direct + playoff ? 'playoff' : 'eliminated'))
}

function SectionTitle({ children, sx }) {
  return (
    <Typography sx={{ fontSize: { xs: 15, sm: 19 }, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', borderLeft: '4px solid #00f0ff', pl: 1.5, color: PUB.fg, lineHeight: 1.2, ...sx }}>
      {children}
    </Typography>
  )
}

function ZoneLegend({ labels }) {
  const items = labels.filter((l) => l)
  if (!items.length) return null
  return (
    <Box className="pl-fade-up" sx={{ display: 'flex', gap: { xs: 2.5, sm: 5 }, flexWrap: 'wrap', mb: 2.5 }}>
      {items.map((l) => (
        <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: l.color }} />
          <Typography sx={{ fontSize: 13, color: l.color }}>{l.label}</Typography>
        </Box>
      ))}
    </Box>
  )
}

const TABS = [
  { key: 'resultados', label: 'Resultados' },
  { key: 'posiciones', label: 'Posiciones' },
  { key: 'estadisticas', label: 'Estadísticas' },
  { key: 'calendario', label: 'Calendario' },
]

const TOURNEY_ICONS = [StarIcon, ShieldIcon, TrendingUpIcon, PublicIcon]
const NO_RESULTADO = ['PENDIENTE', 'POSTERGADO']

function useToday() {
  return useMemo(() => new Date().toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }), [])
}

function TeamBadge({ name, size = 40 }) {
  const st = teamStyle()
  return (
    <Box sx={{
      width: size, height: size, borderRadius: 4, background: st.g,
      border: `1px solid ${st.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: st.t, fontSize: Math.round(size * 0.34), letterSpacing: '.02em' }}>
        {teamAbbr(name)}
      </Typography>
    </Box>
  )
}

function TabBtn({ active, onClick, children, sx }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        position: 'relative', px: 2.2, py: 1.2, fontFamily: FONT_DISPLAY, fontSize: 16, textTransform: 'uppercase', letterSpacing: '.04em',
        whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer', transition: 'color .25s',
        color: active ? PUB.fg : PUB.muted,
        '&:hover': { color: active ? PUB.fg : PUB.fgDim },
        ...(active && { '&::after': { content: '""', position: 'absolute', bottom: -1, left: '10%', width: '80%', height: 2, bgcolor: PUB.cyan, borderRadius: 1 } }),
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

function PendingOrBar() {
  return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={26} sx={{ color: PUB.cyan }} /></Box>
}

function Empty({ text }) {
  return (
    <Box className="pl-fade-up" sx={{ py: 8, textAlign: 'center' }}>
      <EmojiEventsIcon sx={{ fontSize: 40, color: PUB.muted }} />
      <Typography sx={{ mt: 1.5, color: PUB.fgDim, fontSize: 14 }}>{text}</Typography>
    </Box>
  )
}

function ScoreBox({ children, sx }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2,
      border: `1px solid ${PUB.lineStrong}`, borderRadius: 1.5, px: 3, py: 1,
      bgcolor: 'rgba(0,0,0,.35)', minWidth: 96, ...sx,
    }}>
      {children}
    </Box>
  )
}

/* ============================================================
 * PARTIDO DESTACADO (scoreboard estilo TV)
 * ============================================================ */
// Marcador blanco: cifras navy para legibilidad sobre la caja blanca del tanteador.
const MARK = { fg: '#0d1b3e', fgDim: '#314a78', muted: '#5a6a94' }

function FeaturedMatch({ torneo, jornadas, onFormacion }) {
  const flat = useMemo(() => (jornadas || []).flatMap((j) => j.partidos || []), [jornadas])

  const featured = useMemo(() => {
    if (!flat.length) return null
    const vivo = flat.find((p) => p.en_vivo?.iniciado)
    if (vivo) return { p: vivo, kind: 'live' }
    const pend = flat.find((p) => NO_RESULTADO.includes(p.resultado))
    if (pend) return { p: pend, kind: 'next' }
    const last = [...flat].sort((a, b) => (a.jornada || 0) - (b.jornada || 0)).pop()
    return { p: last, kind: 'last' }
  }, [flat])

  const eventosQ = useQuery({
    queryKey: ['pl-eventos', featured?.p.id],
    queryFn: () => apiGet(`/landing/partido/${featured.p.id}/eventos`),
    enabled: !!featured && (featured.kind === 'last' || featured.kind === 'live'),
    refetchInterval: featured?.kind === 'live' ? 5000 : false,
  })

  const vivo = featured?.kind === 'live' ? featured.p.en_vivo : null
  const [offset, setOffset] = useState(0)
  const keyVivo = `${featured?.p.id}:${vivo?.seg || 0}`
  const [prevKeyVivo, setPrevKeyVivo] = useState(keyVivo)
  if (keyVivo !== prevKeyVivo) {
    setPrevKeyVivo(keyVivo)
    setOffset(0)
  }

  useEffect(() => {
    if (!vivo?.running) return
    const id = setInterval(() => setOffset((o) => Math.min(5400 - (vivo?.seg || 0), o + 1)), 1000)
    return () => clearInterval(id)
  }, [vivo?.running, vivo?.seg])

  if (!featured) return null
  const { p, kind } = featured
  const live = kind === 'live'
  const jugado = kind === 'last'
  const localName = p.equipo_local
  const visitName = p.equipo_visitante
  const horas = FORMAT_FECHA(p.fecha_programada, true)
  const goles = (eventosQ.data?.eventos || []).filter((e) => e.tipo === 'GOL')
  const golesLocal = goles.filter((e) => e.equipo === localName)
  const golesVisit = goles.filter((e) => e.equipo === visitName)
  const scoreLocal = live ? golesLocal.length : p.goles_local
  const scoreVisit = live ? golesVisit.length : p.goles_visitante
  const isLive = torneo?.estado === 'EN_JUEGO'
  const enVivoBadge = live || isLive
  const liveSeg = Math.min(5400, (vivo?.seg || 0) + (vivo?.running ? offset : 0))
  const livePeriodo = liveSeg <= 2700 ? 'Primer tiempo' : 'Segundo tiempo'
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <Box className="pl-fade-up" sx={{
      position: 'relative', borderRadius: 2, overflow: 'hidden',
      background: 'rgba(6,13,34,.55)',
      border: `1px solid ${live ? 'rgba(255,255,255,.45)' : PUB.line}`,
      boxShadow: '0 10px 30px rgba(0,0,0,.5)',
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(60deg, transparent, rgba(246, 247, 247, 0.2), transparent)',
      },
      maxWidth: 720, mx: 'auto',
      mb: 5,
    }}>
      <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap', mb: 3 }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" className={enVivoBadge ? 'pl-blink' : ''} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: enVivoBadge ? PUB.live : PUB.cyan }} />
            <Typography className={enVivoBadge ? 'pl-blink' : ''} sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', color: enVivoBadge ? PUB.live : PUB.cyan, textTransform: 'uppercase' }}>
              {enVivoBadge ? 'En vivo' : jugado ? 'Último resultado' : 'Próximo partido'}
            </Typography>
          </Box>
          <Typography sx={{ color: PUB.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', fontVariantNumeric: 'tabular-nums' }}>
            Jornada {p.jornada} — {torneo.nombre}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <TeamBadge name={localName} size={{ xs: 56, sm: 76 }} />
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 16, sm: 22 }, textTransform: 'uppercase', color: PUB.fg, lineHeight: 1 }}>
              {localName}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.2 }}>
            {jugado || live ? (
              <ScoreBox sx={{
                flexDirection: 'column', gap: 0.5,
                background: '#ffffff',
                borderColor: live ? 'rgba(255,255,255,.9)' : 'rgba(13,27,62,.18)',
                boxShadow: '0 0 18px rgba(255,255,255,.3)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 40, sm: 52 }, lineHeight: 1, color: MARK.fg, fontVariantNumeric: 'tabular-nums' }}>
                    {scoreLocal}
                  </Typography>
                  <Typography sx={{ color: MARK.fgDim, fontSize: { xs: 24, sm: 30 }, fontWeight: 400 }}>-</Typography>
                  <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 40, sm: 52 }, lineHeight: 1, color: MARK.fg, fontVariantNumeric: 'tabular-nums' }}>
                    {scoreVisit}
                  </Typography>
                </Box>
                {live && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                    <Box component="span" className={vivo?.running ? 'pl-blink' : ''} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PUB.live }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: PUB.live, fontVariantNumeric: 'tabular-nums', letterSpacing: '.1em' }}>
                      {fmtTime(liveSeg)} · {livePeriodo}{!vivo?.running ? ' · Pausa' : ''}
                    </Typography>
                  </Box>
                )}
                {enVivoBadge && <Typography className="pl-blink" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: PUB.live }}>● EN VIVO</Typography>}
              </ScoreBox>
            ) : (
              <ScoreBox sx={{ flexDirection: 'column', gap: 0.8, borderColor: PUB.lineStrong }}>
                <Typography className="pl-shimmer" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 34, sm: 44 }, lineHeight: 1 }}>
                  VS
                </Typography>
                {horas && <Typography sx={{ fontSize: 13, fontWeight: 600, color: PUB.cyan, fontVariantNumeric: 'tabular-nums' }}>{horas}</Typography>}
              </ScoreBox>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <TeamBadge name={visitName} size={{ xs: 56, sm: 76 }} />
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 16, sm: 22 }, textTransform: 'uppercase', color: PUB.fg, lineHeight: 1 }}>
              {visitName}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 4, pt: 2.5, borderTop: `1px solid ${PUB.line}`, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 8 }, fontSize: 12, color: PUB.fgDim }}>
          <Box sx={{ flex: 1 }}>
            {golesLocal.map((g, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SportsSoccerIcon sx={{ fontSize: 10, color: PUB.cyan }} />
                <Typography sx={{ fontSize: 12, color: PUB.fgDim }}>{g.jugador} {g.minuto}'</Typography>
              </Box>
            ))}
            {golesLocal.length === 0 && <Typography sx={{ fontSize: 12, color: PUB.muted }}>{jugado || live ? 'Sin goles' : ''}</Typography>}
          </Box>
          <Box sx={{ flex: 1, textAlign: 'right' }}>
            {golesVisit.map((g, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'flex-end' }}>
                <Typography sx={{ fontSize: 12, color: PUB.fgDim }}>{g.minuto}' {g.jugador}</Typography>
                <SportsSoccerIcon sx={{ fontSize: 10, color: PUB.cyan }} />
              </Box>
            ))}
            {golesVisit.length === 0 && <Typography sx={{ fontSize: 12, color: PUB.muted }}>{jugado || live ? 'Sin goles' : ''}</Typography>}
          </Box>
        </Box>

        <Box sx={{ mt: 3.5, display: 'flex', justifyContent: 'center' }}>
          <Box component="button" type="button" onClick={() => onFormacion(p)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 12, fontWeight: 700, color: PUB.cyan, bgcolor: PUB.blueSoft, border: `1px solid ${PUB.cyan}`, px: 2.4, py: 1.1, borderRadius: 100, cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all .2s', '&:hover': { bgcolor: 'rgba(0,240,255,.25)', color: PUB.fg } }}>
            <GroupsIcon sx={{ fontSize: 15 }} />
            Ver formación y cambios
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/* ============================================================
 * LISTADO DE PARTIDOS (estilo fixture por competición)
 * ============================================================ */
const FAV_KEY = 'pl-favoritos-v1'

function useFavoritos() {
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')) } catch { return new Set() }
  })
  const toggle = (key) => setFavs((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
    return next
  })
  return [favs, toggle]
}

const starBtn = (active) => ({
  width: 30, height: 30, p: 0, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: 'none', cursor: 'pointer',
  color: active ? PUB.cyan : PUB.muted,
  '& svg': { fontSize: 18 },
  '&:hover': { color: active ? PUB.cyan : PUB.fgDim },
})

function FixtureRow({ p, fav, onFav, onOpen, delay, last }) {
  const jugado = !NO_RESULTADO.includes(p.resultado)
  const postergado = p.resultado === 'POSTERGADO'
  const enVivo = !!p.en_vivo?.iniciado

  const d = p.fecha_programada ? new Date(p.fecha_programada) : null
  const hora = d && !Number.isNaN(d.getTime())
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const localWin = jugado && (p.resultado === 'LOCAL_GANO' || p.resultado === 'W_LOCAL')
  const visWin = jugado && (p.resultado === 'VISITANTE_GANO' || p.resultado === 'W_VISITANTE')

  const chipSx = jugado
    ? { color: PUB.fg, fontWeight: 800, fontSize: { xs: 14, sm: 16 }, fontFamily: FONT_DISPLAY, fontVariantNumeric: 'tabular-nums', border: 'none', bgcolor: 'transparent' }
    : postergado
      ? { color: PUB.yellow, border: '1px solid rgba(255,170,0,.45)', bgcolor: 'rgba(255,170,0,.08)' }
      : enVivo
        ? { color: PUB.live, border: `1px solid ${PUB.live}`, bgcolor: PUB.liveSoft }
        : { color: PUB.fgDim, border: '1px solid rgba(255,255,255,.28)', bgcolor: 'transparent' }

  const TeamLine = ({ nombre, win }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
      <TeamBadge name={nombre} size={22} />
      <Typography noWrap sx={{ fontSize: 13.5, fontWeight: win ? 800 : 500, color: win ? PUB.fg : PUB.fgDim }}>
        {nombre}
      </Typography>
    </Box>
  )

  return (
    <Box
      className="pl-slide-in"
      onClick={() => onOpen(p)}
      sx={{
        animationDelay: `${0.1 + delay * 0.05}s`,
        display: 'grid',
        gridTemplateColumns: { xs: '30px 44px minmax(0,1fr) auto', sm: '34px 56px minmax(0,1fr) 104px 1px 40px' },
        alignItems: 'center', gap: 1.2,
        px: { xs: 1.5, sm: 2 }, py: 1.4,
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,.05)',
        bgcolor: enVivo ? 'rgba(255,51,68,.05)' : 'transparent',
        cursor: 'pointer', transition: 'background .2s',
        '&:hover': { bgcolor: 'rgba(255,255,255,.035)' },
      }}
    >
      <Box
        component="button"
        aria-label="Favorito"
        onClick={(e) => { e.stopPropagation(); onFav(`m${p.id}`) }}
        sx={starBtn(fav)}
      >
        {fav ? <StarIcon /> : <StarBorderIcon />}
      </Box>

      <Typography sx={{ fontSize: 12.5, color: PUB.fgDim, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {hora}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7, minWidth: 0 }}>
        <TeamLine nombre={p.equipo_local} win={localWin} />
        <TeamLine nombre={p.equipo_visitante} win={visWin} />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Typography sx={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
          px: 1.2, py: 0.4, borderRadius: 1, whiteSpace: 'nowrap', ...chipSx,
        }}>
          {jugado ? `${p.goles_local ?? 0} - ${p.goles_visitante ?? 0}` : postergado ? 'Postergado' : enVivo ? '● En vivo' : 'Próximo'}
        </Typography>
      </Box>

      <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 1, alignSelf: 'stretch', my: 0.5, bgcolor: 'rgba(255,255,255,.08)' }} />
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center' }}>
        <LiveTvIcon sx={{ fontSize: 20, color: enVivo ? PUB.live : PUB.muted }} />
      </Box>
    </Box>
  )
}

function FixtureGroup({ favKey, titulo, partidos, favs, onFav, onOpen, onClasificacion }) {
  const [open, setOpen] = useState(true)
  const isFav = favs.has(favKey)

  return (
    <Box className="pl-fade-up" sx={{
      mb: 2.5, overflow: 'hidden', borderRadius: 1.5,
      border: '1px solid rgba(255,255,255,.07)',
      bgcolor: 'rgba(5,12,30,.75)',
      boxShadow: '0 8px 24px rgba(0,0,0,.35)',
    }}>
      {/* Encabezado de grupo (competencia / jornada / fecha) */}
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.2,
          px: 1.5, py: 1.2, cursor: 'pointer', userSelect: 'none',
          bgcolor: 'rgba(16,32,66,.9)',
          '&:hover': { bgcolor: 'rgba(20,38,76,.9)' },
        }}
      >
        <Box
          component="button"
          aria-label="Fijar grupo"
          onClick={(e) => { e.stopPropagation(); onFav(favKey) }}
          sx={starBtn(isFav)}
        >
          {isFav ? <StarIcon /> : <StarBorderIcon />}
        </Box>
        <Typography noWrap sx={{ flex: 1, fontSize: 13, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: PUB.fg }}>
          {titulo}
        </Typography>
        <PushPinIcon sx={{ fontSize: 16, color: PUB.cyan, opacity: 0.9, transform: 'rotate(35deg)' }} />
        {onClasificacion && (
          <Box
            component="button"
            onClick={(e) => { e.stopPropagation(); onClasificacion() }}
            sx={{
              fontSize: 12.5, fontWeight: 600, color: PUB.fg, background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap',
              '&:hover': { color: PUB.cyan },
            }}
          >
            Clasificación
          </Box>
        )}
        <ExpandMoreIcon sx={{ fontSize: 20, color: PUB.fgDim, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
      </Box>

      {open && partidos.map((p, i) => (
        <FixtureRow key={p.id} p={p} delay={i} last={i === partidos.length - 1} fav={favs.has(`m${p.id}`)} onFav={onFav} onOpen={onOpen} />
      ))}
    </Box>
  )
}

/* ============================================================
 * PANEL: RESULTADOS (fixture agrupado por jornada)
 * ============================================================ */
function ResultadosPanel({ jornadas, loading, onOpenPartido, onClasificacion, torneoNombre }) {
  const [favs, toggleFav] = useFavoritos()
  const sorted = useMemo(() => [...(jornadas || [])].sort((a, b) => (a.jornada || 0) - (b.jornada || 0)), [jornadas])

  if (loading) return <PendingOrBar />
  if (!sorted.length) return <Empty text="No hay partidos cargados todavía." />

  // Grupos fijados (estrella) primero.
  const grupos = [...sorted].sort((a, b) => Number(favs.has(`gj${b.jornada}`)) - Number(favs.has(`gj${a.jornada}`)))

  return (
    <Box>
      {grupos.map((j) => (
        <FixtureGroup
          key={`j${j.jornada}`}
          favKey={`gj${j.jornada}`}
          titulo={`${torneoNombre ? `${torneoNombre} · ` : ''}Jornada ${j.jornada}`}
          partidos={j.partidos}
          favs={favs}
          onFav={toggleFav}
          onOpen={onOpenPartido}
          onClasificacion={onClasificacion}
        />
      ))}
    </Box>
  )
}

/* ============================================================
 * PANEL: POSICIONES (tabla estilo TV)
 * ============================================================ */
function PosicionesPanel({ posiciones, loading }) {
  if (loading) return <PendingOrBar />
  if (!posiciones || !posiciones.length) return <Empty text="Aún no hay posiciones." />

  const template = { xs: '2.2rem 1fr 3rem 3rem 3rem 3rem 3.4rem', md: '2.4rem 1fr 3.2rem 3.2rem 3.2rem 3.2rem 3.2rem 3.2rem 3.2rem 4.2rem' }
  const zones = zonesFor(posiciones)
  const present = [...new Set(zones)].map((z) => ZONES[z])

  return (
    <Box>
      <SectionTitle className="pl-fade-up">Clasificación</SectionTitle>
      <ZoneLegend labels={present} />
      <Box className="pl-fade-up" sx={{
        background: PUB.panel,
        border: `1px solid ${PUB.line}`,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,.5)',
      }}>
        <Box component="span" sx={{
          display: 'grid', gridTemplateColumns: template, gap: 0, px: { xs: 2, sm: 3.5 }, py: 2,
          textTransform: 'uppercase', letterSpacing: '1px', fontSize: 11, color: PUB.muted, fontWeight: 700,
          bgcolor: 'rgba(0,0,0,.4)', borderBottom: '1px solid rgba(255,255,255,.02)', fontFamily: FONT_BODY, alignItems: 'center',
        }}>
          <Typography sx={{ fontSize: 10, color: PUB.muted, fontWeight: 700 }}>Pos</Typography>
          <Typography sx={{ fontSize: 10, color: PUB.muted, fontWeight: 700 }}>Club</Typography>
          <Typography sx={{ ...hCell }}>PJ</Typography>
          <Typography sx={{ ...hCell }}>G</Typography>
          <Typography sx={{ ...hCell }}>E</Typography>
          <Typography sx={{ ...hCell }}>P</Typography>
          <Typography sx={{ ...hCell, display: { xs: 'none', md: 'block' } }}>GF</Typography>
          <Typography sx={{ ...hCell, display: { xs: 'none', md: 'block' } }}>GC</Typography>
          <Typography sx={{ ...hCell, display: { xs: 'none', md: 'block' } }}>DG</Typography>
          <Typography sx={{ ...hCell }}>Pts</Typography>
        </Box>
        {posiciones.map((r, i) => {
          const col = ZONES[zones[i]].color
          return (
            <Box key={r.equipo_id} sx={{
              display: 'grid', gridTemplateColumns: template, gap: 0, px: { xs: 2, sm: 3.5 }, py: 2.2, alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,.02)', borderLeft: `4px solid ${col}`,
              bgcolor: i % 2 ? 'rgba(255,255,255,.01)' : 'transparent',
              fontSize: 13,
              transition: 'background .2s',
              '&:last-child': { borderBottom: 0 },
              '&:hover': { background: 'rgba(255,255,255,.03)' },
            }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: col }}>{r.pos}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <TeamBadge name={r.equipo} size={24} />
                <Typography noWrap sx={{ fontSize: { xs: 13.5, sm: 15 }, fontWeight: 600, textTransform: 'uppercase', color: PUB.fg }}>{r.equipo}</Typography>
              </Box>
              <Typography sx={centerNum(null)}>{r.PJ}</Typography>
              <Typography sx={centerNum(null)}>{r.PG}</Typography>
              <Typography sx={centerNum(null)}>{r.PE}</Typography>
              <Typography sx={centerNum(null)}>{r.PP}</Typography>
              <Typography sx={{ ...centerNum(null), display: { xs: 'none', md: 'block' } }}>{r.GF}</Typography>
              <Typography sx={{ ...centerNum(null), display: { xs: 'none', md: 'block' } }}>{r.GC}</Typography>
              <Typography sx={{ ...centerNum(null), display: { xs: 'none', md: 'block' } }}>{r.DF > 0 ? `+${r.DF}` : r.DF}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 15, textAlign: 'center', color: PUB.cyan, fontVariantNumeric: 'tabular-nums' }}>{r.PTS}</Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

function centerNum(color) {
  return {
    textAlign: 'center', fontSize: { xs: 13, sm: 14 }, fontVariantNumeric: 'tabular-nums',
    color: color || PUB.fgDim, fontWeight: 500,
  }
}

const hCell = { textAlign: 'center', fontSize: 10, color: PUB.muted, fontWeight: 700 }

/* ============================================================
 * PANEL: ESTADÍSTICAS
 * ============================================================ */
function EstadisticasPanel({ resumen, goleadores, sanciones, loading }) {
  const [sub, setSub] = useState('goleadores')

  if (loading) return <PendingOrBar />

  const max = (goleadores && goleadores[0]?.goles) || 1

  return (
    <Box>
      <Box className="pl-fade-up" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 5 }}>
        {[
          ['Goles totales', resumen?.goles_totales ?? 0],
          ['Goles por partido', resumen?.goles_partido ?? 0],
          ['Tarjetas rojas', resumen?.rojas ?? 0],
          ['Tarjetas amarillas', resumen?.amarillas ?? 0],
        ].map(([label, value]) => (
          <Box key={label} className="pl-fade-up" sx={{ background: PUB.panel, border: `1px solid ${PUB.line}`, borderRadius: 2, p: 3, textAlign: 'center' }}>
            <Typography className="pl-big-stat">{value}</Typography>
            <Typography sx={{ mt: 1, fontSize: 10, color: PUB.fgDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em' }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${PUB.line}`, mb: 4 }}>
        <TabBtn active={sub === 'goleadores'} onClick={() => setSub('goleadores')} sx={{ fontSize: 18 }}>Goleadores</TabBtn>
        <TabBtn active={sub === 'sanciones'} onClick={() => setSub('sanciones')} sx={{ fontSize: 18 }}>Sanciones</TabBtn>
      </Box>

      {sub === 'goleadores' ? (
        !goleadores || !goleadores.length ? <Empty text="No hay goles registrados todavía." /> : (
          <Box>
            {goleadores.map((g, i) => (
              <Box className="pl-slide-in" key={g.jugador_id} sx={{
                animationDelay: `${0.15 + i * 0.05}s`,
                display: 'flex', alignItems: 'center', gap: 2,
                background: 'rgba(0,0,0,.25)', border: `1px solid ${PUB.line}`, borderRadius: 1.5, p: 2, mb: 1.5,
              }}>
                <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, width: 24, textAlign: 'center', color: i < 3 ? PUB.gold : PUB.muted }}>{g.pos}</Typography>
                <TeamBadge name={g.equipo} size={34} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: { xs: 14, sm: 16 }, textTransform: 'uppercase', color: PUB.fg }}>{g.jugador}</Typography>
                  <Typography sx={{ fontSize: 11, color: PUB.fgDim }}>{g.equipo}</Typography>
                </Box>
                <Box className="pl-stat-bar" sx={{ width: { xs: 56, sm: 128 }, display: { xs: 'none', sm: 'block' } }}>
                  <Box className="pl-stat-bar-fill" sx={{ width: `${Math.round((g.goles / max) * 100)}%` }} />
                </Box>
                <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: PUB.fg, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{g.goles}</Typography>
              </Box>
            ))}
          </Box>
        )
      ) : (
        !sanciones || !sanciones.length ? <Empty text="No hay sanciones registradas." /> : (
          <Box>
            {sanciones.map((s, i) => (
              <Box className="pl-slide-in" key={s.jugador_id} sx={{
                animationDelay: `${0.15 + i * 0.05}s`,
                display: 'flex', alignItems: 'center', gap: 2,
                background: 'rgba(0,0,0,.25)', border: `1px solid ${PUB.line}`, borderRadius: 1.5, p: 2, mb: 1.5,
              }}>
                <TeamBadge name={s.equipo} size={34} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: { xs: 14, sm: 16 }, textTransform: 'uppercase', color: PUB.fg }}>{s.jugador}</Typography>
                  <Typography sx={{ fontSize: 11, color: PUB.fgDim }}>{s.equipo}</Typography>
                </Box>
                <Typography sx={{ color: PUB.muted, fontSize: 11 }}>
                  <Box component="span" sx={{ display: 'inline-flex', width: 10, height: 10, borderRadius: 3, bgcolor: PUB.yellow, mr: 0.5, verticalAlign: 'middle' }} />
                  <Box component="span" sx={{ color: PUB.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.amarillas}</Box>
                </Typography>
                <Typography sx={{ color: PUB.muted, fontSize: 11 }}>
                  <Box component="span" sx={{ display: 'inline-flex', width: 10, height: 10, borderRadius: 3, bgcolor: PUB.red, mr: 0.5, verticalAlign: 'middle' }} />
                  <Box component="span" sx={{ color: PUB.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.rojas}</Box>
                </Typography>
                {s.suspendido
                  ? <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: PUB.live, bgcolor: PUB.liveSoft, border: `1px solid ${PUB.live}`, px: 1.4, py: 0.5, borderRadius: 100, letterSpacing: '.06em' }}>Suspendido</Typography>
                  : <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: PUB.green, bgcolor: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.4)', px: 1.4, py: 0.5, borderRadius: 100, letterSpacing: '.06em' }}>Disponible</Typography>}
              </Box>
            ))}
          </Box>
        )
      )}
    </Box>
  )
}

/* ============================================================
 * PANEL: CALENDARIO
 * ============================================================ */
function CalendarioPanel({ partidos, loading, onOpenPartido, onClasificacion }) {
  const [favs, toggleFav] = useFavoritos()
  const pendientes = useMemo(() => (partidos || []).filter((p) => NO_RESULTADO.includes(p.resultado)), [partidos])

  if (loading) return <PendingOrBar />

  const groups = {}
    ;[...pendientes].sort((a, b) => new Date(a.fecha_programada || 0) - new Date(b.fecha_programada || 0)).forEach((p) => {
      const fecha = p.fecha_programada ? FORMAT_FECHA(p.fecha_programada) : 'Por definir'
        ; (groups[fecha] = groups[fecha] || []).push(p)
    })

  if (!Object.keys(groups).length) return <Empty text="No quedan partidos por disputar." />

  return (
    <Box>
      {Object.entries(groups).map(([fecha, list]) => (
        <FixtureGroup
          key={fecha}
          favKey={`gf${fecha}`}
          titulo={fecha}
          partidos={list}
          favs={favs}
          onFav={toggleFav}
          onOpen={onOpenPartido}
          onClasificacion={onClasificacion}
        />
      ))}
    </Box>
  )
}

/* ============================================================
 * MODAL DE PARTIDO
 * ============================================================ */
function MatchModal({ partido, onClose, onFormacion }) {
  const { data } = useQuery({
    queryKey: ['pl-eventos', partido.id],
    queryFn: () => apiGet(`/landing/partido/${partido.id}/eventos`),
  })
  const eventos = data?.eventos || []
  const jugado = !NO_RESULTADO.includes(partido.resultado)
  const horas = FORMAT_FECHA(partido.fecha_programada, true)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const goles = eventos.filter((e) => e.tipo === 'GOL').length
  const amarillas = eventos.filter((e) => e.tipo === 'TARJETA_AMARILLA').length
  const rojas = eventos.filter((e) => e.tipo === 'TARJETA_ROJA').length

  return createPortal(
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300 }}>
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(3,8,18,.8)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <Box sx={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        '@media (min-width:900px)': {
          bottom: 'auto', top: '50%', left: '50%', right: 'auto', transform: 'translate(-50%,-50%)',
          maxWidth: 520, width: '100%',
        },
        bgcolor: '#020621', color: PUB.fg,
        border: `1px solid ${PUB.lineStrong}`,
        borderTopLeftRadius: { xs: 24, md: 18 },
        borderTopRightRadius: { xs: 24, md: 18 },
        borderBottomLeftRadius: { xs: 0, md: 18 },
        borderBottomRightRadius: { xs: 0, md: 18 },
        maxHeight: '85vh', overflowY: 'auto', p: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: PUB.cyan }} />
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: PUB.fg, letterSpacing: '.04em' }}>Detalle del partido</Typography>
          </Box>
          <Box component="button" onClick={onClose} sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PUB.muted, cursor: 'pointer', border: 'none', '&:hover': { color: PUB.fg } }}>
            <CloseIcon fontSize="small" />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <TeamBadge name={partido.equipo_local} size={52} />
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', textAlign: 'center', color: PUB.fg }}>{partido.equipo_local}</Typography>
          </Box>
          {jugado ? (
            <ScoreBox>
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, color: PUB.fg, fontVariantNumeric: 'tabular-nums' }}>{partido.goles_local}</Typography>
              <Typography sx={{ color: PUB.fgDim, fontSize: 18 }}>-</Typography>
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, color: PUB.fg, fontVariantNumeric: 'tabular-nums' }}>{partido.goles_visitante}</Typography>
            </ScoreBox>
          ) : (
            <ScoreBox sx={{ flexDirection: 'column', gap: 0.4 }}>
              <Typography className="pl-shimmer" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26 }}>VS</Typography>
              {horas && <Typography sx={{ fontSize: 12, fontWeight: 600, color: PUB.cyan, fontVariantNumeric: 'tabular-nums' }}>{horas}</Typography>}
            </ScoreBox>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <TeamBadge name={partido.equipo_visitante} size={52} />
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', textAlign: 'center', color: PUB.fg }}>{partido.equipo_visitante}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box component="button" type="button" onClick={() => onFormacion(partido)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 12, fontWeight: 700, color: PUB.cyan, bgcolor: PUB.blueSoft, border: `1px solid ${PUB.cyan}`, px: 2.2, py: 1, borderRadius: 100, cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all .2s', '&:hover': { bgcolor: 'rgba(0,240,255,.25)', color: PUB.fg } }}>
            <GroupsIcon sx={{ fontSize: 15 }} />
            Formación y cambios
          </Box>
        </Box>

        <Box sx={{ bgcolor: 'rgba(7,16,34,.6)', borderRadius: 2, border: `1px solid ${PUB.line}`, p: 3, mb: 3 }}>
          <Typography sx={{ mb: 3, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: PUB.muted, fontWeight: 700 }}>
            Eventos del partido
          </Typography>
          {eventos.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: PUB.muted }}>{jugado ? 'Sin eventos registrados.' : 'Partido aún no disputado.'}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {eventos.map((e) => {
                const esLocal = e.equipo === partido.equipo_local
                const typo = {
                  GOL: { icon: <SportsSoccerIcon sx={{ fontSize: 11, color: PUB.cyan }} /> },
                  TARJETA_AMARILLA: { block: true, color: PUB.yellow },
                  TARJETA_ROJA: { block: true, color: PUB.red },
                  AUTOGOL: { icon: <SportsSoccerIcon sx={{ fontSize: 11, color: PUB.cyan }} /> },
                }[e.tipo] || { icon: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PUB.muted }} /> }
                const Icon = typo.block
                  ? <Box component="span" sx={{ width: 10, height: 10, borderRadius: 3, bgcolor: typo.color, flexShrink: 0 }} />
                  : <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>{typo.icon}</Box>
                return (
                  <Box key={e.id || `${e.tipo}-${e.minuto}-${e.jugador}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: esLocal ? 'flex-start' : 'flex-end' }}>
                    <Typography sx={{ fontSize: 12, color: PUB.muted, textAlign: 'right' }}>{e.minuto}'</Typography>
                    {Icon}
                    {e.tipo === 'CAMBIO' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: esLocal ? 'flex-start' : 'flex-end', minWidth: 0 }}>
                        <Typography sx={{ color: PUB.green, fontSize: 13, fontWeight: 700 }}>{e.jugador}</Typography>
                        {e.jugador_sale && <Typography sx={{ color: PUB.muted, fontSize: 11 }}>Sale {e.jugador_sale}</Typography>}
                      </Box>
                    ) : (
                      <Typography sx={{ color: PUB.fg, fontSize: 13 }}>{e.jugador}</Typography>
                    )}
                    {e.descripcion && <Typography sx={{ fontSize: 10, color: PUB.muted, bgcolor: 'rgba(255,255,255,.05)', px: 1.2, py: 0.5, borderRadius: 1 }}>{e.descripcion}</Typography>}
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            ['Goles', goles, PUB.fg],
            ['Amarillas', amarillas, PUB.yellow],
            ['Rojas', rojas, PUB.red],
          ].map(([label, value, color]) => (
            <Box key={label} sx={{ bgcolor: 'rgba(7,16,34,.6)', borderRadius: 2, border: `1px solid ${PUB.line}`, p: 2.5, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, color, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
              <Typography sx={{ fontSize: 10, color: PUB.muted, mt: 0.5, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>,
    document.body,
  )
}

/* ============================================================
 * FORMACIÓN Y CAMBIOS (estilo TV)
 * ============================================================ */
function FormationDialog({ partido, onClose }) {
  const { data, isError } = useQuery({
    queryKey: ['pl-alineaciones', partido.id],
    queryFn: () => apiGet(`/landing/partido/${partido.id}/alineaciones`),
    retry: 0,
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const equipos = data?.equipos || []
  const cambios = data?.cambios || []
  const sinFormacion = !equipos.some((t) => (t.jugadores || []).length)

  const POS_ORDER = ['POR', 'DEF', 'MED', 'DEL', 'OTROS']

  const tactic = (team) => {
    const titulares = team.jugadores.filter((j) => j.titular)
    const nums = POS_ORDER.slice(1, 4).map((p) => titulares.filter((j) => j.posicion === p).length)
    return nums.join('-')
  }

  return createPortal(
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300 }}>
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(3,8,18,.75)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        '@media (min-width:900px)': { bottom: 'auto', top: '50%', left: '50%', right: 'auto', transform: 'translate(-50%,-50%)', maxWidth: 680, width: '100%', maxHeight: '85vh' },
        bgcolor: '#020621', color: PUB.fg,
        border: `1px solid ${PUB.lineStrong}`,
        borderTopLeftRadius: { xs: 24, md: 18 },
        borderTopRightRadius: { xs: 24, md: 18 },
        borderBottomLeftRadius: { xs: 0, md: 18 },
        borderBottomRightRadius: { xs: 0, md: 18 },
        maxHeight: '85vh', overflowY: 'auto', p: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: PUB.cyan }} />
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '.04em' }}>Formación y cambios</Typography>
          </Box>
          <Box component="button" type="button" onClick={onClose} sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'rgba(255,255,255,.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: PUB.muted, cursor: 'pointer', '&:hover': { color: PUB.fg } }}>
            <CloseIcon fontSize="small" />
          </Box>
        </Box>

        {isError ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <Typography sx={{ color: PUB.fgDim, fontSize: 13 }}>No se pudo cargar la información de formación.</Typography>
          </Box>
        ) : !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} sx={{ color: PUB.cyan }} /></Box>
        ) : (
          <>
            {sinFormacion ? (
              <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                <Typography sx={{ color: PUB.muted, fontSize: 13 }}>Aún no hay formación registrada para este partido.</Typography>
                <Typography sx={{ color: PUB.muted, fontSize: 12, mt: 0.5, opacity: 0.7 }}>
                  La formación se publica cuando los equipos cargan su plantel.
                </Typography>
              </Box>
            ) : (
              equipos.map((team) => {
                const titulares = team.jugadores.filter((j) => j.titular)
                const suplentes = team.jugadores.filter((j) => !j.titular)
                return (
                  <Box key={team.equipo_id} sx={{ mb: 4, pb: 3, borderBottom: `1px solid ${PUB.line}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                      <TeamBadge name={team.nombre} size={28} />
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: PUB.fg }}>{team.nombre}</Typography>
                        {titulares.length > 0 && <Typography sx={{ fontSize: 11, fontWeight: 700, color: PUB.cyan, bgcolor: PUB.blueSoft, border: `1px solid ${PUB.cyan}`, px: 1.2, py: 0.4, borderRadius: 100 }}>{tactic(team)}</Typography>}
                      </Box>
                    </Box>

                    {(() => {
                      const colorRol = { POR: '#f39c12', DEF: '#4aa3ff', MED: '#2ecc71', DEL: '#ff5b5b', OTROS: '#90a4ae' }
                      const grupos = { POR: [], DEF: [], MED: [], DEL: [], OTROS: [] }
                      titulares.forEach((j) => {
                        const rol = (j.posicion === 'POR' || j.posicion === 'DEF' || j.posicion === 'MED' || j.posicion === 'DEL' || j.posicion === 'OTROS') ? j.posicion : 'OTROS'
                        grupos[rol].push(j)
                      })
                      Object.keys(grupos).forEach((k) => grupos[k].sort((a, b) => (a.orden || 0) - (b.orden || 0)))
                      const renderFila = (rol, etiqueta) => {
                        const jugadores = grupos[rol]
                        if (!jugadores.length) return null
                        return (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: 52, gap: 0.5, py: 0.4 }}>
                            <Typography sx={{ width: { xs: 26, sm: 34 }, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>{etiqueta}</Typography>
                            {jugadores.map((j) => (
                              <Box key={j.jugador_id} title={`${j.nombre} · camiseta ${j.numero}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 0.4 }}>
                                <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: colorRol[rol], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.35)' }}>{j.numero}</Box>
                                <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.7)', maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.25 }}>{j.nombre}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )
                      }
                      return (
                        <Box sx={{ mt: 1.5, background: 'linear-gradient(160deg,#1b5e20,#2c6e31 55%,#3a8f44)', borderRadius: 2, p: 1.5, position: 'relative', overflow: 'hidden' }}>
                          <Box sx={{ position: 'absolute', top: '50%', left: 10, right: 10, borderTop: '2px dashed rgba(255,255,255,.35)' }} />
                          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 240, pt: 1 }}>
                            {renderFila('OTROS', '⚑')}
                            {renderFila('DEL', 'DEL')}
                            {renderFila('MED', 'MED')}
                            {renderFila('DEF', 'DEF')}
                            {renderFila('POR', 'POR')}
                          </Box>
                        </Box>
                      )
                    })()}

                    {suplentes.length > 0 && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${PUB.line}` }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: PUB.muted, textTransform: 'uppercase', mb: 1.2 }}>Suplentes</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {suplentes.map((j) => (
                            <Box key={j.jugador_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(255,255,255,.03)', border: `1px solid ${PUB.line}`, borderRadius: 2, px: 1.2, py: 0.7 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: PUB.muted, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{j.numero}</Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 600, color: PUB.fgDim }}>{j.nombre}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )
              })
            )}

            {cambios.length > 0 && (
              <Box sx={{ mt: sinFormacion ? 2 : 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SwapHorizIcon sx={{ fontSize: 16, color: PUB.cyan }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: PUB.fg }}>Cambios</Typography>
                </Box>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {cambios.map((c, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,.04)', border: `1px solid ${PUB.line}`, borderRadius: 1.5, px: 2, py: 1.5, fontSize: 12 }}>
                      <Typography sx={{ width: 28, fontWeight: 800, color: PUB.cyan, fontVariantNumeric: 'tabular-nums' }}>{c.minuto}'</Typography>
                      <Typography sx={{ color: PUB.red, fontWeight: 600, textDecoration: 'line-through', opacity: .8 }}>{c.sale}</Typography>
                      <SwapHorizIcon sx={{ fontSize: 14, color: PUB.muted }} />
                      <Typography sx={{ color: PUB.green, fontWeight: 700 }}>{c.entra}</Typography>
                      {c.equipo && <Typography sx={{ marginLeft: 'auto', fontSize: 10, color: PUB.muted, letterSpacing: '.06em' }}>{c.equipo}</Typography>}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>,
    document.body,
  )
}

/* ============================================================
 * PÁGINA PRINCIPAL
 * ============================================================ */
export default function PublicLanding() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useToday()
  const [selectedId, setSelectedId] = useState(() => Number(searchParams.get('torneo')) || null)
  const [tab, setTab] = useState('resultados')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)

  const landingQ = useQuery({
    queryKey: ['public-landing', slug],
    queryFn: () => apiGet(`/landing/${slug}`),
    enabled: !!slug,
  })

  const org = landingQ.data?.organizador
  const torneos = landingQ.data?.torneos || []

  const selId = torneos.some((t) => t.id === selectedId) ? selectedId : torneos[0]?.id
  const selTorneo = torneos.find((t) => t.id === selId)

  const selQueries = {
    resumen: useQuery({ queryKey: ['pl-resumen', selId], queryFn: () => apiGet(`/landing/torneo/${selId}/resumen`), enabled: !!selId }),
    partidos: useQuery({ queryKey: ['pl-partidos', selId], queryFn: () => apiGet(`/landing/torneo/${selId}/partidos`), enabled: !!selId, refetchInterval: 12000 }),
    tabla: useQuery({ queryKey: ['pl-tabla', selId], queryFn: () => apiGet(`/landing/torneo/${selId}/tabla`), enabled: !!selId }),
    goleadores: useQuery({ queryKey: ['pl-goleadores', selId], queryFn: () => apiGet(`/landing/torneo/${selId}/goleadores`), enabled: !!selId }),
    sanciones: useQuery({ queryKey: ['pl-sanciones', selId], queryFn: () => apiGet(`/landing/torneo/${selId}/sanciones`), enabled: !!selId }),
  }

  const jornadas = selQueries.partidos.data?.jornadas || []
  const tabLoading = selQueries[tab]?.isLoading

  const isLiveNow = selTorneo?.estado === 'EN_JUEGO'

  const iconFor = (i) => TOURNEY_ICONS[i % TOURNEY_ICONS.length]

  const words = (org?.nombre || '...').trim().split(/\s+/)
  const logoBase = words.length > 1 ? words.slice(0, -1).join(' ') : ''
  const logoAccent = words[words.length - 1] || ''

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#020621',
      color: PUB.fg, fontFamily: FONT_BODY, pb: { xs: 16, md: 8 },
    }}>
      {/* Header */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', bgcolor: 'rgba(2,6,33,.85)', borderBottom: '2px solid rgba(0,240,255,.1)' }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto', px: { xs: 2, sm: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {org?.logo_url ? (
              <Box component="img" src={org.logo_url} alt={org.nombre} sx={{ width: 34, height: 34, borderRadius: '8px', objectFit: 'cover', bgcolor: PUB.panelDeep }} />
            ) : (
              <Box sx={{ width: 34, height: 34, borderRadius: '8px', background: 'linear-gradient(135deg, #0b2a6b, #061138)', border: `1px solid ${PUB.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmojiEventsIcon sx={{ color: PUB.cyan, fontSize: 17 }} />
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
              {logoBase && <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, letterSpacing: '2px', textTransform: 'uppercase', color: PUB.fg }}>{logoBase}&nbsp;</Typography>}
              <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, letterSpacing: '2px', textTransform: 'uppercase', color: PUB.cyan, textShadow: '0 0 10px rgba(0,240,255,.5)' }}>
                {logoAccent}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
            {TABS.map((t) => (
              <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 11, color: PUB.fgDim, textTransform: 'uppercase', letterSpacing: '.1em', fontVariantNumeric: 'tabular-nums' }}>
              {today}
            </Typography>
            {isLiveNow && (
              <Box component="span" className="pl-blink" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: PUB.live, bgcolor: PUB.liveSoft, border: `1px solid ${PUB.live}`, px: 1.4, py: 0.5, borderRadius: 100 }}>
                <Box component="span" className="pl-blink" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PUB.live }} />
                En vivo
              </Box>
            )}
            <Box component="button" aria-label="Buscar" sx={iconBtn}>
              <SearchIcon sx={{ fontSize: 15 }} />
            </Box>
            <Box component="button" aria-label="Notificaciones" sx={iconBtn}>
              <NotificationsNoneIcon sx={{ fontSize: 15 }} />
            </Box>
            <Box component={Link} to="/login" sx={{ ml: 0.5, fontSize: 12, fontWeight: 700, color: PUB.fg, textDecoration: 'none', border: `1px solid ${PUB.lineStrong}`, bgcolor: 'rgba(255,255,255,.04)', px: 2, py: 1, borderRadius: '8px', cursor: 'pointer', transition: 'all .2s', '&:hover': { borderColor: PUB.cyan, color: PUB.cyan } }}>
              Ingresar
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main */}
      <Box component="main" sx={{ position: 'relative', zIndex: 1, maxWidth: 1152, mx: 'auto', px: { xs: 2, sm: 4 }, mt: 4 }}>
        {landingQ.isLoading ? (
          <PendingOrBar />
        ) : !torneos.length ? (
          <Empty text={`Todavía no hay competiciones de ${org?.nombre || 'esta organización'}.`} />
        ) : (
          <>
            {/* Selector de torneo */}
            <Box className="pl-fade-up" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflowX: 'auto', pb: 2, mb: 4, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
              {torneos.map((t, i) => {
                const Icon = iconFor(i)
                const active = t.id === selId
                return (
                  <Box
                    component="button"
                    key={t.id}
                    onClick={() => { setSelectedId(t.id); setSearchParams({ torneo: String(t.id) }, { replace: true }) }}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 1.2, px: 2.4, py: 1.2, borderRadius: 100,
                      fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: FONT_BODY,
                      transition: 'all .25s',
                      ...(active
                        ? { bgcolor: 'rgba(0,240,255,.12)', border: `1px solid ${PUB.cyan}`, color: '#eaf6ff' }
                        : { bgcolor: 'rgba(255,255,255,.03)', border: `1px solid ${PUB.line}`, color: PUB.muted, '&:hover': { borderColor: PUB.cyan, color: PUB.fgDim } }),
                    }}
                  >
                    <Icon fontSize="inherit" sx={{ fontSize: 11 }} />
                    {t.nombre}
                  </Box>
                )
              })}
            </Box>

            {selTorneo && <FeaturedMatch torneo={selTorneo} jornadas={jornadas} onFormacion={setForm} />}

            {/* Tabs content */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', borderBottom: `1px solid ${PUB.line}`, mb: 4 }}>
              {TABS.map((t) => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>)}
            </Box>

            {tab === 'resultados' && <ResultadosPanel key={`r${selId}`} jornadas={jornadas} loading={tabLoading} onOpenPartido={setModal} onClasificacion={() => setTab('posiciones')} torneoNombre={selTorneo?.nombre} />}
            {tab === 'posiciones' && <PosicionesPanel posiciones={selQueries.tabla.data?.posiciones} loading={tabLoading} />}
            {tab === 'estadisticas' && <EstadisticasPanel key={`e${selId}`} resumen={selQueries.resumen.data} goleadores={selQueries.goleadores.data?.goleadores} sanciones={selQueries.sanciones.data?.sanciones} loading={tabLoading} />}
            {tab === 'calendario' && partidosDe(selQueries.partidos.data) ? <CalendarioPanel partidos={partidosDe(selQueries.partidos.data)} loading={tabLoading} onOpenPartido={setModal} onClasificacion={() => setTab('posiciones')} /> : null}
          </>
        )}
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ position: 'relative', zIndex: 1, mt: 8, borderTop: `1px solid ${PUB.line}` }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto', px: { xs: 2, sm: 4 }, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: PUB.muted }}>© {new Date().getFullYear()} {org?.nombre || 'Organización'}</Typography>
          <Typography sx={{ fontSize: 12, color: PUB.muted }}>
            Plataforma deportiva <Box component="span" sx={{ color: PUB.cyan, fontWeight: 600 }}>Osdosoft</Box>
          </Typography>
        </Box>
      </Box>

      {/* Bottom nav móvil */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, bgcolor: 'rgba(7,13,28,.95)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${PUB.line}`, display: { xs: 'block', md: 'none' } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: 60 }}>
          {TABS.map((t) => {
            const Icon = { resultados: SportsSoccerIcon, posiciones: FormatListNumberedIcon, estadisticas: BarChartIcon, calendario: CalendarMonthIcon }[t.key]
            const active = tab === t.key
            return (
              <Box component="button" key={t.key} onClick={() => setTab(t.key)} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.4, bgcolor: 'transparent', border: 'none', cursor: 'pointer', color: active ? PUB.cyan : PUB.muted }}>
                <Icon fontSize="small" />
                <Typography sx={{ fontSize: 9.5, fontWeight: 700 }}>{t.label}</Typography>
              </Box>
            )
          })}
        </Box>
      </Box>

      {modal && <MatchModal partido={modal} onClose={() => setModal(null)} onFormacion={setForm} />}
      {form && <FormationDialog partido={form} onClose={() => setForm(null)} />}
    </Box>
  )
}

const iconBtn = {
  width: 36, height: 36, borderRadius: '8px', bgcolor: 'rgba(255,255,255,.04)',
  border: `1px solid ${PUB.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: PUB.muted, cursor: 'pointer', transition: 'all .2s', '&:hover': { color: PUB.fg, borderColor: PUB.cyan },
}

function partidosDe(data) {
  return (data?.jornadas || []).flatMap((j) => j.partidos || [])
}