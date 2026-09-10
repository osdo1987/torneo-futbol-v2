import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  SportsSoccer as SportsSoccerIcon,
  TableChart as TableChartIcon,
  Leaderboard as LeaderboardIcon,
  Settings as SettingsIcon,
  Storefront as StorefrontIcon,
  Public as PublicIcon,
  Gavel as GavelIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'

const drawerWidth = 260

export default function AdminLayout({ title, children, user, torneos = [], selectedTorneoId, onSelectTorneo, onLogout }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isSuperadmin = user?.role === 'SUPERADMIN'

  const navItems = useMemo(() => {
    if (isSuperadmin) {
      return [
        { path: '/super', label: 'Organizadores', icon: <StorefrontIcon /> },
        { path: '/config', label: 'Configuración', icon: <SettingsIcon /> },
      ]
    }
    return [
      { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
      { path: '/torneos', label: 'Torneos', icon: <EmojiEventsIcon /> },
      { path: '/equipos', label: 'Equipos', icon: <GroupIcon /> },
      { path: '/partidos', label: 'Partidos', icon: <SportsSoccerIcon /> },
      { path: '/sanciones', label: 'Sanciones', icon: <GavelIcon /> },
      { path: '/planilla', label: 'Planilla', icon: <EditNoteIcon /> },
      { path: '/tabla', label: 'Posiciones', icon: <TableChartIcon /> },
      { path: '/estadisticas', label: 'Estadísticas', icon: <LeaderboardIcon /> },
      { path: '/landing', label: 'Landing', icon: <PublicIcon /> },
      { path: '/config', label: 'Configuración', icon: <SettingsIcon /> },
    ]
  }, [isSuperadmin])

  const nav = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: isDark ? '#1b1e21' : '#ffffff' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,#004ac6,#22d3ee)', color: '#fff',
        }}>
          <SportsSoccerIcon fontSize="small" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Torneo Futbol</Typography>
      </Box>

      {!isSuperadmin && (
        <Box sx={{ px: 2.5, pb: 1.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Navegando en</InputLabel>
            <Select
              value={selectedTorneoId || ''}
              label="Navegando en"
              onChange={(e) => onSelectTorneo(e.target.value)}
            >
              {torneos.length === 0 && <MenuItem value="">Sin torneos</MenuItem>}
              {torneos.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <List sx={{ px: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              selected={active}
              sx={{
                borderRadius: 2, mb: 0.5,
                '&.Mui-selected': { bgcolor: isDark ? 'rgba(180,197,255,0.12)' : '#e8eefb' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />
            </ListItemButton>
          )
        })}
      </List>

      <Box sx={{ p: 2, borderTop: `1px solid ${isDark ? 'rgba(180,197,255,0.12)' : '#ececec'}` }}>
        <Typography variant="subtitle2" noWrap>{user?.email}</Typography>
        <Typography variant="caption" color="text.secondary">{user?.role} {user?.organizadorName ? `· ${user.organizadorName}` : ''}</Typography>
      </Box>
    </Box>
  )


  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {nav}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: 0 },
          }}
        >
          {nav}
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: isDark ? '#191c1e' : '#ffffff', color: 'text.primary', borderBottom: `1px solid ${isDark ? 'rgba(180,197,255,0.12)' : '#ececec'}` }}>
          <Toolbar sx={{ gap: 1 }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>{title}</Typography>
            <IconButton onClick={onLogout} title="Cerrar sesión"><LogoutIcon /></IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 }, flex: 1, bgcolor: isDark ? '#191c1e' : '#f7f9fb' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

