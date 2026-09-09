// Paleta estilo UEFA Champions League (tema premium navy + cyan neón).
export const PUB = {
  bgTop: '#020621',
  bg: '#020621',
  bgBottom: '#020621',
  panel: 'rgba(255,255,255,.03)',
  panelDeep: 'rgba(0,0,0,.4)',
  line: 'rgba(255,255,255,.05)',
  lineStrong: 'rgba(0,240,255,.35)',
  fg: '#ffffff',
  fgDim: '#c6cbe0',
  muted: '#a0a5c0',
  live: '#ff3344',
  liveSoft: 'rgba(255,51,68,.15)',
  gold: '#00f0ff',
  goldSoft: 'rgba(0,240,255,.12)',
  blue: '#0044ee',
  cyan: '#00f0ff',
  blueSoft: 'rgba(0,240,255,.12)',
  green: '#00ff66',
  yellow: '#ffaa00',
  red: '#ff3344',
}

export const FONT_DISPLAY = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif'
export const FONT_BODY = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif'

export const ESTADO_META = {
  CREADO: ['Creado', 'neutral'],
  INSCRIPCIONES_ABIERTAS: ['Inscripciones abiertas', 'success'],
  INSCRIPCIONES_CERRADAS: ['Inscripciones cerradas', 'warn'],
  SORTEADO: ['Sorteado', 'accent'],
  EN_JUEGO: ['En juego', 'live'],
  FINALIZADO: ['Finalizado', 'muted'],
}

export const ESTADO_COLOR = {
  neutral: '#8b94a3',
  success: PUB.green,
  warn: PUB.yellow,
  accent: PUB.cyan,
  live: PUB.live,
  muted: '#b6bfcc',
}

export const contrastText = (hex) => {
  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#020621' : '#ffffff'
}

export const FORMAT_FECHA = (iso, withTime = false) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

// Chip de equipo uniforme azul eléctrico con borde cyan (estilo UCL)
export const teamStyle = () => ({
  g: 'linear-gradient(135deg, #0b2a6b 0%, #061138 100%)',
  b: 'rgba(0,240,255,.5)',
  t: '#eaf6ff',
})

export const teamAbbr = (name) => {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}