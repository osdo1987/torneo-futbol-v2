import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { apiGet } from '../api'

export default function Tabla({ selectedTorneoId }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tabla', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/tabla`),
    enabled: !!selectedTorneoId,
  })

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver las posiciones.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  const posiciones = data?.posiciones || []

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Tabla de posiciones</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>{data?.torneo}</Typography>

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Equipo</TableCell>
                <TableCell align="center">PJ</TableCell>
                <TableCell align="center">G</TableCell>
                <TableCell align="center">E</TableCell>
                <TableCell align="center">P</TableCell>
                <TableCell align="center">GF</TableCell>
                <TableCell align="center">GC</TableCell>
                <TableCell align="center">DF</TableCell>
                <TableCell align="center"><b>PTS</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posiciones.map((f) => (
                <TableRow key={f.equipo_id} hover>
                  <TableCell>{f.pos}</TableCell>
                  <TableCell fontWeight={600}>{f.equipo}</TableCell>
                  <TableCell align="center">{f.PJ}</TableCell>
                  <TableCell align="center">{f.PG}</TableCell>
                  <TableCell align="center">{f.PE}</TableCell>
                  <TableCell align="center">{f.PP}</TableCell>
                  <TableCell align="center">{f.GF}</TableCell>
                  <TableCell align="center">{f.GC}</TableCell>
                  <TableCell align="center">{f.DF > 0 ? `+${f.DF}` : f.DF}</TableCell>
                  <TableCell align="center"><b>{f.PTS}</b></TableCell>
                </TableRow>
              ))}
              {posiciones.length === 0 && (
                <TableRow><TableCell colSpan={10} align="center">Sin resultados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}
