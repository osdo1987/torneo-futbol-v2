const API = import.meta.env.VITE_API_URL || '/api'

// Clave única donde vive el JWT de esta app (ver App.jsx)
const TOKEN_KEY = 'tf_token'

// Purga defensiva: clave 'token' genérica usada por otras apps/estados viejos
// en este mismo origen y que provocaba "Bearer <basura>" -> 422 en la API.
try { localStorage.removeItem('token') } catch { /* noop */ }

let onAuthError = null
export function setAuthErrorCallback(cb) {
  onAuthError = cb
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

async function handleResponse(res) {
  if (res.status === 401 && onAuthError) {
    onAuthError()
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const json = await res.json()
      detail = json.error || json.message || detail
      if (typeof detail === 'object') detail = JSON.stringify(detail)
    } catch {
      /* noop */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

function headers(json = true) {
  const h = {}
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  if (json) h['Content-Type'] = 'application/json'
  return h
}

export async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: headers(false) })
  return handleResponse(res)
}

export async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body || {}),
  })
  return handleResponse(res)
}

export async function apiPut(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body || {}),
  })
  return handleResponse(res)
}

export async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: headers(false),
  })
  return handleResponse(res)
}
