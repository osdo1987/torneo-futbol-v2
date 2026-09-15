import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { apiGet } from '../api'
import PageHeader from '../components/PageHeader'

export default function Estadisticas({ selectedTorneoId }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['goleadores', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/goleadores?top=10`),
    enabled: !!selectedTorneoId,
  })

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver las estadísticas.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  const goleadores = data?.goleadores || []

  return (
    <Box>
      <PageHeader title="Estadísticas" subtitle={`${data?.torneo} — Goleadores`} />

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Jugador</TableCell>
                <TableCell>Equipo</TableCell>
                <TableCell align="center">Goles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goleadores.map((g) => (
                <TableRow key={g.jugador_id} hover>
                  <TableCell>{g.pos}</TableCell>
                  <TableCell fontWeight={600}>{g.jugador}</TableCell>
                  <TableCell>{g.equipo}</TableCell>
                  <TableCell align="center"><b>{g.goles}</b></TableCell>
                </TableRow>
              ))}
              {goleadores.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">Sin goles registrados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}
