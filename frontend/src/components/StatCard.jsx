import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import ArrowDropUp from '@mui/icons-material/ArrowDropUp'
import { alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const softShadow = '0 1px 3px 0 rgba(15,23,42,0.05)'
const raisedShadow = '0 8px 20px -6px rgba(15,23,42,0.14)'

// Resuelve un acento desde un token de palette ('primary.main') o un hex directo
function resolveAccent(theme, color) {
  if (typeof color !== 'string') return theme.palette.primary.main
  if (color.startsWith('#')) return color
  const [group, shade = 'main'] = color.split('.')
  const entry = theme.palette[group]
  if (typeof entry === 'string') return entry
  return entry?.[shade] ?? theme.palette.primary.main
}

/**
 * Tarjeta de métrica del design system "Torneo Pro · Athletic Suite"
 * (layout-test/dashboard.html · StatCards Bento Row):
 * tile de icono + número grande + pill de tendencia + barra de acento inferior.
 */
export default function StatCard({ label, value, icon, color = 'primary.main', footer, delta, progress, valueSize = 'displayLg' }) {
  const theme = useTheme()
  const accent = resolveAccent(theme, color)

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 2,
        pb: 2.5,
        boxShadow: softShadow,
        transition: 'box-shadow .2s ease',
        '&:hover': { boxShadow: raisedShadow },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.6875rem',
              lineHeight: '0.875rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'onSurfaceVariant',
            }}
          >
            {label}
          </Typography>
          <Typography
            variant={valueSize}
            sx={{ mt: 0.5, color: 'onSurface', fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '8px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(accent, 0.14),
            color: accent,
          }}
        >
          {icon}
        </Box>
      </Box>

      {progress != null && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 2,
            height: 6,
            borderRadius: 999,
            bgcolor: 'surfaceContainerHigh',
            '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 999 },
          }}
        />
      )}

      <Box
        sx={{
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {delta != null ? (
          <Box
            sx={(t) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              pl: 0.5,
              pr: 1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: alpha(t.palette.tertiaryContainer, t.palette.mode === 'dark' ? 0.25 : 0.14),
              color: 'tertiary',
            })}
          >
            <ArrowDropUp sx={{ fontSize: 14 }} />
            <Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              {delta}
            </Box>
          </Box>
        ) : (
          <Box />
        )}
        <Typography variant="caption" sx={{ color: 'onSurfaceVariant', textAlign: 'right' }}>
          {footer}
        </Typography>
      </Box>

      {/* Barra de acento inferior */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: accent }} />
    </Card>
  )
}