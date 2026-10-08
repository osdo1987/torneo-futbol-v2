import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import PageHeader from '../components/PageHeader'
import Grid from '@mui/material/Grid'
import { apiGet, apiPost } from '../api'
import { useToast } from '../components/Toast'
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material'

const mon = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })

// Columnas de la tabla en desktop: Jugador | Amarillas | Rojas | Estado | Acción
const COLS = 'minmax(0,1fr) 5rem 5rem minmax(10rem,auto) max-content'

function EstadoChip({ s, compacto }) {
  if (!s.suspendido) return <Chip size="small" color="success" variant="outlined" label="Disponible" />
  const label = compacto ? `J. ${s.suspendido_hasta_jornada}` : `Suspendido hasta J. ${s.suspendido_hasta_jornada}`
  return <Chip size="small" color="error" label={label} />
}

function Fila({ s, i, ultima, isMobile, onPagar }) {
  const pagadas = s.amarillas_pagadas || 0
  const pendientes = Math.max((s.amarillas || 0) - pagadas, 0)
  const tecnico = s.tipo_sancionado === 'TECNICO'
  const todasPagadas = (s.amarillas || 0) > 0 && pendientes === 0
  const puedePagar = !!s.pago_habilitado && s.pendiente_pago !== false && ((s.amarillas || 0) > (s.amarillas_pagadas || 0) || (s.rojas || 0) > (s.rojas_pagadas || 0) || (s.pendiente_pago || false))

  const conteoAmarillas = (
    <Box sx={{ textAlign: 'center', minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: s.amarillas > 0 ? 'warning.main' : 'text.disabled', lineHeight: 1.1 }}>
        🟨 {s.amarillas}
      </Typography>
      {pagadas > 0 && (
        <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'success.main', lineHeight: 1.2 }}>
          {pagadas} pag.
        </Typography>
      )}
    </Box>
  )

  const conteoRojas = (
    <Typography sx={{ fontSize: 13, fontWeight: 800, textAlign: 'center', color: s.rojas > 0 ? 'error.main' : 'text.disabled' }}>
      🟥 {s.rojas}
    </Typography>
  )

  const accion = s.pendiente_pago === false || (todasPagadas && (s.rojas || 0) <= (s.rojas_pagadas || 0)) ? (
    <Chip size="small" color="success" icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label="Pagada" />
  ) : puedePagar ? (
    <Button size="small" variant="outlined" onClick={() => onPagar(s)}
      sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 0, px: 1.25 }}>
      Pagar
    </Button>
  ) : (
    <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'right' }}>—</Typography>
  )

  const nombre = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', minWidth: 0, flexShrink: 1 }}>{s.jugador}</Typography>
      {tecnico && (
        <Box component="span" sx={{ flexShrink: 0, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(29,78,216,0.10)', color: 'primary.main', letterSpacing: '0.04em' }}>
          TÉCNICO
        </Box>
      )}
    </Box>
  )

  const zebra = i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent'
  const borde = ultima ? 'none' : '1px solid rgba(0,0,0,0.05)'

  if (isMobile) {
    // Móvil: fila apilada en dos niveles para que nada se encime.
    return (
      <Box sx={{ px: 1.5, py: 1.1, borderBottom: borde, bgcolor: zebra, '&:hover': { bgcolor: 'rgba(0,0,0,0.045)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>{nombre}</Box>
          <Box sx={{ flexShrink: 0 }}><EstadoChip s={s} compacto /></Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 0.75, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: '3.2rem' }}>{conteoAmarillas}</Box>
          <Box sx={{ minWidth: '3.2rem' }}>{conteoRojas}</Box>
          {(s.deuda_tarjetas || 0) > 0 && (
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'error.main' }}>Debe {mon(s.deuda_tarjetas)}</Typography>
          )}
          <Box sx={{ flex: '1 1 auto' }} />
          {accion}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', gap: 1,
      px: 2, py: 0.7, borderBottom: borde, bgcolor: zebra,
      '&:hover': { bgcolor: 'rgba(0,0,0,0.045)' },
    }}>
      {nombre}
      {conteoAmarillas}
      {conteoRojas}
      <EstadoChip s={s} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>{accion}</Box>
    </Box>
  )
}

export default function Sanciones({ selectedTorneoId }) {
  const qc = useQueryClient()
  const to = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [equipoSel, setEquipoSel] = useState('')
  const [pagoSel, setPagoSel] = useState(null)
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sanciones', selectedTorneoId],
    queryFn: () => apiGet(`/panel/${selectedTorneoId}/sanciones`),
    enabled: !!selectedTorneoId,
  })

  const pagoMut = useMutation({
    mutationFn: (body) => apiPost(`/torneos/${selectedTorneoId}/pagos`, body),
    onSuccess: () => {
      qc.invalidateQueries(['sanciones', selectedTorneoId])
      qc.invalidateQueries(['finanzas', selectedTorneoId])
      to.show('Pago registrado. Se actualizó la sanción.', 'success')
      cerrarPago()
    },
    onError: (e) => to.show(e.message, 'error'),
  })

  const abrirPago = (s) => {
    setPagoSel(s)
    const defaultMonto = s.deuda_tarjetas !== undefined && s.deuda_tarjetas > 0 ? s.deuda_tarjetas : (s.valor_tarjeta_amarilla > 0 ? s.valor_tarjeta_amarilla : (s.valor_tarjeta_roja > 0 ? s.valor_tarjeta_roja : ''))
    setMonto(defaultMonto > 0 ? String(defaultMonto) : '')
    setNota('')
  }

  const cerrarPago = () => {
    setPagoSel(null)
    setMonto('')
    setNota('')
  }

  const guardarPago = () => {
    const m = Number(monto)
    if (!pagoSel || !(m > 0)) {
      to.show('Ingresa un monto mayor a 0', 'error')
      return
    }
    pagoMut.mutate({
      concepto: pagoSel.proximo_pago || 'TARJETA_AMARILLA',
      monto: m,
      jugador_id: pagoSel.jugador_id,
      equipo_id: pagoSel.equipo_id,
      nota: nota.trim() || (pagoSel.proximo_pago === 'TARJETA_ROJA' ? `Roja ${pagoSel.jugador}` : `Amarilla ${pagoSel.jugador}`),
    })
  }

  const [prevTorneo, setPrevTorneo] = useState(selectedTorneoId)
  if (selectedTorneoId !== prevTorneo) {
    setPrevTorneo(selectedTorneoId)
    setEquipoSel('')
    cerrarPago()
  }

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver las sanciones.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  const sanciones = data?.sanciones || []
  const suspendidos = sanciones.filter((s) => s.suspendido)
  const totalAmarillas = sanciones.reduce((acc, s) => acc + (s.amarillas || 0), 0)
  const totalPagadas = sanciones.reduce((acc, s) => acc + (s.amarillas_pagadas || 0), 0)
  const totalRojas = sanciones.reduce((acc, s) => acc + (s.rojas || 0), 0)

  const porEquipo = {}
  sanciones.forEach((s) => {
    (porEquipo[s.equipo] = porEquipo[s.equipo] || []).push(s)
  })

  const equipos = Object.entries(porEquipo)
    .map(([nombre, jugadores]) => ({
      nombre,
      jugadores: [...jugadores].sort((a, b) => (b.rojas - a.rojas) || (b.amarillas - a.amarillas)),
      amarillas: jugadores.reduce((acc, s) => acc + (s.amarillas || 0), 0),
      rojas: jugadores.reduce((acc, s) => acc + (s.rojas || 0), 0),
      suspendidos: jugadores.filter((s) => s.suspendido).length,
    }))
    .sort((a, b) => (b.suspendidos - a.suspendidos) || ((b.rojas + b.amarillas) - (a.rojas + a.amarillas)))

  const activo = equipos.find((e) => e.nombre === equipoSel) || equipos[0]

  const celdasHeader = (label, justify = 'flex-start') => (
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: justify, textAlign: justify === 'center' ? 'center' : justify === 'flex-end' ? 'right' : 'left' }}>{label}</Typography>
  )

  const kpis = [
    { label: 'Amarillas', value: totalAmarillas, color: 'warning', extra: totalPagadas > 0 ? `${totalPagadas} pagadas` : null },
    { label: 'Rojas', value: totalRojas, color: 'error' },
    { label: 'Jugadores suspendidos', value: suspendidos.length, color: 'error' },
    { label: 'Equipos con tarjetas', value: equipos.length, color: 'info' },
  ]

  return (
    <Box>
      <PageHeader title="Sanciones" subtitle={`${data?.torneo} — acumulado por jugador (y técnicos) según el reglamento.`} />

      <Grid container spacing={2} mb={3}>
        {kpis.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card elevation={0} sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={800} color={`${s.color}.main`}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{s.label}</Typography>
                {s.extra && <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 700 }}>{s.extra}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {equipos.length === 0 ? (
        <Alert severity="info">No hay sanciones registradas en este torneo.</Alert>
      ) : (
        <Box>
          {/* Pestañas por equipo */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
            {equipos.map((equipo) => {
              const active = equipo.nombre === activo.nombre
              return (
                <Button
                  key={equipo.nombre}
                  size="small"
                  onClick={() => setEquipoSel(equipo.nombre)}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: 99, px: { xs: 1, sm: 1.5 }, minHeight: 36, gap: 0.6,
                    maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.2,
                    bgcolor: active ? 'primary.main' : 'background.default',
                    color: active ? 'primary.contrastText' : 'text.primary',
                    border: '1px solid', borderColor: active ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                  }}
                >
                  {equipo.nombre}
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'rgba(255,193,7,0.15)', color: active ? '#fff' : 'warning.dark' }}>
                    <span aria-hidden>🟨</span>{equipo.amarillas}
                  </Box>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'rgba(211,47,47,0.12)', color: active ? '#fff' : 'error.main' }}>
                    <span aria-hidden>🟥</span>{equipo.rojas}
                  </Box>
                  {equipo.suspendidos > 0 && (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'rgba(211,47,47,0.14)', color: active ? '#fff' : 'error.dark' }}>
                      <span aria-hidden>⛔</span>{equipo.suspendidos}
                    </Box>
                  )}
                </Button>
              )
            })}
          </Box>

          {/* Lista de amonestados */}
          <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {!isMobile && (
              <Box sx={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: 'rgba(0,0,0,0.045)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {celdasHeader('Jugador')}
                {celdasHeader('Amarillas', 'center')}
                {celdasHeader('Rojas', 'center')}
                {celdasHeader('Estado')}
                {celdasHeader('', 'flex-end')}
              </Box>
            )}
            {activo.jugadores.map((s, i) => (
              <Fila
                key={`${s.jugador_id ?? 'tec'}-${s.jugador}-${s.equipo}`}
                s={s}
                i={i}
                ultima={i === activo.jugadores.length - 1}
                isMobile={isMobile}
                onPagar={abrirPago}
              />
            ))}
          </Card>

          {totalPagadas > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {totalPagadas} amarilla{totalPagadas === 1 ? '' : 's'} pagada{totalPagadas === 1 ? '' : 's'}: no acumulan para suspensión.
            </Typography>
          )}
        </Box>
      )}

      {/* Registrar pago de amarilla */}
      <Dialog open={!!pagoSel} onClose={cerrarPago} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {pagoSel?.proximo_pago === 'TARJETA_ROJA' ? 'Registrar pago de roja' : 'Registrar pago de amarilla'}
        </DialogTitle>
        <DialogContent dividers>
          {pagoSel && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{pagoSel.jugador}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{pagoSel.equipo}</Typography>
               <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                 <Chip size="small" variant="outlined" color="warning"
                   label={`${pagoSel.amarillas} amarilla${pagoSel.amarillas === 1 ? '' : 's'} · ${pagoSel.amarillas_pagadas || 0} pagada${pagoSel.amarillas_pagadas === 1 ? '' : 's'}`} />
                 <Chip size="small" variant="outlined" color="error"
                   label={`${pagoSel.rojas} roja${pagoSel.rojas === 1 ? '' : 's'} · ${pagoSel.rojas_pagadas || 0} pagada${pagoSel.rojas_pagadas === 1 ? '' : 's'}`} />
                 {(pagoSel.deuda_tarjetas || 0) > 0 && (
                   <Chip size="small" variant="outlined" color="error" label={`Debe ${mon(pagoSel.deuda_tarjetas)}`} />
                 )}
               </Box>
               {pagoSel.proximo_pago === 'TARJETA_ROJA' && (
                 <Alert severity="info" sx={{ mb: 2 }}>Doble amarilla → se paga como roja.</Alert>
               )}
               <TextField label="Monto" type="number" fullWidth required autoFocus
                 inputProps={{ min: 0, step: 0.5 }}
                 value={monto}
                 onChange={(e) => setMonto(e.target.value)}
                 helperText={
                   pagoSel.proximo_pago === 'TARJETA_ROJA' && pagoSel.valor_tarjeta_roja > 0
                     ? `Valor de la roja en las reglas del torneo: ${mon(pagoSel.valor_tarjeta_roja)}`
                     : pagoSel.proximo_pago === 'TARJETA_AMARILLA' && pagoSel.valor_tarjeta_amarilla > 0
                       ? `Valor de la amarilla en las reglas del torneo: ${mon(pagoSel.valor_tarjeta_amarilla)}`
                       : 'Sin valor configurado en las reglas: ingresa el monto cobrado.'
                 } />
              <TextField label="Nota (opcional)" fullWidth margin="dense"
                value={nota} onChange={(e) => setNota(e.target.value)} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={cerrarPago} disabled={pagoMut.isPending}>Cancelar</Button>
          <Button variant="contained" onClick={guardarPago} disabled={pagoMut.isPending || !(Number(monto) > 0)}>
            {pagoMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Registrar pago'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
