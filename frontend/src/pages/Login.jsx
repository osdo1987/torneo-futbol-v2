import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { SportsSoccer as SportsSoccerIcon, Visibility, VisibilityOff } from '@mui/icons-material'
import { apiPost } from '../api'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiPost('/auth/login', { email, password })
      onLogin(res.user, res.token)
    } catch (err) {
      setError(err.message || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ width: 420, maxWidth: '100%', p: 4, borderRadius: 3, boxShadow: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#0052cc,#39b8fd)', color: '#fff', mb: 2,
          }}>
            <SportsSoccerIcon fontSize="large" />
          </Box>
          <Typography variant="h5" fontWeight={700}>Bienvenido</Typography>
          <Typography variant="body2" color="text.secondary">Ingresa tus credenciales</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Email" type="email" fullWidth required margin="normal"
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
          />
          <TextField
            label="Contraseña" fullWidth required margin="normal"
            type={showPassword ? 'text' : 'password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mt: 3, py: 1.4 }}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Iniciar Sesión'}
          </Button>
        </Box>
      </Card>
    </Box>
  )
}
