import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import ShieldIcon from '@mui/icons-material/Shield'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PublicIcon from '@mui/icons-material/Public'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import BarChartIcon from '@mui/icons-material/BarChart'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import CloseIcon from '@mui/icons-material/Close'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import GroupsIcon from '@mui/icons-material/Groups'
import { apiGet } from '../api'
import { usePartidoStream } from '../lib/sse'
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
]

const TOURNEY_ICONS = [StarIcon, ShieldIcon, TrendingUpIcon, PublicIcon]
const NO_RESULTADO = ['PENDIENTE', 'POSTERGADO']

// El autogol suma para el rival del equipo del jugador que lo convierte.
function marcadorDesdeEventos(eventos, localName, visitName) {
  const lista = Array.isArray(eventos) ? eventos : []
  const local = lista.filter((e) => (e.tipo === 'GOL' && e.equipo === localName) || (e.tipo === 'AUTOGOL' && e.equipo === visitName))
  const visit = lista.filter((e) => (e.tipo === 'GOL' && e.equipo === visitName) || (e.tipo === 'AUTOGOL' && e.equipo === localName))
  return { local, visit, golesLocal: local.length, golesVisit: visit.length }
}

// Un partido está realmente en vivo si su reloj arrancó y aún no tiene resultado final.
function estaEnVivo(p) {
  return !!p?.en_vivo?.iniciado && NO_RESULTADO.includes(p.resultado)
}

/* ---------- Pronóstico (modelo Poisson) ----------
 * Estimación de probabilidad Local / Empate / Visitante a partir de las
 * posiciones actuales (ataque = GF/PJ, defensa = GC/PJ) y el promedio de la
 * liga. No es una apuesta: es un indicador derivado de los resultados reales.
 * Si un equipo no tiene partidos jugados no se muestra pronóstico.
 */
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]
const poisson = (lambda, k) => Math.exp(-lambda) * Math.pow(Math.max(lambda, 0), k) / FACT[k]
const clampLambda = (x) => Math.min(4.5, Math.max(0.2, x))

function buildStatsIndex(posiciones) {
  const m = {}
  let goles = 0; let pj = 0
  ;(posiciones || []).forEach((r) => {
    m[r.equipo_id] = r
    goles += r.GF || 0
    pj += r.PJ || 0
  })
  return { m, avg: pj > 0 ? goles / pj : 0 }
}

function matchProbabilities(p, index) {
  const l = index?.m[p.equipo_local_id]
  const v = index?.m[p.equipo_visitante_id]
  if (!l || !v || !l.PJ || !v.PJ || !index.avg) return null
  const atk = (r) => (r.GF / r.PJ) / index.avg
  const def = (r) => (r.GC / r.PJ) / index.avg
  const HOME = 1.15
  const lamL = clampLambda(atk(l) * def(v) * index.avg * HOME)
  const lamV = clampLambda(atk(v) * def(l) * index.avg)
  let pl = 0; let pd = 0; let pv = 0
  for (let i = 0; i <= 9; i += 1) {
    for (let j = 0; j <= 9; j += 1) {
      const pr = poisson(lamL, i) * poisson(lamV, j)
      if (i > j) pl += pr
      else if (i === j) pd += pr
      else pv += pr
    }
  }
  const suma = pl + pd + pv
  if (!suma) return null
  const local = Math.round((pl / suma) * 100)
  const empate = Math.round((pd / suma) * 100)
  return { local, empate, visitante: 100 - local - empate }
}

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
function FeaturedMatch({ torneo, jornadas, onFormacion }) {
  const qc = useQueryClient()
  const flat = useMemo(() => (jornadas || []).flatMap((j) => j.partidos || []), [jornadas])

  const featured = useMemo(() => {
    if (!flat.length) return null
    const vivo = flat.find((p) => estaEnVivo(p) && p.en_vivo?.running)
      || flat.find((p) => estaEnVivo(p))
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
  })

  // Estado en vivo recibido por SSE: mantiene el cronómetro al segundo sin polling.
  const [liveTick, setLiveTick] = useState(null)
  const handleStream = useCallback((data) => {
    if (data.seg !== undefined) setLiveTick({ seg: data.seg, running: data.running, iniciado: data.iniciado })
    if (data.eventos) {
      qc.invalidateQueries({ queryKey: ['pl-eventos', featured?.p?.id] })
      qc.invalidateQueries({ queryKey: ['pl-alineaciones', featured?.p?.id] })
      qc.invalidateQueries({ queryKey: ['pl-partidos'] })
    }
  }, [qc, featured?.p?.id])

  // SSE real-time para cronómetro + eventos (reemplaza polling 5s)
  usePartidoStream(featured?.p.id, featured?.kind === 'live', handleStream)

  const vivo = featured?.kind === 'live'
    ? { ...(featured.p.en_vivo || {}), ...(liveTick || {}) }
    : null

  if (!featured) return null
  const { p, kind } = featured
  const live = kind === 'live'
  const jugado = kind === 'last'
  const localName = p.equipo_local
  const visitName = p.equipo_visitante
  const horas = FORMAT_FECHA(p.fecha_programada, true)
  const marcador = marcadorDesdeEventos(eventosQ.data?.eventos, localName, visitName)
  const golesLocal = marcador.local
  const golesVisit = marcador.visit
  const scoreLocal = live ? marcador.golesLocal : p.goles_local
  const scoreVisit = live ? marcador.golesVisit : p.goles_visitante
  const conMarcador = jugado || live
  const liveSeg = Math.min(5400, (vivo?.seg || 0))
  const livePeriodo = liveSeg <= 2700 ? 'Primer tiempo' : 'Segundo tiempo'
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <Box className="pl-fade-up" sx={{
      position: 'relative', borderRadius: 2, overflow: 'hidden',
      background: PUB.panel,
      border: `1px solid ${live ? PUB.lineStrong : PUB.line}`,
      boxShadow: '0 10px 30px rgba(0,0,0,.5)',
      maxWidth: 680, mx: 'auto', mb: 4,
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${live ? PUB.cyan : PUB.lineStrong}, transparent)`,
      },
    }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.75, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.75 }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Box component="span" className={live ? 'pl-blink' : ''} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: live ? PUB.live : PUB.cyan }} />
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 10, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: live ? PUB.live : PUB.cyan }}>
              {live ? 'En vivo' : jugado ? 'Último resultado' : 'Próximo partido'}
            </Typography>
          </Box>
          <Typography noWrap sx={{ fontFamily: FONT_BODY, color: PUB.muted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Jornada {p.jornada} · {torneo.nombre}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <TeamBadge name={localName} size={44} />
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 13, sm: 15 }, textTransform: 'uppercase', color: PUB.fg, lineHeight: 1.1 }}>
              {localName}
            </Typography>
          </Box>

          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25,
            minWidth: { xs: 84, sm: 104 }, px: 2, py: 0.75, borderRadius: 1.5,
            bgcolor: PUB.panelDeep, border: `1px solid ${conMarcador ? PUB.lineStrong : PUB.line}`,
          }}>
            {conMarcador ? (
              <>
                <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 28, sm: 34 }, lineHeight: 1, color: PUB.fg, fontVariantNumeric: 'tabular-nums' }}>{scoreLocal}</Typography>
                <Typography sx={{ fontFamily: FONT_DISPLAY, color: PUB.fgDim, fontSize: { xs: 18, sm: 22 }, fontWeight: 400, lineHeight: 1 }}>-</Typography>
                <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 28, sm: 34 }, lineHeight: 1, color: PUB.fg, fontVariantNumeric: 'tabular-nums' }}>{scoreVisit}</Typography>
              </>
            ) : (
              <Typography className="pl-shimmer" sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: { xs: 22, sm: 26 }, lineHeight: 1, letterSpacing: '.06em' }}>VS</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.25, minWidth: 0 }}>
            <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: { xs: 13, sm: 15 }, textTransform: 'uppercase', color: PUB.fg, lineHeight: 1.1, textAlign: 'right' }}>
              {visitName}
            </Typography>
            <TeamBadge name={visitName} size={44} />
          </Box>
        </Box>

        <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, minHeight: 16 }}>
          {live ? (
            <>
              <Box component="span" className={vivo?.running ? 'pl-blink' : ''} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PUB.live }} />
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 700, color: PUB.live, fontVariantNumeric: 'tabular-nums', letterSpacing: '.08em' }}>
                {fmtTime(liveSeg)} · {livePeriodo}{!vivo?.running ? ' · Pausa' : ''}
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 700, color: jugado ? PUB.muted : PUB.cyan, letterSpacing: '.06em' }}>
              {jugado ? 'Finalizado' : horas || 'Por programar'}
            </Typography>
          )}
        </Box>

        {(golesLocal.length > 0 || golesVisit.length > 0) && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${PUB.line}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box>
              {golesLocal.map((g, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
                  <SportsSoccerIcon sx={{ fontSize: 10, color: PUB.cyan }} />
                  <Typography noWrap sx={{ fontFamily: FONT_BODY, fontSize: 11, color: PUB.fgDim }}>{g.jugador} {g.minuto}'</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              {golesVisit.map((g, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4, justifyContent: 'flex-end' }}>
                  <Typography noWrap sx={{ fontFamily: FONT_BODY, fontSize: 11, color: PUB.fgDim }}>{g.jugador} {g.minuto}'</Typography>
                  <SportsSoccerIcon sx={{ fontSize: 10, color: PUB.cyan }} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 1.75, display: 'flex', justifyContent: 'center' }}>
          <Box component="button" type="button" onClick={() => onFormacion(p)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: PUB.cyan, bgcolor: PUB.blueSoft, border: `1px solid ${PUB.lineStrong}`, px: 2, py: 0.75, borderRadius: 100, cursor: 'pointer', transition: 'all .2s', '&:hover': { bgcolor: 'rgba(0,240,255,.25)', color: PUB.fg } }}>
            <GroupsIcon sx={{ fontSize: 14 }} />
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
  color: active ? PUB.cyan : PUB.fgDim,
  '& svg': { fontSize: 20 },
  '&:hover': { color: active ? PUB.cyan : PUB.fg },
})

function RowTeam({ nombre, win, align }) {
  const badge = <TeamBadge name={nombre} size={20} />
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, minWidth: 0,
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    }}>
      {align !== 'right' && badge}
      <Typography noWrap sx={{ fontSize: 13, fontWeight: win ? 800 : 500, color: win ? PUB.fg : PUB.fgDim }}>
        {nombre}
      </Typography>
      {align === 'right' && badge}
    </Box>
  )
}

const ROLE_COLORS = { POR: '#f39c12', DEF: '#4aa3ff', MED: '#2ecc71', DEL: '#ff5b5b', OTROS: '#90a4ae' }

function PlayerToken({ j, rol }) {
  return (
    <Box title={`${j.nombre} · camiseta ${j.numero}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 0.3 }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '50%', bgcolor: ROLE_COLORS[rol] || ROLE_COLORS.OTROS, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11,
        fontVariantNumeric: 'tabular-nums', border: '1.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.35)',
      }}>
        {j.numero}
      </Box>
      <Typography sx={{
        fontSize: 8.5, lineHeight: 1.15, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.7)',
        maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.15,
      }}>
        {j.nombre}
      </Typography>
    </Box>
  )
}

function SuplentesTable({ titulo, jugadores }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: PUB.muted, textTransform: 'uppercase', mb: 0.75 }}>{titulo}</Typography>
      <Box sx={{ border: `1px solid ${PUB.line}`, borderRadius: 1.5, overflow: 'hidden' }}>
        <Box sx={{
          display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', px: 1.25, py: 0.6,
          bgcolor: 'rgba(0,0,0,.28)', borderBottom: `1px solid ${PUB.line}`,
        }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: PUB.muted }}>N°</Typography>
          <Typography sx={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: PUB.muted }}>Jugador</Typography>
        </Box>
        {jugadores.length ? jugadores.map((j, i) => (
          <Box key={j.jugador_id} sx={{
            display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', px: 1.25, py: 0.55, alignItems: 'center',
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.04)',
            bgcolor: i % 2 ? 'rgba(255,255,255,.015)' : 'transparent',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: PUB.cyan, fontVariantNumeric: 'tabular-nums' }}>{j.numero}</Typography>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 500, color: PUB.fgDim }}>{j.nombre}</Typography>
          </Box>
        )) : (
          <Box sx={{ px: 1.25, py: 0.9 }}>
            <Typography sx={{ fontSize: 11, color: PUB.muted, opacity: 0.7 }}>Sin suplentes.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function FixtureRow({ p, fav, onFav, onOpen, delay, last, prob, forma }) {
  const jugado = !NO_RESULTADO.includes(p.resultado)
  const postergado = p.resultado === 'POSTERGADO'
  const enVivo = estaEnVivo(p)

  const d = p.fecha_programada ? new Date(p.fecha_programada) : null
  const hora = d && !Number.isNaN(d.getTime())
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const localWin = jugado && (p.resultado === 'LOCAL_GANO' || p.resultado === 'W_LOCAL')
  const visWin = jugado && (p.resultado === 'VISITANTE_GANO' || p.resultado === 'W_VISITANTE')

  const tieneMarcador = jugado || (enVivo && p.goles_local != null && p.goles_visitante != null)
  const centro = tieneMarcador
    ? `${p.goles_local ?? 0} - ${p.goles_visitante ?? 0}`
    : postergado ? 'Postergado' : enVivo ? '● En vivo' : hora

  const centroSx = tieneMarcador
    ? { color: PUB.fg, fontWeight: 800, fontSize: { xs: 13.5, sm: 15 } }
    : postergado
      ? { color: PUB.yellow, fontWeight: 700, fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase' }
      : enVivo
        ? { color: PUB.live, fontWeight: 800, fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase' }
        : { color: PUB.fgDim, fontWeight: 700, fontSize: 12.5 }

  const showProb = !jugado && !enVivo && prob

  return (
    <Box
      className="pl-slide-in"
      onClick={() => onOpen(p)}
      sx={{
        animationDelay: `${0.1 + delay * 0.04}s`,
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,.05)',
        bgcolor: enVivo ? 'rgba(255,51,68,.05)' : 'transparent',
        cursor: 'pointer', transition: 'background .2s',
        '&:hover': { bgcolor: 'rgba(255,255,255,.035)' },
      }}
    >
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '30px minmax(0,1fr) auto minmax(0,1fr)',
        alignItems: 'center', gap: { xs: 0.8, sm: 1.2 },
        px: { xs: 1.25, sm: 2 }, py: 1,
      }}>
        <Box
          component="button"
          aria-label="Favorito"
          onClick={(e) => { e.stopPropagation(); onFav(`m${p.id}`) }}
          sx={starBtn(fav)}
        >
          {fav ? <StarIcon /> : <StarBorderIcon />}
        </Box>

        <RowTeam nombre={p.equipo_local} win={localWin} align="right" />

        <Typography sx={{
          fontFamily: FONT_DISPLAY, fontVariantNumeric: 'tabular-nums', textAlign: 'center',
          minWidth: 54, px: 0.5, whiteSpace: 'nowrap', ...centroSx,
        }}>
          {centro}
        </Typography>

        <RowTeam nombre={p.equipo_visitante} win={visWin} align="left" />
      </Box>

      {showProb && (
        <Box sx={{ pb: 0.6, px: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.1 }}>
          <Box title="Últimos 5 encuentros (local)" sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {(forma?.[p.equipo_local_id] || []).map((f) => <FormaIcon key={f.j} o={f.o} j={f.j} size={11} />)}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: PUB.green, letterSpacing: '.03em' }}>{prob.local}%</Typography>
            <Typography sx={{ fontSize: 9, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: PUB.muted }}>{prob.empate}%</Typography>
            <Typography sx={{ fontSize: 9, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: PUB.red, letterSpacing: '.03em' }}>{prob.visitante}%</Typography>
          </Box>
          <Box title="Últimos 5 encuentros (visitante)" sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {(forma?.[p.equipo_visitante_id] || []).map((f) => <FormaIcon key={f.j} o={f.o} j={f.j} size={11} />)}
          </Box>
        </Box>
      )}
    </Box>
  )
}

/* ============================================================
 * PANEL: RESULTADOS (pestañas por jornada)
 * ============================================================ */
function ResultadosPanel({ jornadas, loading, onOpenPartido, onClasificacion, torneoNombre, statsIndex }) {
  const [favs, toggleFav] = useFavoritos()
  const forma = useFormaPorEquipo(jornadas)
  const sorted = useMemo(() => [...(jornadas || [])].sort((a, b) => (a.jornada || 0) - (b.jornada || 0)), [jornadas])

  // Jornada por defecto: la que tiene un partido en vivo; si no, la primera pendiente; si no, la última.
  const defaultIdx = useMemo(() => {
    if (!sorted.length) return 0
    const vivo = sorted.findIndex((j) => (j.partidos || []).some(estaEnVivo))
    if (vivo >= 0) return vivo
    const pend = sorted.findIndex((j) => (j.partidos || []).some((p) => NO_RESULTADO.includes(p.resultado)))
    if (pend >= 0) return pend
    return sorted.length - 1
  }, [sorted])

  const [tab, setTab] = useState(defaultIdx)
  const [prevLen, setPrevLen] = useState(sorted.length)
  if (sorted.length !== prevLen) {
    setPrevLen(sorted.length)
    setTab(defaultIdx)
  }

  if (loading) return <PendingOrBar />
  if (!sorted.length) return <Empty text="No hay partidos cargados todavía." />

  const activo = Math.min(tab, sorted.length - 1)
  const activa = sorted[activo]
  const partidos = activa.partidos || []

  return (
    <Box className="pl-fade-up">
      {/* Pestañas por jornada */}
      <Box sx={{
        display: 'flex', gap: 1, mb: 2, overflowX: 'auto', pb: 0.75,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,.15)', borderRadius: 3 },
      }}>
        {sorted.map((j, i) => {
          const isActive = i === activo
          const enVivo = (j.partidos || []).some(estaEnVivo)
          return (
            <Box
              key={`j${j.jornada}`}
              component="button"
              type="button"
              onClick={() => setTab(i)}
              sx={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 0.75,
                fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: '.04em',
                textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer',
                px: 1.75, py: 0.9, borderRadius: 100,
                color: isActive ? '#020621' : PUB.fgDim,
                bgcolor: isActive ? PUB.cyan : 'rgba(255,255,255,.04)',
                border: `1px solid ${isActive ? PUB.cyan : PUB.line}`,
                transition: 'all .2s',
                '&:hover': { color: isActive ? '#020621' : PUB.fg, borderColor: PUB.lineStrong },
              }}
            >
              {enVivo && <Box component="span" className="pl-blink" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isActive ? '#020621' : PUB.live }} />}
              Jornada {j.jornada}
            </Box>
          )
        })}
      </Box>

      {/* Partidos de la jornada activa */}
      <Box sx={{ overflow: 'hidden', borderRadius: 1.5, border: `1px solid ${PUB.line}`, bgcolor: 'rgba(5,12,30,.75)', boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, bgcolor: 'rgba(16,32,66,.9)', borderBottom: `1px solid ${PUB.line}` }}>
          <Typography noWrap sx={{ flex: 1, fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.fg }}>
            {torneoNombre ? `${torneoNombre} · ` : ''}Jornada {activa.jornada}
          </Typography>
          <Typography sx={{ fontFamily: FONT_BODY, fontSize: 11, color: PUB.muted, whiteSpace: 'nowrap' }}>
            {partidos.length} {partidos.length === 1 ? 'partido' : 'partidos'}
          </Typography>
          {onClasificacion && (
            <Box
              component="button"
              type="button"
              onClick={onClasificacion}
              sx={{
                fontSize: 12, fontWeight: 600, color: PUB.fg, background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3, whiteSpace: 'nowrap',
                '&:hover': { color: PUB.cyan },
              }}
            >
              Clasificación
            </Box>
          )}
        </Box>
        {partidos.map((p, i) => (
          <FixtureRow key={p.id} p={p} delay={i} last={i === partidos.length - 1} fav={favs.has(`m${p.id}`)} onFav={toggleFav} onOpen={onOpenPartido} prob={matchProbabilities(p, statsIndex)} forma={forma} />
        ))}
      </Box>
    </Box>
  )
}

/* ============================================================
 * PANEL: POSICIONES (tabla estilo TV)
 * ============================================================ */
function FormaIcon({ o, j, size = 14 }) {
  const meta = { G: { c: PUB.green, label: 'Ganado' }, E: { c: PUB.fgDim, label: 'Empate' }, P: { c: PUB.red, label: 'Perdido' } }[o] || { c: PUB.muted, label: o }
  return (
    <Box title={`${meta.label} · Jornada ${j}`} sx={{
      width: size, height: size, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: `${meta.c}26`, border: `1px solid ${meta.c}`, color: meta.c,
      fontSize: Math.max(6.5, Math.round(size * 0.55)), fontWeight: 800, fontFamily: FONT_DISPLAY, flexShrink: 0,
    }}>
      {o}
    </Box>
  )
}

// Últimos 5 resultados por equipo (G/E/P) usando los ids de los partidos.
function useFormaPorEquipo(jornadas) {
  const flat = useMemo(() => (jornadas || []).flatMap((j) => j.partidos || []), [jornadas])
  return useMemo(() => {
    const m = {}
    for (const p of flat) {
      if (NO_RESULTADO.includes(p.resultado)) continue
      const res = p.resultado
      const lo = (res === 'LOCAL_GANO' || res === 'W_LOCAL') ? 'G' : (res === 'EMPATE' ? 'E' : 'P')
      const vo = (res === 'VISITANTE_GANO' || res === 'W_VISITANTE') ? 'G' : (res === 'EMPATE' ? 'E' : 'P')
      ;(m[p.equipo_local_id] = m[p.equipo_local_id] || []).push({ o: lo, j: p.jornada })
      ;(m[p.equipo_visitante_id] = m[p.equipo_visitante_id] || []).push({ o: vo, j: p.jornada })
    }
    Object.keys(m).forEach((k) => { m[k] = m[k].slice(-5).reverse() })
    return m
  }, [flat])
}

function PosicionesPanel({ posiciones, jornadas, loading }) {
  const formaPorEquipo = useFormaPorEquipo(jornadas)

  if (loading) return <PendingOrBar />
  if (!posiciones || !posiciones.length) return <Empty text="Aún no hay posiciones." />

  const template = { xs: '2.2rem 1fr 3rem 3rem 3rem 3rem 3.4rem', md: '2.4rem 1fr 3.2rem 3.2rem 3.2rem 3.2rem 3.2rem 3.2rem 3.2rem 6.5rem 4.2rem' }
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
          <Typography sx={{ ...hCell, display: { xs: 'none', md: 'block' } }}>Forma</Typography>
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
                <Box sx={{ minWidth: 0, lineHeight: 1.1 }}>
                  <Typography noWrap sx={{ fontSize: { xs: 13.5, sm: 15 }, fontWeight: 600, textTransform: 'uppercase', color: PUB.fg }}>{r.equipo}</Typography>
                  <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 0.3, mt: 0.6 }}>
                    {(formaPorEquipo[r.equipo_id] || []).map((f) => <FormaIcon key={f.j} o={f.o} j={f.j} />)}
                  </Box>
                </Box>
              </Box>
              <Typography sx={centerNum(null)}>{r.PJ}</Typography>
              <Typography sx={centerNum(null)}>{r.PG}</Typography>
              <Typography sx={centerNum(null)}>{r.PE}</Typography>
              <Typography sx={centerNum(null)}>{r.PP}</Typography>
              <Typography sx={{ ...centerNum(null), display: { xs: 'none', md: 'block' } }}>{r.GF}</Typography>
              <Typography sx={{ ...centerNum(null), display: { xs: 'none', md: 'block' } }}>{r.GC}</Typography>
              <Typography sx={{ ...centerNum(null), display: { xs: 'none', md: 'block' } }}>{r.DF > 0 ? `+${r.DF}` : r.DF}</Typography>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.45, alignItems: 'center', justifyContent: 'center' }}>
                {(formaPorEquipo[r.equipo_id] || []).map((f) => <FormaIcon key={f.j} o={f.o} j={f.j} />)}
              </Box>
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
      <Box className="pl-fade-up" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 4 }}>
        {[
          ['Goles totales', resumen?.goles_totales ?? 0],
          ['Goles por partido', resumen?.goles_partido ?? 0],
          ['Tarjetas rojas', resumen?.rojas ?? 0],
          ['Tarjetas amarillas', resumen?.amarillas ?? 0],
        ].map(([label, value]) => (
          <Box key={label} className="pl-fade-up" sx={{ background: PUB.panel, border: `1px solid ${PUB.line}`, borderRadius: 2, p: 2, textAlign: 'center' }}>
            <Typography className="pl-big-stat" sx={{ fontSize: 22 }}>{value}</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 9, color: PUB.fgDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${PUB.line}`, mb: 2.5 }}>
        <TabBtn active={sub === 'goleadores'} onClick={() => setSub('goleadores')} sx={{ fontSize: 15 }}>Goleadores</TabBtn>
        <TabBtn active={sub === 'sanciones'} onClick={() => setSub('sanciones')} sx={{ fontSize: 15 }}>Sanciones</TabBtn>
      </Box>

      {sub === 'goleadores' ? (
        !goleadores || !goleadores.length ? <Empty text="No hay goles registrados todavía." /> : (
          <Box className="pl-fade-up" sx={{ overflow: 'hidden', borderRadius: 1.5, border: `1px solid ${PUB.line}`, bgcolor: 'rgba(5,12,30,.75)', boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 72px', alignItems: 'center', px: 2, py: 1.25, bgcolor: 'rgba(16,32,66,.9)', borderBottom: `1px solid ${PUB.line}` }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted }}>Pos</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted }}>Jugador</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted, textAlign: 'right' }}>Goles</Typography>
            </Box>
            {goleadores.map((g, i) => (
              <Box className="pl-slide-in" key={g.jugador_id} sx={{
                animationDelay: `${0.1 + i * 0.04}s`,
                display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 72px', alignItems: 'center',
                px: 2, py: 1, borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.04)',
                bgcolor: i % 2 ? 'rgba(255,255,255,.015)' : 'transparent',
                transition: 'background .2s',
                '&:hover': { background: 'rgba(255,255,255,.03)' },
              }}>
                <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, color: i < 3 ? PUB.gold : PUB.muted }}>{g.pos}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                  <TeamBadge name={g.equipo} size={24} />
                  <Box sx={{ minWidth: 0, lineHeight: 1.15 }}>
                    <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: { xs: 13, sm: 14 }, textTransform: 'uppercase', color: PUB.fg }}>{g.jugador}</Typography>
                    <Typography noWrap sx={{ fontSize: 10.5, color: PUB.fgDim }}>{g.equipo}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                  <Box className="pl-stat-bar" sx={{ width: { xs: 38, sm: 56 }, display: { xs: 'none', sm: 'block' }, height: 4 }}>
                    <Box className="pl-stat-bar-fill" sx={{ width: `${Math.round((g.goles / max) * 100)}%` }} />
                  </Box>
                  <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, color: PUB.fg, width: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{g.goles}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )
      ) : (
        !sanciones || !sanciones.length ? <Empty text="No hay sanciones registradas." /> : (
          <Box className="pl-fade-up" sx={{ overflow: 'hidden', borderRadius: 1.5, border: `1px solid ${PUB.line}`, bgcolor: 'rgba(5,12,30,.75)', boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 84px 84px 108px', alignItems: 'center', px: 2, py: 1.25, bgcolor: 'rgba(16,32,66,.9)', borderBottom: `1px solid ${PUB.line}` }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted }}>Jugador</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted, textAlign: 'center' }}>Amarillas</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted, textAlign: 'center' }}>Rojas</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: PUB.muted, textAlign: 'right' }}>Estado</Typography>
            </Box>
            {sanciones.map((s, i) => (
              <Box className="pl-slide-in" key={s.jugador_id} sx={{
                animationDelay: `${0.1 + i * 0.04}s`,
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 84px 84px 108px', alignItems: 'center',
                px: 2, py: 1, borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.04)',
                bgcolor: i % 2 ? 'rgba(255,255,255,.015)' : 'transparent',
                transition: 'background .2s',
                '&:hover': { background: 'rgba(255,255,255,.03)' },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                  <TeamBadge name={s.equipo} size={24} />
                  <Box sx={{ minWidth: 0, lineHeight: 1.15 }}>
                    <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: { xs: 13, sm: 14 }, textTransform: 'uppercase', color: PUB.fg }}>{s.jugador}</Typography>
                    <Typography noWrap sx={{ fontSize: 10.5, color: PUB.fgDim }}>{s.equipo}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Box component="span" sx={{ width: 9, height: 9, borderRadius: 3, bgcolor: PUB.yellow, flexShrink: 0 }} />
                  <Typography sx={{ color: PUB.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{s.amarillas}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Box component="span" sx={{ width: 9, height: 9, borderRadius: 3, bgcolor: PUB.red, flexShrink: 0 }} />
                  <Typography sx={{ color: PUB.fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{s.rojas}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {s.suspendido
                    ? <Typography sx={{ fontSize: 9, fontWeight: 800, color: PUB.live, bgcolor: PUB.liveSoft, border: `1px solid ${PUB.live}`, px: 1.2, py: 0.4, borderRadius: 100, letterSpacing: '.06em' }}>Suspendido</Typography>
                    : <Typography sx={{ fontSize: 9, fontWeight: 800, color: PUB.green, bgcolor: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.4)', px: 1.2, py: 0.4, borderRadius: 100, letterSpacing: '.06em' }}>Disponible</Typography>}
                </Box>
              </Box>
            ))}
          </Box>
        )
      )}
    </Box>
  )
}

/* ============================================================
 * MODAL DE PARTIDO
 * ============================================================ */
function MatchModal({ partido, onClose, onFormacion }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['pl-eventos', partido.id],
    queryFn: () => apiGet(`/landing/partido/${partido.id}/eventos`),
  })
  const eventos = data?.eventos || []
  const jugado = !NO_RESULTADO.includes(partido.resultado)
  const enVivo = estaEnVivo(partido)
  const horas = FORMAT_FECHA(partido.fecha_programada, true)

  const handleStream = useCallback((data) => {
    if (data.eventos) {
      qc.invalidateQueries({ queryKey: ['pl-eventos', partido.id] })
      qc.invalidateQueries({ queryKey: ['pl-alineaciones', partido.id] })
      qc.invalidateQueries({ queryKey: ['pl-partidos'] })
    }
  }, [qc, partido.id])
  usePartidoStream(partido.id, enVivo, handleStream)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const amarillas = eventos.filter((e) => e.tipo === 'TARJETA_AMARILLA').length
  const rojas = eventos.filter((e) => e.tipo === 'TARJETA_ROJA').length
  const marcador = marcadorDesdeEventos(eventos, partido.equipo_local, partido.equipo_visitante)
  // Partido jugado: el marcador oficial (almacenado) manda sobre el conteo de
  // eventos, para que la ficha sea coherente con Resultados y Posiciones.
  const goles = jugado
    ? (partido.goles_local ?? 0) + (partido.goles_visitante ?? 0)
    : marcador.golesLocal + marcador.golesVisit
  const mostrarMarcador = jugado || enVivo
  const scoreLocal = enVivo ? marcador.golesLocal : partido.goles_local
  const scoreVisit = enVivo ? marcador.golesVisit : partido.goles_visitante

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
          {mostrarMarcador ? (
            <ScoreBox>
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, color: PUB.fg, fontVariantNumeric: 'tabular-nums' }}>{scoreLocal}</Typography>
              <Typography sx={{ color: PUB.fgDim, fontSize: 18 }}>-</Typography>
              <Typography sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, color: PUB.fg, fontVariantNumeric: 'tabular-nums' }}>{scoreVisit}</Typography>
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
  const qc = useQueryClient()
  const { data, isError } = useQuery({
    queryKey: ['pl-alineaciones', partido.id],
    queryFn: () => apiGet(`/landing/partido/${partido.id}/alineaciones`),
    retry: 0,
  })

  const handleStream = useCallback((data) => {
    if (data.eventos) qc.invalidateQueries({ queryKey: ['pl-alineaciones', partido.id] })
  }, [qc, partido.id])
  usePartidoStream(partido.id, estaEnVivo(partido), handleStream)

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
  const FORMACION_DEFECTO = ['POR', ...Array(4).fill('DEF'), ...Array(3).fill('MED'), ...Array(3).fill('DEL')]

  // Si el equipo no tiene posiciones cargadas (todo OTROS), se reparte en un
  // 4-3-3 por defecto para que la vista sea homogénea.
  const posicionesEfectivas = (team) => {
    const titulares = team.jugadores.filter((j) => j.titular)
    const tienePos = titulares.some((j) => j.posicion && j.posicion !== 'OTROS')
    if (tienePos) return titulares.map((j) => ({ ...j, posicion: j.posicion || 'OTROS' }))
    return titulares.map((j, i) => ({ ...j, posicion: FORMACION_DEFECTO[i] || 'OTROS' }))
  }

  const tactic = (team) => {
    const titulares = posicionesEfectivas(team)
    const nums = POS_ORDER.slice(1, 4).map((p) => titulares.filter((j) => j.posicion === p).length)
    if (nums.every((n) => n === 0)) return '4-3-3'
    return nums.join('-')
  }

  const gruposPorRol = (titulares) => {
    const grupos = { POR: [], DEF: [], MED: [], DEL: [], OTROS: [] }
    titulares.forEach((j) => {
      const rol = POS_ORDER.includes(j.posicion) ? j.posicion : 'OTROS'
      grupos[rol].push(j)
    })
    Object.keys(grupos).forEach((k) => grupos[k].sort((a, b) => (a.orden || 0) - (b.orden || 0)))
    return grupos
  }

  return createPortal(
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300 }}>
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(3,8,18,.75)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        '@media (min-width:900px)': { bottom: 'auto', top: '50%', left: '50%', right: 'auto', transform: 'translate(-50%,-50%)', maxWidth: 720, width: '100%', maxHeight: '85vh' },
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
              (() => {
                const local = equipos.find((t) => t.nombre === partido.equipo_local) || equipos[0]
                const visitante = equipos.find((t) => t.nombre === partido.equipo_visitante) || equipos[1] || equipos[0]
                const suplentesDe = (team) => (team.jugadores || []).filter((j) => !j.titular)

                const encabezado = (team, side) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, justifyContent: side === 'bottom' ? 'flex-end' : 'flex-start' }}>
                    {side === 'top' && <TeamBadge name={team.nombre} size={26} />}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: PUB.fg }}>{team.nombre}</Typography>
                      {posicionesEfectivas(team).length > 0 && (
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: PUB.cyan, bgcolor: PUB.blueSoft, border: `1px solid ${PUB.cyan}`, px: 1, py: 0.3, borderRadius: 100 }}>{tactic(team)}</Typography>
                      )}
                    </Box>
                    {side === 'bottom' && <TeamBadge name={team.nombre} size={26} />}
                  </Box>
                )

                const mitad = (team, orden) => {
                  const grupos = gruposPorRol(posicionesEfectivas(team))
                  return orden.map((rol) => {
                    const jugadores = grupos[rol]
                    if (!jugadores.length) return null
                    return (
                      <Box key={rol} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography sx={{ width: { xs: 24, sm: 32 }, fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,.85)' }}>{rol === 'OTROS' ? '⚑' : rol}</Typography>
                        {jugadores.map((j) => <PlayerToken key={j.jugador_id} j={j} rol={rol} />)}
                      </Box>
                    )
                  })
                }

                return (
                  <Box>
                    {encabezado(visitante, 'top')}

                    <Box sx={{ mt: 1.25, mb: 1.25, background: 'linear-gradient(180deg,#3a8f44,#2c6e31 50%,#1b5e20)', borderRadius: 1.5, p: 1.25, position: 'relative', overflow: 'hidden' }}>
                      <Box sx={{ position: 'absolute', top: '50%', left: 8, right: 8, borderTop: '1.5px dashed rgba(255,255,255,.4)' }} />
                      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,.3)' }} />
                      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 430 }}>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                          {mitad(visitante, ['POR', 'DEF', 'MED', 'DEL', 'OTROS'])}
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                          {mitad(local, ['OTROS', 'DEL', 'MED', 'DEF', 'POR'])}
                        </Box>
                      </Box>
                    </Box>

                    {encabezado(local, 'bottom')}

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2.5, pt: 1.5, borderTop: `1px dashed ${PUB.line}` }}>
                      <SuplentesTable titulo={local.nombre} jugadores={suplentesDe(local)} />
                      <SuplentesTable titulo={visitante.nombre} jugadores={suplentesDe(visitante)} />
                    </Box>
                  </Box>
                )
              })()
            )}

            {cambios.length > 0 && (
              <Box sx={{ mt: sinFormacion ? 2 : 3, pt: 2, borderTop: `1px solid ${PUB.line}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                  <SwapHorizIcon sx={{ fontSize: 15, color: PUB.cyan }} />
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: PUB.fg }}>Cambios</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75 }}>
                  {cambios.map((c, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.9, bgcolor: 'rgba(255,255,255,.04)', border: `1px solid ${PUB.line}`, borderRadius: 1, px: 1.25, py: 0.8 }}>
                      <Typography sx={{ flexShrink: 0, width: 24, fontSize: 11, fontWeight: 800, color: PUB.cyan, fontVariantNumeric: 'tabular-nums' }}>{c.minuto}'</Typography>
                      <Typography noWrap sx={{ minWidth: 0, flex: 1, fontSize: 11, color: PUB.red, fontWeight: 600, textDecoration: 'line-through', opacity: .85 }}>{c.sale}</Typography>
                      <SwapHorizIcon sx={{ flexShrink: 0, fontSize: 13, color: PUB.muted }} />
                      <Typography noWrap sx={{ minWidth: 0, flex: 1, fontSize: 11, color: PUB.green, fontWeight: 700 }}>{c.entra}</Typography>
                      {c.equipo && <Typography sx={{ flexShrink: 0, fontSize: 9.5, color: PUB.muted, letterSpacing: '.04em', textTransform: 'uppercase' }}>{c.equipo}</Typography>}
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
  const statsIndex = buildStatsIndex(selQueries.tabla.data?.posiciones)

  const hayEnVivo = jornadas.some((j) => (j.partidos || []).some(estaEnVivo))

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
            <Box component="span" sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
              color: hayEnVivo ? PUB.live : PUB.muted,
              bgcolor: hayEnVivo ? PUB.liveSoft : 'rgba(255,255,255,.03)',
              border: `1px solid ${hayEnVivo ? PUB.live : PUB.line}`,
              px: 1.4, py: 0.5, borderRadius: 100,
            }}>
              <Box component="span" className={hayEnVivo ? 'pl-blink' : ''} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: hayEnVivo ? PUB.live : PUB.line }} />
              En vivo
            </Box>
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

            {tab === 'resultados' && <ResultadosPanel key={`r${selId}`} jornadas={jornadas} loading={tabLoading} onOpenPartido={setModal} onClasificacion={() => setTab('posiciones')} torneoNombre={selTorneo?.nombre} statsIndex={statsIndex} />}
            {tab === 'posiciones' && <PosicionesPanel posiciones={selQueries.tabla.data?.posiciones} jornadas={jornadas} loading={tabLoading} />}
            {tab === 'estadisticas' && <EstadisticasPanel key={`e${selId}`} resumen={selQueries.resumen.data} goleadores={selQueries.goleadores.data?.goleadores} sanciones={selQueries.sanciones.data?.sanciones} loading={tabLoading} />}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', height: 60 }}>
          {TABS.map((t) => {
            const Icon = { resultados: SportsSoccerIcon, posiciones: FormatListNumberedIcon, estadisticas: BarChartIcon }[t.key]
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