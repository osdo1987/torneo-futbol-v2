import { createTheme, alpha } from '@mui/material/styles'

// ---------------------------------------------------------------------------
// Design tokens "Torneo Pro · Athletic Suite" (Material 3)
// Fuente: layout-test/dashboard.html + layout-test/DESIGN.md
//
// Además del mapeo a los roles clásicos de MUI (primary/secondary/success/…),
// cada token crudo se expone como clave de `palette` para poder usarlo directo:
//   sx={{ bgcolor: 'surfaceContainerLow', color: 'onSurfaceVariant' }}
// ---------------------------------------------------------------------------

const lightTokens = {
  // Marca
  primary: '#003d9b',
  primaryContainer: '#0052cc',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#c4d2ff',
  primaryFixed: '#dae2ff',
  primaryFixedDim: '#b2c5ff',
  onPrimaryFixed: '#001848',
  inversePrimary: '#b2c5ff',
  surfaceTint: '#0c56d0',
  secondary: '#006591',
  secondaryContainer: '#39b8fd',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#004666',
  secondaryFixed: '#c9e6ff',
  secondaryFixedDim: '#89ceff',
  tertiary: '#004e33',
  tertiaryContainer: '#006846',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#5debaf',
  tertiaryFixed: '#6ffbbe',
  tertiaryFixedDim: '#4edea3',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',
  caution: '#f59e0b',
  cautionContainer: '#fffbeb',
  cautionStrong: '#b45309',
  // Superficies
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceBright: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceVariant: '#d3e4fe',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#434654',
  outline: '#737685',
  outlineVariant: '#c3c6d6',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  // Selección
  selectedBg: '#dae2ff',
  selectedFg: '#001848',
  // Sombras
  shadowSoft: 'rgba(15, 23, 42, 0.05)',
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowStrong: 'rgba(15, 23, 42, 0.14)',
}

const darkTokens = {
  primary: '#b2c5ff',
  primaryContainer: '#0040a2',
  onPrimary: '#001848',
  onPrimaryContainer: '#dae2ff',
  primaryFixed: '#dae2ff',
  primaryFixedDim: '#b2c5ff',
  onPrimaryFixed: '#001848',
  inversePrimary: '#003d9b',
  surfaceTint: '#b2c5ff',
  secondary: '#89ceff',
  secondaryContainer: '#004c6e',
  onSecondary: '#00344a',
  onSecondaryContainer: '#c9e6ff',
  secondaryFixed: '#c9e6ff',
  secondaryFixedDim: '#89ceff',
  tertiary: '#4edea3',
  tertiaryContainer: '#005236',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#6ffbbe',
  tertiaryFixed: '#6ffbbe',
  tertiaryFixedDim: '#4edea3',
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#ffffff',
  onErrorContainer: '#ffdad6',
  caution: '#fbbf24',
  cautionContainer: '#3d2f09',
  cautionStrong: '#fcd34d',
  background: '#0b1c30',
  surface: '#0b1c30',
  surfaceBright: '#2d415a',
  surfaceDim: '#061425',
  surfaceVariant: '#434654',
  surfaceContainerLowest: '#061425',
  surfaceContainerLow: '#13263c',
  surfaceContainer: '#172b42',
  surfaceContainerHigh: '#22364e',
  surfaceContainerHighest: '#2d415a',
  onSurface: '#d3e4fe',
  onSurfaceVariant: '#c3c6d6',
  outline: '#8d90a0',
  outlineVariant: '#434654',
  inverseSurface: '#d3e4fe',
  inverseOnSurface: '#213145',
  selectedBg: '#004c6e',
  selectedFg: '#c9e6ff',
  shadowSoft: 'rgba(0, 0, 0, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.38)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
}
// Escala tipográfica del sistema (layout-test/dashboard.html)
const typographyTokens = {
  displayLg: { fontSize: '3rem', lineHeight: '3.5rem', fontWeight: 800, letterSpacing: '-0.03em' },
  titleScore: { fontSize: '2.25rem', lineHeight: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' },
  headlineLg: { fontSize: '2rem', lineHeight: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
  headlineMd: { fontSize: '1.5rem', lineHeight: '2rem', fontWeight: 600, letterSpacing: '-0.015em' },
  headlineSm: { fontSize: '1.125rem', lineHeight: '1.625rem', fontWeight: 600, letterSpacing: '-0.01em' },
  bodyLg: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 400 },
  bodyMd: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 400 },
  bodySm: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 400 },
  labelMd: { fontSize: '0.8125rem', lineHeight: '1.125rem', fontWeight: 600, letterSpacing: '0.01em' },
  labelSm: { fontSize: '0.6875rem', lineHeight: '0.875rem', fontWeight: 700, letterSpacing: '0.04em' },
}

function buildTheme(t, mode) {
  const isDark = mode === 'dark'
  const softShadow = `0 1px 3px 0 ${t.shadowSoft}`
  const raisedShadow = `0 8px 20px -6px ${t.shadow}`
  const overlayShadow = `0 20px 25px -5px ${t.shadowStrong}, 0 8px 10px -6px ${t.shadow}`

  return createTheme({
    palette: {
      mode,
      // --- Tokens crudos del design system (usables en sx) ---
      primaryContainer: t.primaryContainer,
      onPrimaryContainer: t.onPrimaryContainer,
      primaryFixed: t.primaryFixed,
      primaryFixedDim: t.primaryFixedDim,
      onPrimaryFixed: t.onPrimaryFixed,
      inversePrimary: t.inversePrimary,
      surfaceTint: t.surfaceTint,
      onPrimary: t.onPrimary,
      secondaryContainer: t.secondaryContainer,
      onSecondaryContainer: t.onSecondaryContainer,
      secondaryFixed: t.secondaryFixed,
      secondaryFixedDim: t.secondaryFixedDim,
      onSecondary: t.onSecondary,
      tertiary: t.tertiary,
      tertiaryContainer: t.tertiaryContainer,
      onTertiary: t.onTertiary,
      onTertiaryContainer: t.onTertiaryContainer,
      tertiaryFixed: t.tertiaryFixed,
      tertiaryFixedDim: t.tertiaryFixedDim,
      errorContainer: t.errorContainer,
      onError: t.onError,
      onErrorContainer: t.onErrorContainer,
      caution: t.caution,
      cautionContainer: t.cautionContainer,
      cautionStrong: t.cautionStrong,
      surface: t.surface,
      surfaceBright: t.surfaceBright,
      surfaceDim: t.surfaceDim,
      surfaceVariant: t.surfaceVariant,
      surfaceContainerLowest: t.surfaceContainerLowest,
      surfaceContainerLow: t.surfaceContainerLow,
      surfaceContainer: t.surfaceContainer,
      surfaceContainerHigh: t.surfaceContainerHigh,
      surfaceContainerHighest: t.surfaceContainerHighest,
      onSurface: t.onSurface,
      onSurfaceVariant: t.onSurfaceVariant,
      outline: t.outline,
      outlineVariant: t.outlineVariant,
      inverseSurface: t.inverseSurface,
      inverseOnSurface: t.inverseOnSurface,
      // --- Mapeo a los roles clásicos de MUI ---
      primary: {
        main: t.primary,
        dark: t.primaryContainer,
        light: t.primaryFixed,
        contrastText: t.onPrimary,
      },
      secondary: {
        main: t.secondary,
        dark: t.onSecondaryContainer,
        light: t.secondaryFixed,
        contrastText: t.onSecondary,
      },
      info: {
        main: t.secondary,
        dark: t.onSecondaryContainer,
        light: t.secondaryFixed,
        contrastText: t.onSecondary,
      },
      success: {
        main: t.tertiaryContainer,
        dark: t.tertiary,
        light: t.tertiaryFixed,
        contrastText: '#ffffff',
      },
      error: {
        main: t.error,
        dark: t.onErrorContainer,
        light: t.errorContainer,
        contrastText: '#ffffff',
      },
      warning: {
        main: t.caution,
        dark: t.cautionStrong,
        light: t.cautionContainer,
        contrastText: '#0b1c30',
      },
      background: { default: t.background, paper: t.surfaceContainerLowest },
      text: { primary: t.onSurface, secondary: t.onSurfaceVariant, disabled: t.outline },
      divider: t.outlineVariant,
      action: {
        hover: alpha(isDark ? t.onSurface : t.primary, 0.06),
        selected: alpha(isDark ? t.secondaryContainer : t.primary, 0.12),
        focus: alpha(isDark ? t.secondary : t.primary, 0.16),
        disabled: t.outline,
        disabledBackground: isDark ? t.surfaceContainerHigh : t.surfaceContainer,
      },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      // Escala Material 3 del ejemplo
      ...typographyTokens,
      h1: typographyTokens.displayLg,
      h2: typographyTokens.headlineLg,
      h3: typographyTokens.headlineMd,
      h4: typographyTokens.headlineLg,
      h5: typographyTokens.headlineMd,
      h6: typographyTokens.headlineSm,
      subtitle1: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 600 },
      subtitle2: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 600 },
      body1: typographyTokens.bodyLg,
      body2: typographyTokens.bodyMd,
      caption: typographyTokens.bodySm,
      overline: typographyTokens.labelSm,
      button: typographyTokens.labelMd,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '.tabular-nums': { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          // Sin radio global: el Drawer/AppBar usan `square` y perderían sus esquinas rectas
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: 'none',
            backgroundImage: 'none',
            boxShadow: softShadow,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.01em',
            paddingLeft: 12,
            paddingRight: 12,
            transition: 'background-color .2s ease, box-shadow .2s ease, border-color .2s ease',
          },
          sizeSmall: { fontSize: '0.75rem', paddingLeft: 10, paddingRight: 10 },
          sizeLarge: { fontSize: '0.9375rem', paddingLeft: 18, paddingRight: 18 },
          contained: {
            boxShadow: softShadow,
            '&:hover': { boxShadow: raisedShadow },
          },
          containedPrimary: { '&:hover': { backgroundColor: t.primaryContainer } },
          containedSecondary: { '&:hover': { backgroundColor: t.onSecondaryContainer } },
          containedInfo: { '&:hover': { backgroundColor: t.onSecondaryContainer } },
          containedSuccess: { '&:hover': { backgroundColor: t.tertiary } },
          containedError: { '&:hover': { backgroundColor: t.onErrorContainer } },
          containedWarning: { '&:hover': { backgroundColor: t.cautionStrong } },
          textPrimary: { '& .MuiButton-startIcon': { color: t.primary } },
          outlined: {
            borderColor: t.outlineVariant,
            color: t.onSurface,
            '&:hover': { borderColor: t.primary, backgroundColor: alpha(t.primary, 0.04) },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
          },
          sizeSmall: { height: 22, fontSize: '0.6875rem' },
          label: { paddingLeft: 8, paddingRight: 8 },
          filled: { backgroundColor: t.surfaceContainerHigh, color: t.onSurfaceVariant },
          filledPrimary: { backgroundColor: t.primary, color: t.onPrimary },
          filledSecondary: { backgroundColor: t.secondaryContainer, color: t.onSecondaryContainer },
          filledInfo: { backgroundColor: t.secondaryContainer, color: t.onSecondaryContainer },
          filledSuccess: { backgroundColor: t.tertiaryFixed, color: t.tertiary },
          filledError: { backgroundColor: t.errorContainer, color: t.onErrorContainer },
          filledWarning: { backgroundColor: t.cautionContainer, color: t.cautionStrong },
          outlined: { borderColor: t.outlineVariant, color: t.onSurfaceVariant },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: t.surfaceContainerLowest,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: t.outline,
              transition: 'border-color .15s ease, box-shadow .15s ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.onSurfaceVariant },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: t.secondary,
              borderWidth: 2,
              boxShadow: `0 0 0 2px ${alpha(t.secondaryContainer, 0.35)}`,
            },
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: t.outlineVariant },
          },
          inputSizeSmall: { paddingTop: 8, paddingBottom: 8, fontSize: '0.8125rem' },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontSize: '0.8125rem', fontWeight: 500 } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { fontSize: '0.75rem', marginLeft: 2 } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${t.outlineVariant}`,
            boxShadow: overlayShadow,
            marginTop: 4,
          },
          list: { paddingTop: 6, paddingBottom: 6 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            borderRadius: 8,
            marginLeft: 6,
            marginRight: 6,
            minHeight: 38,
            '&.Mui-selected': {
              backgroundColor: t.selectedBg,
              color: t.selectedFg,
              '&:hover': { backgroundColor: isDark ? t.secondaryContainer : t.primaryFixedDim },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${t.outlineVariant}`,
            fontSize: '0.8125rem',
            padding: '10px 12px',
          },
          head: {
            backgroundColor: t.surfaceContainerLow,
            color: t.onSurfaceVariant,
            fontWeight: 700,
            fontSize: '0.6875rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${t.outlineVariant}`,
          },
          sizeSmall: { padding: '6px 10px' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: t.surfaceContainerLow },
            '&.Mui-selected': { backgroundColor: t.surfaceContainer },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 2, borderRadius: 2 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            minHeight: 42,
            letterSpacing: 0,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            borderRadius: 8,
            borderColor: t.outlineVariant,
            color: t.onSurfaceVariant,
            '&.Mui-selected': {
              backgroundColor: t.surfaceContainerLowest,
              color: t.primary,
              '&:hover': { backgroundColor: t.surfaceContainerLow },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16, boxShadow: overlayShadow },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.inverseSurface,
            color: t.inverseOnSurface,
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
          },
          arrow: { color: t.inverseSurface },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 6, borderRadius: 999, backgroundColor: t.surfaceContainerHighest },
          bar: { borderRadius: 999 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, fontSize: '0.8125rem', alignItems: 'center' },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: t.outlineVariant } },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: { color: t.outline, '&.Mui-checked': { color: t.primary } },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: { color: t.outline, '&.Mui-checked': { color: t.primary } },
        },
      },
      MuiAvatar: {
        styleOverrides: { root: { fontWeight: 700, fontSize: '0.875rem' } },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${t.outlineVariant}`,
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: 0 },
          },
        },
      },
    },
  })
}

export const lightTheme = buildTheme(lightTokens, 'light')
export const darkTheme = buildTheme(darkTokens, 'dark')
