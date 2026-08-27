import { createTheme } from '@mui/material/styles'

const commonTheme = {
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 10,
  },
}

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#004ac6' },
    secondary: { main: '#38485d' },
    background: { default: '#f7f9fb', paper: '#ffffff' },
    text: { primary: '#191c1e', secondary: '#434655' },
  },
  ...commonTheme,
})

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#b4c5ff', dark: '#93b3ff', light: '#00174b', contrastText: '#00174b' },
    secondary: { main: '#b7c8e1' },
    background: { default: '#191c1e', paper: '#2d3133' },
    text: { primary: '#e0e3e5', secondary: '#c3c6d7' },
  },
  ...commonTheme,
})
