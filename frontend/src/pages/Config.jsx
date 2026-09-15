import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import PageHeader from '../components/PageHeader'

export default function Config({ user, setDarkMode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('tf_darkMode') === 'true')

  useEffect(() => {
    localStorage.setItem('tf_darkMode', String(dark))
    setDarkMode(dark)
  }, [dark, setDarkMode])

  return (
    <Box sx={{ maxWidth: 600 }}>
      <PageHeader title="Configuración" subtitle="Preferencias de la cuenta y del sistema." />

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 2 }}>
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
  )
}
