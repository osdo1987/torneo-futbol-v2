import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/**
 * Cabecera de página del design system "Torneo Pro · Athletic Suite"
 * (layout-test/dashboard.html · Page Header & Action Bar):
 * eyebrow `label-sm` + título `headline-lg` + chip opcional + subtítulo y acciones.
 */
export default function PageHeader({ overline, meta, title, badge, subtitle, actions }) {
  return (
    <Box
      component="section"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: { xs: 'stretch', lg: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {(overline || meta) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            {overline && (
              <Typography variant="labelSm" sx={{ textTransform: 'uppercase', color: 'primary.main' }}>
                {overline}
              </Typography>
            )}
            {overline && meta && (
              <Box component="span" sx={{ color: 'outlineVariant', fontSize: '0.6875rem' }}>•</Box>
            )}
            {meta && (
              <Typography variant="labelSm" sx={{ color: 'onSurfaceVariant', fontWeight: 400 }}>
                {meta}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          {badge}
        </Box>

        {subtitle && (
          <Typography variant="body2" sx={{ color: 'onSurfaceVariant', mt: 0.5, maxWidth: 760 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  )
}