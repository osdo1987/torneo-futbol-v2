import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import PageHeader from '../components/PageHeader'
import Usuarios from './Usuarios'

export default function Config({ user, selectedTorneoId, setDarkMode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('tf_darkMode') === 'true')

  useEffect(() => {
    localStorage.setItem('tf_darkMode', String(dark))
    setDarkMode(dark)
  }, [dark, setDarkMode])

  const canManageUsers = ['SUPERADMIN', 'ORGANIZADOR', 'ADMIN'].includes(user?.role)

  return (
    <Box sx={{ maxWidth: 1024 }}>
      <PageHeader title="Configuración" subtitle="Preferencias de la cuenta, del sistema y gestión de usuarios." />

      <Box sx={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Mi cuenta</Typography>
            <Typography variant="body2"><b>Email:</b> {user?.email}</Typography>
            <Typography variant="body2"><b>Rol:</b> {user?.role}</Typography>
            {user?.organizadorName && <Typography variant="body2"><b>Organizador:</b> {user.organizadorName}</Typography>}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Modo oscuro</Typography>
                <Typography variant="body2" color="text.secondary">Alterna el tema del panel.</Typography>
              </Box>
              <Switch checked={dark} onChange={(e) => setDark(e.target.checked)} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {canManageUsers && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Usuarios user={user} selectedTorneoId={selectedTorneoId} embedded />
        </>
      )}
    </Box>
  )
}