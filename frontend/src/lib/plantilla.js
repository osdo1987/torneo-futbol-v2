import * as XLSX from 'xlsx'

const POSICIONES = ['ARQUERO', 'DEFENSOR', 'MEDIOCAMPISTA', 'DELANTERO']
const PIERNAS = ['DERECHA', 'IZQUIERDA', 'AMBIDESTRO']

const COLS = {
  nombre: {
    headers: ['nombre', 'jugador', 'nombre jugador', 'nombre y apellido', 'apellido y nombre', 'apellido', 'nombre completo'],
  },
  numero_camiseta: {
    headers: ['n', 'num', 'numero', 'camiseta', 'n camiseta', 'n° camiseta', 'número de camiseta'],
  },
  documento_identidad: {
    headers: ['documento', 'dni', 'documento identidad', 'n documento', 'carnet', 'cedula', 'cédula', 'id'],
  },
  posicion: {
    headers: ['posicion', 'posición', 'puesto', 'rol'],
  },
  fecha_nacimiento: {
    headers: ['fecha nacimiento', 'fecha de nacimiento', 'nacimiento', 'f.nacimiento', 'fecha'],
  },
  telefono: {
    headers: ['telefono', 'teléfono', 'celular', 'cel', 'contacto'],
  },
  pierna_habil: {
    headers: ['pierna habil', 'pierna hábil', 'pierna', 'pie habil', 'pie', 'pierna dominante'],
  },
  altura_cm: {
    headers: ['altura', 'altura cm', 'altura (cm)', 'talla'],
  },
}

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function valorCelda(v) {
  if (v === undefined || v === null) return ''
  if (v instanceof Date) return fmtFecha(v)
  return String(v).trim()
}

function fmtFecha(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

function parseFecha(v) {
  if (v === undefined || v === null || v === '') return ''
  if (v instanceof Date) return fmtFecha(v)
  if (typeof v === 'number' && isFinite(v) && v > 0) {
    const ms = (v - 25569) * 86400000
    const d = new Date(ms)
    if (d.getUTCFullYear() < 1901 || d.getUTCFullYear() > 2100) return ''
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }
  const t = String(v).trim()
  let m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (m) {
    let [d, mm, y] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
    if (mm > 12 && d <= 12) [d, mm] = [mm, d]
    if (d < 1 || d > 31 || mm < 1 || mm > 12) return ''
    return `${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  m = t.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (m) {
    const [y, mm, d] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
    if (d < 1 || d > 31 || mm < 1 || mm > 12) return ''
    return `${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? '' : fmtFecha(d)
}

function mapPosicion(v) {
  const n = norm(v)
  if (!n) return ''
  for (const p of POSICIONES) if (norm(p) === n) return p
  if (['arquero', 'arq', 'portero', 'guardameta'].includes(n)) return 'ARQUERO'
  if (['defensor', 'defens', 'defensa', 'zaguero', 'lateral', 'cargillero'].includes(n)) return 'DEFENSOR'
  if (['mediocampista', 'mediocamp', 'medio', 'volante', 'mc', 'mcd', 'engache'].includes(n)) return 'MEDIOCAMPISTA'
  if (['delantero', 'delanter', 'delan', 'extrem', 'punta', 'nueve', 'centrodelantero'].includes(n)) return 'DELANTERO'
  return v.toUpperCase().trim()
}

function mapPierna(v) {
  const n = norm(v)
  if (!n) return ''
  if (['derecha', 'd'].includes(n)) return 'DERECHA'
  if (['izquierda', 'i'].includes(n)) return 'IZQUIERDA'
  if (['ambidestro', 'ambidestra', 'ambidiestro', 'ambos', 'b', 'bd', 'amb'].includes(n)) return 'AMBIDESTRO'
  return v.toUpperCase().trim()
}

function numeroEntero(v) {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : ''
}

function alturaEntero(v) {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) && Number.isInteger(n) && n >= 100 && n <= 250 ? n : ''
}

function detectarEquipo(rows, headerIdx) {
  const limite = Math.min(headerIdx, 3)
  for (let i = 0; i <= limite; i++) {
    const fila = rows[i] || []
    for (let c = 0; c < Math.min(fila.length, 12); c++) {
      const v = valorCelda(fila[c])
      const n = norm(v)
      if (n.startsWith('equipo')) {
        const resto = n.replace(/^equipo\s*[:=]?\s*/, '')
        if (resto) return resto
      }
      if (n.startsWith('plantilla') || n.startsWith('club') || n.startsWith('delegacion') || n.startsWith('delegación')) {
        const resto = v.replace(/^[^:]*[:]?\s*/, '').trim()
        if (norm(resto)) return resto
      }
      const sig = valorCelda(fila[c + 1])
      if (['equipo', 'nombre del equipo', 'club', 'institucion', 'institución'].includes(n) && sig) return sig
    }
  }
  return ''
}

function detectarCabecera(rows) {
  const headerMap = {}
  for (const [key, def] of Object.entries(COLS)) {
    for (const h of def.headers) headerMap[norm(h)] = key
  }
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const fila = rows[i] || []
    let colMap = {}
    let encontradas = 0
    fila.forEach((celda, c) => {
      const key = headerMap[norm(valorCelda(celda))]
      if (key) {
        colMap[key] = c
        encontradas++
      }
    })
    if (encontradas >= 2 && colMap.nombre !== undefined) return { idx: i, colMap }
  }
  return null
}

function parseCsvText(texto) {
  const txt = String(texto).replace(/^\uFEFF/, '')
  const primera = txt.split(/\r?\n/).find((l) => l.trim() !== '') || ''
  const nPuntoComa = (primera.match(/;/g) || []).length
  const nComa = (primera.match(/,/g) || []).length
  const sep = nPuntoComa > nComa ? ';' : ','
  const filas = []
  let fila = []
  let campo = ''
  let entreComillas = false
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i]
    if (entreComillas) {
      if (ch === '"') {
        if (txt[i + 1] === '"') { campo += '"'; i++ }
        else entreComillas = false
      } else campo += ch
    } else if (ch === '"') {
      entreComillas = true
    } else if (ch === sep) {
      fila.push(campo)
      campo = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && txt[i + 1] === '\n') i++
      fila.push(campo)
      campo = ''
      if (fila.some((c) => c.replace(/\s/g, '') !== '')) filas.push(fila)
      fila = []
    } else {
      campo += ch
    }
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo)
    if (fila.some((c) => c.replace(/\s/g, '') !== '')) filas.push(fila)
  }
  return filas
}

function construyePlantilla(rows) {
  const cab = detectarCabecera(rows)
  if (!cab) throw new Error('No encontré las columnas de jugadores en la plantilla')
  const equipo = detectarEquipo(rows, cab.idx)
  const { colMap } = cab
  const jugadores = []
  for (let i = cab.idx + 1; i < rows.length; i++) {
    const fila = rows[i] || []
    const filaNro = i + 1
    if (fila.every((c) => valorCelda(c) === '')) continue
    const j = {
      _fila: filaNro,
      nombre: valorCelda(fila[colMap.nombre]),
      numero_camiseta: colMap.numero_camiseta !== undefined ? numeroEntero(fila[colMap.numero_camiseta]) : '',
      documento_identidad: colMap.documento_identidad !== undefined ? valorCelda(fila[colMap.documento_identidad]) : '',
      posicion: colMap.posicion !== undefined ? mapPosicion(fila[colMap.posicion]) : '',
      fecha_nacimiento: colMap.fecha_nacimiento !== undefined ? parseFecha(fila[colMap.fecha_nacimiento]) : '',
      telefono: colMap.telefono !== undefined ? valorCelda(fila[colMap.telefono]) : '',
      pierna_habil: colMap.pierna_habil !== undefined ? mapPierna(fila[colMap.pierna_habil]) : '',
      altura_cm: colMap.altura_cm !== undefined ? alturaEntero(fila[colMap.altura_cm]) : '',
    }
    jugadores.push(j)
  }
  return { equipo, jugadores }
}

export async function parseExcel(file) {
  let rows
  try {
    if (/\.(csv|txt)$/i.test(file.name)) {
      const text = await file.text()
      rows = parseCsvText(text)
    } else {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    }
  } catch {
    throw new Error('El archivo no pudo leerse como Excel/CSV')
  }
  return construyePlantilla(rows)
}

export function aPayload(jugadores) {
  return jugadores.map((j) => {
    const { _fila, ...rest } = j
    const limpio = {}
    for (const [k, v] of Object.entries(rest)) {
      if (v !== '' && v !== null && v !== undefined) limpio[k] = v
    }
    return { ...limpio, _fila }
  })
}

export function descargarPlantilla(equipoNombre) {
  const rows = [
    ['EQUIPO', equipoNombre || ''],
    [],
    ['NOMBRE', 'N° CAMISETA', 'DOCUMENTO', 'POSICION', 'FECHA NACIMIENTO', 'TELEFONO', 'PIERNA HABIL', 'ALTURA CM'],
    ['Jugador Ejemplo', 10, '12345678', 'DELANTERO', '01/01/2000', '3515555555', 'DERECHA', 175],
  ]
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '')
          return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        })
        .join(',')
    )
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const nombre = String(equipoNombre || 'equipo')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
  a.href = url
  a.download = `plantilla_${nombre || 'equipo'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}