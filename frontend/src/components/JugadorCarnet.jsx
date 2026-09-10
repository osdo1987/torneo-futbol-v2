import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import ShieldIcon from '@mui/icons-material/Shield'
import BadgeIcon from '@mui/icons-material/Badge'
import CakeIcon from '@mui/icons-material/Cake'
import HeightIcon from '@mui/icons-material/Height'
import { apiPost } from '../api'
import { useToast } from './Toast'
import { fileToFotoDataURI } from '../lib/imagen'
import '../carnetPrint.css'

const POSICION_LABEL = {
  ARQUERO: 'Arquero',
  DEFENSOR: 'Defensor',
  MEDIOCAMPISTA: 'Centrocampista',
  DELANTERO: 'Delantero',
}
const PIERNA_LABEL = {
  DERECHA: 'Derecha',
  IZQUIERDA: 'Izquierda',
  AMBIDESTRO: 'Ambidestro',
}

function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function calcEdad(fecha) {
  if (!fecha) return null
  const nac = new Date(fecha)
  if (Number.isNaN(nac.getTime())) return null
  const hoy = new Date()
  let e = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--
  return e
}

function crearImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Foto inválida'))
    img.src = src
  })
}

// Iconos pequeños dibujados en canvas (DNI, cumpleaños, altura) - estilo carnet.html
function dibujarIconoDni(ctx, x, y) {
  ctx.save()
  ctx.fillStyle = '#3B82F6'
  roundRect(ctx, x, y - 5, 12, 9, 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + 4, y - 2.5, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x + 7.5, y - 2.5, 3, 3.5)
  ctx.restore()
}

function dibujarIconoCake(ctx, x, y) {
  ctx.save()
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(x + 1, y - 2, 12, 7)
  ctx.fillRect(x + 3, y - 6, 1.6, 4)
  ctx.fillRect(x + 8, y - 6, 1.6, 4)
  ctx.beginPath()
  ctx.arc(x + 3.8, y - 6.8, 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + 8.8, y - 6.8, 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function dibujarIconoRuler(ctx, x, y) {
  ctx.save()
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(x + 2, y - 8, 4, 13)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 3, y - 7, 1, 2)
  ctx.fillRect(x + 3, y - 3.6, 1, 2)
  ctx.fillRect(x + 3, y - 0.2, 1, 2)
  ctx.fillRect(x + 4.5, y - 5.3, 1, 2)
  ctx.restore()
}

// Dibuja el nombre en Cinzel con espaciado entre letras, reduciendo el tamaño si no cabe
function dibujarNombreEspaciado(ctx, nombre, x, y, maxW, espacio, fontSize) {
  if (!nombre) return
  let size = fontSize
  let width = Infinity
  while (size > 10) {
    ctx.font = `400 ${size}px "Cinzel", "Segoe UI", serif`
    width = ctx.measureText(nombre).width + espacio * Math.max(0, nombre.length - 1)
    if (width <= maxW) break
    size -= 1
  }
  ctx.fillStyle = '#111827'
  let tx = x
  for (const ch of nombre) {
    ctx.fillText(ch, tx, y)
    tx += ctx.measureText(ch).width + espacio
  }
}

// Dibuja el carnet en canvas para exportar PNG - estilo "carnet.html"
async function dibujarCarnetCanvas(canvas, { jugador, equipo, torneo, organizador }) {
  const W = 700
  const H = 400
  const papel = 28
  canvas.width = W + papel * 2
  canvas.height = H + papel * 2
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Espera a que carguen las fuentes (Cinzel / Montserrat) para mejor fidelidad
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    try { await document.fonts.ready } catch { /* no bloquea */ }
  }

  const x = papel
  const y = papel
  const w = W
  const h = H

  // Tarjeta blanca con sombra suave
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, x, y, w, h, 20)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Ondas corporativas azules (curvas exactas de carnet.html)
  ctx.save()
  roundRect(ctx, x, y, w, h, 20)
  ctx.clip()

  const sx = (v) => x + v
  const sy = (v) => y + v

  // Onda posterior / azul marino oscuro (#0A192F)
  ctx.fillStyle = '#0A192F'
  ctx.beginPath()
  ctx.moveTo(sx(0), sy(0))
  ctx.lineTo(sx(190), sy(0))
  ctx.bezierCurveTo(sx(120), sy(130), sx(90), sy(260), sx(140), sy(400))
  ctx.lineTo(sx(0), sy(400))
  ctx.closePath()
  ctx.fill()

  // Onda principal / azul marino (#1E3A8A)
  ctx.fillStyle = '#1E3A8A'
  ctx.beginPath()
  ctx.moveTo(sx(0), sy(0))
  ctx.lineTo(sx(145), sy(0))
  ctx.bezierCurveTo(sx(75), sy(130), sx(65), sy(270), sx(305), sy(400))
  ctx.lineTo(sx(0), sy(400))
  ctx.closePath()
  ctx.fill()

  // Acento fino de curva / azul brillante (#3B82F6)
  ctx.fillStyle = '#3B82F6'
  ctx.beginPath()
  ctx.moveTo(sx(115), sy(0))
  ctx.bezierCurveTo(sx(100), sy(80), sx(105), sy(150), sx(130), sy(220))
  ctx.bezierCurveTo(sx(115), sy(150), sx(115), sy(80), sx(142), sy(0))
  ctx.closePath()
  ctx.fill()

  ctx.restore()

  // Foto circular sobre la onda (izquierda 105, centrada verticalmente)
  const pr = 60
  const pcx = x + 105
  const pcy = y + h / 2
  const marcoFoto = () => {
    ctx.beginPath()
    ctx.arc(pcx, pcy, pr, 0, Math.PI * 2)
    ctx.lineWidth = 6
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
  if (jugador.foto_url) {
    try {
      const img = await crearImagen(jugador.foto_url)
      const ratio = Math.max((pr * 2) / img.width, (pr * 2) / img.height)
      const fw = img.width * ratio
      const fh = img.height * ratio
      ctx.save()
      ctx.beginPath()
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, pcx - fw / 2, pcy - fh / 2, fw, fh)
      ctx.restore()
      marcoFoto()
    } catch { /* sin foto */ }
  } else {
    const g = ctx.createLinearGradient(pcx - pr, pcy - pr, pcx + pr, pcy + pr)
    g.addColorStop(0, '#1E3A8A')
    g.addColorStop(1, '#0A192F')
    ctx.beginPath()
    ctx.arc(pcx, pcy, pr, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
    marcoFoto()
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 44px "Cinzel", "Segoe UI", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(iniciales(jugador.nombre), pcx, pcy + 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  // Número de camiseta como marca de agua (arriba a la derecha)
  const numero = String(jugador.numero_camiseta || '')
  if (numero) {
    ctx.save()
    ctx.globalAlpha = 0.1
    ctx.fillStyle = '#1E3A8A'
    ctx.font = '600 42px "Cinzel", "Segoe UI", serif'
    ctx.textAlign = 'right'
    ctx.fillText(numero, x + w - 45, y + 32)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  // Contenido (margen izquierdo 210, como en carnet.html)
  const cx = x + 210
  const cw = x + w - 45 - cx

  // Encabezado: organizador (izquierda) + torneo (derecha)
  ctx.font = '600 13px "Montserrat", "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(recortar(ctx, String(organizador || 'Torneos').toUpperCase(), cw * 0.55), cx, y + 28)
  ctx.textAlign = 'right'
  ctx.fillText(recortar(ctx, String(torneo || '').toUpperCase(), cw * 0.4), x + w - 45, y + 28)
  ctx.textAlign = 'left'
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, y + 40)
  ctx.lineTo(x + w - 45, y + 40)
  ctx.stroke()

  // Nombre (Cinzel, mayúsculas con espaciado)
  dibujarNombreEspaciado(ctx, String(jugador.nombre || '').toUpperCase(), cx, y + 80, cw, 5, 34)

  // Posición
  const pierna = jugador.pierna_habil ? ` - ${PIERNA_LABEL[jugador.pierna_habil] || jugador.pierna_habil}` : ''
  const posTxt = `${POSICION_LABEL[jugador.posicion] || 'Sin posición'}${pierna}`
  ctx.fillStyle = '#4B5563'
  ctx.font = '500 15px "Montserrat", "Segoe UI", sans-serif'
  ctx.fillText(recortar(ctx, posTxt, cw), cx, y + 106)

  // Detalles con iconos (DNI, edad, altura)
  const detY = y + 138
  let dx = cx
  const dibujarDetalle = (icono, texto) => {
    icono(ctx, dx, detY - 4)
    dx += 20
    ctx.font = '400 13px "Montserrat", "Segoe UI", sans-serif'
    ctx.fillStyle = '#4B5563'
    ctx.fillText(texto, dx, detY)
    dx += ctx.measureText(texto).width + 26
  }
  dibujarDetalle(dibujarIconoDni, `DNI ${jugador.documento_identidad || '-'}`)
  const edad = calcEdad(jugador.fecha_nacimiento)
  if (edad != null) dibujarDetalle(dibujarIconoCake, `${edad} años`)
  if (jugador.altura_cm) dibujarDetalle(dibujarIconoRuler, `${jugador.altura_cm} cm`)

  // Pie: separador + equipo + etiqueta
  const footY = y + h - 20
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, footY - 14)
  ctx.lineTo(x + w - 45, footY - 14)
  ctx.stroke()

  ctx.fillStyle = '#9CA3AF'
  ctx.font = '600 11px "Montserrat", "Segoe UI", sans-serif'
  ctx.fillText(recortar(ctx, String(equipo || '').toUpperCase(), cw * 0.5), cx, footY)
  ctx.fillStyle = '#1E3A8A'
  ctx.textAlign = 'right'
  ctx.fillText('CARNET DE JUGADOR', x + w - 45, footY)
  ctx.textAlign = 'left'
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function recortar(ctx, texto, maxW) {
  if (ctx.measureText(texto).width <= maxW) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

// SVG wave background (inline para impresión y preview) - ondas corporativas de carnet.html
const waveSVG = `
<svg viewBox="0 0 700 400" preserveAspectRatio="none" className="carnet-wave-svg" aria-hidden="true">
  <path fill="#0A192F" d="M 0,0 L 190,0 C 120,130 90,260 140,400 L 0,400 Z" />
  <path fill="#1E3A8A" d="M 0,0 L 145,0 C 75,130 65,270 305,400 L 0,400 Z" />
  <path fill="#3B82F6" d="M 115,0 C 100,80 105,150 130,220 C 115,150 115,80 142,0 Z" />
</svg>
`

export default function JugadorCarnet({ open, onClose, jugador, equipo, torneo, organizador, editableFoto = false }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const pngRef = useRef(null)
  const [foto, setFoto] = useState(null)
  const [guardandoFoto, setGuardandoFoto] = useState(false)

  useEffect(() => {
    setFoto(jugador ? jugador.foto_url : null)
  }, [jugador])

  const guardarFoto = async (file) => {
    try {
      const uri = await fileToFotoDataURI(file)
      setGuardandoFoto(true)
      await apiPost(`/jugadores/${jugador.id}/foto`, { foto_url: uri })
      setFoto(uri)
      toast.show('Foto actualizada', 'success')
    } catch (e) {
      toast.show(e.message, 'error')
    } finally {
      setGuardandoFoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const descargarPng = async () => {
    if (!pngRef.current) return
    try {
      await dibujarCarnetCanvas(pngRef.current, { jugador: { ...jugador, foto_url: foto }, equipo, torneo, organizador })
      const a = document.createElement('a')
      a.href = pngRef.current.toDataURL('image/png')
      a.download = `carnet-${String(jugador.nombre).replace(/\s+/g, '-').toLowerCase()}.png`
      a.click()
    } catch (e) {
      toast.show(e.message, 'error')
    }
  }

  const cardDom = jugador ? (
    <div className="carnet-card" role="img" aria-label={`Carnet de ${jugador.nombre}`}>
      <div className="carnet-wave" dangerouslySetInnerHTML={{ __html: waveSVG }} />
      {foto ? (
        <img className="carnet-photo" src={foto} alt={jugador.nombre} />
      ) : (
        <div className="carnet-photo carnet-photo-initials">{iniciales(jugador.nombre)}</div>
      )}
      <div className="carnet-number">{jugador.numero_camiseta || ''}</div>
      <div className="carnet-content">
        <div className="carnet-header">
          <span className="carnet-badge">
            <ShieldIcon />
            {String(organizador || 'Torneos').toUpperCase()}
          </span>
          <span className="carnet-torneo">{torneo || ''}</span>
        </div>
        <h1 className="carnet-name">{jugador.nombre}</h1>
        <p className="carnet-position">
          {POSICION_LABEL[jugador.posicion] || 'Sin posición'}
          {jugador.pierna_habil ? ` - ${PIERNA_LABEL[jugador.pierna_habil] || jugador.pierna_habil}` : ''}
        </p>
        <div className="carnet-details">
          <span><BadgeIcon /> DNI {jugador.documento_identidad || '-'}</span>
          {calcEdad(jugador.fecha_nacimiento) != null && (
            <span><CakeIcon /> {calcEdad(jugador.fecha_nacimiento)} años</span>
          )}
          {jugador.altura_cm ? <span><HeightIcon /> {jugador.altura_cm} cm</span> : null}
        </div>
        <div className="carnet-footer">
          <span className="carnet-team">{equipo || ''}</span>
          <span className="carnet-tag">CARNET DE JUGADOR</span>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {open && jugador && createPortal(<div className="carnet-print-sheet">{cardDom}</div>, document.body)}

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Carnet · {jugador?.nombre}
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {jugador && (
            <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {cardDom}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {editableFoto && (
                  <>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                      onChange={(e) => e.target.files?.[0] && guardarFoto(e.target.files[0])} />
                    <Button size="small" startIcon={<PhotoCameraIcon />} disabled={guardandoFoto}
                      onClick={() => fileRef.current?.click()}>
                      {guardandoFoto ? 'Guardando…' : foto ? 'Cambiar foto' : 'Subir foto'}
                    </Button>
                  </>
                )}
                <Tooltip title="Imprimir">
                  <IconButton onClick={() => window.print()}><PrintIcon /></IconButton>
                </Tooltip>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={descargarPng}>
                  Descargar PNG
                </Button>
              </Box>
              <canvas ref={pngRef} hidden />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" onClick={() => window.print()}>Imprimir carnet</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}