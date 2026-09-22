import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import { alpha, keyframes } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  Groups as GroupsIcon,
  SportsSoccer as SportsSoccerIcon,
  TableChart as TableChartIcon,
  Leaderboard as LeaderboardIcon,
  Settings as SettingsIcon,
  Storefront as StorefrontIcon,
  Public as PublicIcon,
  Gavel as GavelIcon,
  EditNote as EditNoteIcon,
  EmojiEvents as TrophyIcon,
  NotificationsNone as NotificationsIcon,
  AddCircle as AddCircleIcon,
  ExpandMore as ExpandMoreIcon,
  EditCalendar as EditCalendarIcon,
  Stadium as StadiumIcon,
  AccountBalanceWallet as PaymentsIcon,
} from '@mui/icons-material'

// Layout del design system "Torneo Pro · Athletic Suite" (layout-test/dashboard.html)
const drawerWidth = 256
const headerHeight = 64
const softShadow = '0 1px 3px 0 rgba(15,23,42,0.05)'
const headerShadow = '0 1px 8px rgba(0,0,0,0.04)'

const pulseAnim = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.85); }
`

// Chips píldora de estado (bg tenue + acento, válidos en claro y oscuro)
const TONE_STYLES = {
  tertiary: (t) => ({
    bgcolor: alpha(t.palette.tertiaryContainer, t.palette.mode === 'dark' ? 0.25 : 0.14),
    color: t.palette.tertiary,
  }),
  caution: (t) => ({ bgcolor: alpha(t.palette.caution, 0.18), color: t.palette.cautionStrong }),
  secondary: (t) => ({ bgcolor: alpha(t.palette.secondaryContainer, 0.22), color: t.palette.secondary }),
  error: (t) => ({ bgcolor: alpha(t.palette.error, 0.14), color: t.palette.error }),
  neutral: (t) => ({ bgcolor: t.palette.surfaceContainerHigh, color: t.palette.onSurfaceVariant }),
}

const ESTADO_BADGE = {
  CREADO: { label: 'Creado', tone: 'neutral' },
  INSCRIPCIONES_ABIERTAS: { label: 'Inscripciones abiertas', tone: 'tertiary' },
  INSCRIPCIONES_CERRADAS: { label: 'Inscripciones cerradas', tone: 'caution' },
  SORTEADO: { label: 'Sorteado', tone: 'secondary' },
  EN_JUEGO: { label: 'En juego', tone: 'tertiary' },
  FINALIZADO: { label: 'Finalizado', tone: 'error' },
}

function EstadoBadge({ estado }) {
  const theme = useTheme()
  const config = ESTADO_BADGE[estado] || { label: estado, tone: 'neutral' }
  const styles = (TONE_STYLES[config.tone] || TONE_STYLES.neutral)(theme)
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        ...styles,
      }}
    >
      {config.label}
    </Box>
  )
}
export default function AdminLayout({ title, children, user, torneos = [], selectedTorneoId, onSelectTorneo, onLogout }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isSuperadmin = user?.role === 'SUPERADMIN'
  const isReferee = user?.role === 'REFEREE'
  const isDelegado = user?.role === 'DELEGADO'
  const initial = (user?.email || '?').charAt(0).toUpperCase()
  const torneoActivo = torneos.find((t) => String(t.id) === String(selectedTorneoId)) || torneos[0]

  // Sede real del organizador (locaciones del tenant), no el nombre comercial.
  const { data: locaciones = [] } = useQuery({
    queryKey: ['locaciones'],
    queryFn: () => apiGet('/locaciones'),
    enabled: !isSuperadmin,
  })
  const sedeNombre = (locaciones.find((l) => l.activa !== false) || locaciones[0])?.nombre || 'Sin sede configurada'

  const navItems = useMemo(() => {
    if (isSuperadmin) {
      return [
        { path: '/super', label: 'Organizadores', icon: <StorefrontIcon /> },
        { path: '/config', label: 'Configuración', icon: <SettingsIcon /> },
      ]
    }
    if (isReferee) {
      return [
        { path: '/partidos', label: 'Partidos', icon: <SportsSoccerIcon /> },
        { path: '/planilla', label: 'Planilla', icon: <EditNoteIcon /> },
        { path: '/tabla', label: 'Posiciones', icon: <TableChartIcon /> },
        { path: '/sanciones', label: 'Sanciones', icon: <GavelIcon /> },
        { path: '/estadisticas', label: 'Estadísticas', icon: <LeaderboardIcon /> },
      ]
    }
    if (isDelegado) {
      return [
        { path: '/mi-equipo', label: 'Mi equipo', icon: <GroupsIcon /> },
        { path: '/tabla', label: 'Posiciones', icon: <TableChartIcon /> },
        { path: '/estadisticas', label: 'Estadísticas', icon: <LeaderboardIcon /> },
      ]
    }
    const items = [{ path: '/', label: 'Dashboard', icon: <DashboardIcon /> }]
    items.push(
      { path: '/torneos', label: 'Torneos', icon: <EmojiEventsIcon /> },
      { path: '/equipos', label: 'Equipos', icon: <GroupIcon /> },
      { path: '/partidos', label: 'Partidos', icon: <SportsSoccerIcon /> },
      { path: '/sanciones', label: 'Sanciones', icon: <GavelIcon /> },
      { path: '/tesoreria', label: 'Tesorería', icon: <PaymentsIcon /> },
      { path: '/planilla', label: 'Planilla', icon: <EditNoteIcon /> },
      { path: '/tabla', label: 'Posiciones', icon: <TableChartIcon /> },
      { path: '/estadisticas', label: 'Estadísticas', icon: <LeaderboardIcon /> },
    )
    return items
  }, [isSuperadmin, isReferee, isDelegado])

  const secondaryItems = isSuperadmin || isReferee || isDelegado
    ? []
    : [
        { path: '/landing', label: 'Landing pública', icon: <PublicIcon /> },
        { path: '/config', label: 'Configuración', icon: <SettingsIcon /> },
      ]

  const renderNavItem = (item) => {
    const active = location.pathname === item.path
    return (
      <ListItemButton
        key={item.path}
        component={Link}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        selected={active}
        sx={{
          px: 1,
          py: 1,
          minHeight: 0,
          gap: 1,
          borderRadius: '8px',
          color: 'onSurfaceVariant',
          transition: 'all .2s ease',
          '&:hover': { bgcolor: 'surfaceContainerHigh', color: 'onSurface' },
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'onPrimary',
            '&:hover': { bgcolor: 'primary.main', color: 'onPrimary' },
            '& .MuiListItemIcon-root': { color: 'onPrimary' },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, color: 'inherit', '& .MuiSvgIcon-root': { fontSize: 20 } }}>
          {item.icon}
        </ListItemIcon>
        <Box
          component="span"
          sx={{
            fontSize: active ? '1.125rem' : '0.875rem',
            lineHeight: active ? '1.625rem' : '1.25rem',
            fontWeight: active ? 600 : 400,
            letterSpacing: active ? '-0.01em' : 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label}
        </Box>
      </ListItemButton>
    )
  }
const nav = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'surfaceContainerLow',
        userSelect: 'none',
      }}
    >
      {/* Marca */}
      <Box sx={{ height: headerHeight, flexShrink: 0, px: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'onPrimary',
            boxShadow: softShadow,
          }}
        >
          <SportsSoccerIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography
            sx={{ fontSize: '1.125rem', lineHeight: 1, fontWeight: 700, letterSpacing: '-0.01em', color: 'primary.main' }}
          >
            Torneo Futbol
          </Typography>
          <Typography
            sx={{
              mt: '2px',
              fontSize: '0.6875rem',
              lineHeight: '0.875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'onSurfaceVariant',
            }}
          >
            Athletic Suite
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 0.5 }}>
        <Box sx={{ height: '1px', width: '100%', bgcolor: 'surfaceContainerHigh' }} />
      </Box>

      {/* Navegación */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, py: 0.5 }}>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {navItems.map(renderNavItem)}
          {secondaryItems.length > 0 && (
            <>
              <Box sx={{ my: 0.5 }}>
                <Box sx={{ height: '1px', width: '100%', bgcolor: 'surfaceContainerHigh' }} />
              </Box>
              {secondaryItems.map(renderNavItem)}
            </>
          )}
        </List>
      </Box>
      {/* Usuario */}
      <Box sx={{ flexShrink: 0, p: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            p: 1,
            borderRadius: '12px',
            bgcolor: 'surfaceContainerLowest',
            boxShadow: softShadow,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'onPrimary' }}>
              {initial}
            </Avatar>
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: '0.8125rem', lineHeight: '1.125rem', fontWeight: 600 }}>
                {user?.nombre || user?.email || 'Usuario'}
              </Typography>
              <Typography noWrap sx={{ fontSize: '0.75rem', lineHeight: '1rem', color: 'onSurfaceVariant' }}>
                {user?.organizadorName || (isReferee ? 'Árbitro' : isDelegado ? 'Delegado' : isSuperadmin ? 'Super Admin' : user?.role === 'ADMIN' ? 'Administrador' : 'Organizador')}
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Cerrar sesión">
            <IconButton
              size="small"
              onClick={onLogout}
              sx={{
                p: 0.5,
                color: 'onSurfaceVariant',
                '&:hover': { color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.12) },
              }}
            >
              <LogoutIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 0, borderRadius: 0, boxShadow: headerShadow },
          }}
        >
          {nav}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0, borderRadius: 0, boxShadow: headerShadow },
          }}
        >
          {nav}
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          sx={{
            borderRadius: 0,
            bgcolor: (t) => alpha(t.palette.background.default, 0.8),
            backdropFilter: 'blur(20px)',
            color: 'onSurface',
            boxShadow: headerShadow,
          }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: headerHeight, px: { xs: 2, md: 2.5 } }}>
            {isMobile && (
              <IconButton edge="start" size="small" onClick={() => setMobileOpen(true)} sx={{ color: 'onSurfaceVariant' }}>
                <MenuIcon />
              </IconButton>
            )}

            {!isSuperadmin ? (
              <>
                <Select
                  value={torneoActivo?.id ?? ''}
                  onChange={(e) => onSelectTorneo(e.target.value)}
                  displayEmpty
                  size="small"
                  IconComponent={ExpandMoreIcon}
                  renderValue={() => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        <TrophyIcon sx={{ fontSize: 20, color: 'primary.main', flexShrink: 0 }} />
                        <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                          {torneoActivo?.nombre || 'Seleccionar torneo'}
                        </Typography>
                      </Box>
                      {torneoActivo?.estado === 'EN_JUEGO' && (
                        <Box
                          sx={(t) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1,
                            py: 0.25,
                            borderRadius: 999,
                            bgcolor: alpha(t.palette.tertiaryContainer, t.palette.mode === 'dark' ? 0.25 : 0.14),
                            color: 'tertiary',
                            flexShrink: 0,
                          })}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'tertiary',
                              animation: `${pulseAnim} 1.6s ease-in-out infinite`,
                            }}
                          />
                          <Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                            EN JUEGO
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                  sx={{
                    minWidth: { xs: 170, md: 260 },
                    maxWidth: { xs: 240, md: 380 },
                    bgcolor: 'surfaceContainerLowest',
                    borderRadius: '8px',
                    boxShadow: softShadow,
                    transition: 'background-color .2s ease',
                    '&:hover': { bgcolor: 'surfaceContainerLow' },
                    '& .MuiOutlinedInput-notchedOutline': { border: 0 },
                    '&:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0, boxShadow: 'none' },
                    '& .MuiSelect-select': { py: 0.75, pr: 4, display: 'flex', alignItems: 'center' },
                    '& .MuiSelect-icon': { color: 'onSurfaceVariant', fontSize: 18, right: 8 },
                  }}
                  MenuProps={{ slotProps: { paper: { sx: { maxHeight: 340, minWidth: 300 } } } }}
                >
                  {torneos.length === 0 && <MenuItem value="">Sin torneos</MenuItem>}
                  {torneos.map((t) => (
                    <MenuItem key={t.id} value={t.id} sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <TrophyIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
                        <Box component="span" noWrap>{t.nombre}</Box>
                      </Box>
                      <EstadoBadge estado={t.estado} />
                    </MenuItem>
                  ))}
                </Select>
                <Box
                  sx={{
                    display: { xs: 'none', lg: 'flex' },
                    alignItems: 'center',
                    gap: 1,
                    color: 'onSurfaceVariant',
                    minWidth: 0,
                  }}
                >
                  <StadiumIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                  <Typography variant="caption" noWrap>Sede: {sedeNombre}</Typography>
                </Box>
              </>
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 700, ml: 0.5 }}>{title || 'Super Admin'}</Typography>
            )}

            <Box sx={{ flex: 1 }} />

            {!isSuperadmin && !isReferee && !isDelegado && (
              <>
                <Button
                  component={Link}
                  to="/partidos"
                  startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    px: 1,
                    py: 0.75,
                    bgcolor: 'surfaceContainerLowest',
                    color: 'onSurface',
                    boxShadow: softShadow,
                    '&:hover': { bgcolor: 'surfaceContainerHigh', boxShadow: '0 4px 12px -4px rgba(15,23,42,0.18)' },
                    '& .MuiButton-startIcon': { color: 'primary.main' },
                  }}
                >
                  Nuevo Partido
                </Button>
                <Button
                  component={Link}
                  to="/partidos"
                  variant="contained"
                  startIcon={<EditCalendarIcon sx={{ fontSize: 18 }} />}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' }, px: 1, py: 0.75 }}
                >
                  Fixture Express
                </Button>
              </>
            )}

            <Box
              sx={{
                display: { xs: 'none', sm: 'block' },
                width: '1px',
                height: 24,
                bgcolor: 'surfaceContainerHigh',
                mx: 0.5,
              }}
            />

            {user?.organizadorSlug ? (
              <Tooltip title="Ver página pública (se abre en otra pestaña)">
                <IconButton
                  size="small"
                  component="a"
                  href={`${window.location.origin}/l/${user.organizadorSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver página pública"
                  sx={{ p: 1, color: 'onSurfaceVariant', '&:hover': { bgcolor: 'surfaceContainerHigh', color: 'onSurface' } }}
                >
                  <PublicIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Notificaciones">
                <IconButton
                  size="small"
                  sx={{
                    position: 'relative',
                    p: 1,
                    color: 'onSurfaceVariant',
                    '&:hover': { bgcolor: 'surfaceContainerHigh', color: 'onSurface' },
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                    }}
                  />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Notificaciones">
              <IconButton
                size="small"
                sx={{
                  position: 'relative',
                  p: 1,
                  color: 'onSurfaceVariant',
                  '&:hover': { bgcolor: 'surfaceContainerHigh', color: 'onSurface' },
                }}
              >
                <NotificationsIcon sx={{ fontSize: 20 }} />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                  }}
                />
              </IconButton>
            </Tooltip>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'onPrimary' }}>
              {initial}
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, md: 2.5 },
            pt: { xs: 2, md: 3 },
            pb: { xs: 4, md: 5 },
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
