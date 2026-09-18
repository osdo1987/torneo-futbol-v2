import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { setAuthErrorCallback, apiGet } from './api'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import PublicLanding from './pages/PublicLanding'
import RegistroJugador from './pages/RegistroJugador'
import LandingConfig from './pages/LandingConfig'
import Dashboard from './pages/Dashboard'
import Torneos from './pages/Torneos'
import Equipos from './pages/Equipos'
import Partidos from './pages/Partidos'
import Sanciones from './pages/Sanciones'
import Planilla from './pages/Planilla'
import Tabla from './pages/Tabla'
import Estadisticas from './pages/Estadisticas'
import SuperAdmin from './pages/SuperAdmin'
import Config from './pages/Config'
import MiEquipo from './pages/MiEquipo'

export default function App({ setDarkMode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tf_user')) || null } catch { return null }
  })
  const [selectedTorneoId, setSelectedTorneoId] = useState(() => localStorage.getItem('tf_torneo') || '')

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tf_user')
    localStorage.removeItem('tf_token')
    localStorage.removeItem('tf_torneo')
    setUser(null)
    navigate('/login')
  }, [navigate])

  useEffect(() => {
    setAuthErrorCallback(handleLogout)
  }, [handleLogout])

  const handleLogin = (userData, token) => {
    localStorage.setItem('tf_user', JSON.stringify(userData))
    localStorage.setItem('tf_token', token)
    setUser(userData)
  }

  const isSuperadmin = user?.role === 'SUPERADMIN'
  const isReferee = user?.role === 'REFEREE'
  const isDelegado = user?.role === 'DELEGADO'

  // Cargar torneos (no para SUPERADMIN)
  const { data: torneos = [] } = useQuery({
    queryKey: ['torneos'],
    queryFn: () => apiGet('/torneos'),
    enabled: !!user && !isSuperadmin,
  })

  // Torneo activo: la selección del usuario o, por defecto, el primero disponible
  const activeTorneoId =
    selectedTorneoId || (torneos.length > 0 ? String(torneos[0].id) : '')

  const onSelectTorneo = (id) => {
    setSelectedTorneoId(id)
    localStorage.setItem('tf_torneo', id)
  }

  if (!user) {
    // La landing pública y la inscripción de jugadores se ven sin sesión; el resto pide login
    if (location.pathname.startsWith('/l/') || location.pathname.startsWith('/r/')) {
      return (
        <Routes>
<Route path="/l/:slug" element={<PublicLanding onLogin={handleLogin} />} />
      <Route path="/r/:slug" element={<RegistroJugador />} />
        </Routes>
      )
    }
    return <Login onLogin={handleLogin} />
  }

  const getTitle = () => {
    const t = torneos.find((x) => String(x.id) === String(activeTorneoId))
    return t ? t.nombre : (isSuperadmin ? 'Super Admin' : 'Panel')
  }

  const layoutPages = (element) => {
    if (isSuperadmin) {
      return (
        <AdminLayout title={getTitle()} user={user} onLogout={handleLogout}>
          {element}
        </AdminLayout>
      )
    }
    return (
      <AdminLayout
        title={getTitle()}
        user={user}
        torneos={torneos}
        selectedTorneoId={activeTorneoId}
        onSelectTorneo={onSelectTorneo}
        onLogout={handleLogout}
      >
        {element}
      </AdminLayout>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={isSuperadmin ? '/super' : '/'} replace />} />
      <Route path="/super" element={
        isSuperadmin
          ? layoutPages(<SuperAdmin user={user} />)
          : <Navigate to="/" replace />
      } />
      <Route path="/torneos" element={layoutPages(isDelegado ? <Navigate to="/mi-equipo" replace /> : <Torneos user={user} selectedTorneoId={activeTorneoId} onSelectTorneo={onSelectTorneo} />)} />
      <Route path="/equipos" element={layoutPages(isReferee || isDelegado ? <Navigate to={isDelegado ? '/mi-equipo' : '/'} replace /> : <Equipos user={user} selectedTorneoId={activeTorneoId} />)} />
      <Route path="/partidos" element={layoutPages(isDelegado ? <Navigate to="/mi-equipo" replace /> : <Partidos user={user} selectedTorneoId={activeTorneoId} />)} />
      <Route path="/sanciones" element={layoutPages(isDelegado ? <Navigate to="/mi-equipo" replace /> : <Sanciones user={user} selectedTorneoId={activeTorneoId} />)} />
      <Route path="/planilla" element={layoutPages(isDelegado ? <Navigate to="/mi-equipo" replace /> : <Planilla selectedTorneoId={activeTorneoId} />)} />
      <Route path="/tabla" element={layoutPages(<Tabla user={user} selectedTorneoId={activeTorneoId} />)} />
      <Route path="/estadisticas" element={layoutPages(<Estadisticas user={user} selectedTorneoId={activeTorneoId} />)} />
      <Route path="/mi-equipo" element={layoutPages(isDelegado ? <MiEquipo user={user} selectedTorneoId={activeTorneoId} /> : <Navigate to="/" replace />)} />
      <Route path="/usuarios" element={<Navigate to="/config" replace />} />
      <Route path="/config" element={layoutPages(isReferee || isDelegado ? <Navigate to={isDelegado ? '/mi-equipo' : '/'} replace /> : <Config user={user} selectedTorneoId={activeTorneoId} setDarkMode={setDarkMode} onLogout={handleLogout} />)} />
      <Route path="/landing" element={layoutPages(isReferee || isDelegado ? <Navigate to={isDelegado ? '/mi-equipo' : '/'} replace /> : <LandingConfig user={user} />)} />
      <Route path="/l/:slug" element={<PublicLanding onLogin={handleLogin} />} />
      <Route path="/r/:slug" element={<RegistroJugador />} />
      <Route path="/" element={layoutPages(isReferee ? <Planilla selectedTorneoId={activeTorneoId} /> : isDelegado ? <Navigate to="/mi-equipo" replace /> : <Dashboard user={user} selectedTorneoId={activeTorneoId} />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
