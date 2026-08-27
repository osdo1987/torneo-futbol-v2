import { StrictMode, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.jsx'
import { lightTheme, darkTheme } from './theme'
import { ToastProvider } from './components/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

function Main() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tf_darkMode') === 'true')
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode])

  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ToastProvider>
              <App setDarkMode={setDarkMode} />
            </ToastProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Main />)
