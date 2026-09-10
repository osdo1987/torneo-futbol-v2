// Lee un archivo de imagen, lo redimensiona a foto carnet (máx 320px) y lo devuelve
// como data URI JPEG comprimido (liviano para guardar en base64 en la BD).
export function fileToFotoDataURI(file, maxSize = 320, calidad = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Sin archivo'))
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      return reject(new Error('Formato no válido: usá PNG, JPG o WebP'))
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * ratio))
        const h = Math.max(1, Math.round(img.height * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Largo de una data URI en bytes (aprox. de lo que ocuparía en la BD).
export function dataURILargo(uri) {
  if (!uri) return 0
  const m = uri.match(/^data:[^;]+;base64,(.*)$/s)
  if (!m) return uri.length
  return Math.round((m[1].length * 3) / 4)
}