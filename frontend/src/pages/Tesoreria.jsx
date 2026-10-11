import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  ReceiptLong as ReceiptLongIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material'
import PageHeader from '../components/PageHeader'
import { apiGet, apiPost, apiDelete } from '../api'
import { useToast } from '../components/Toast'

const mon = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })

const fecha = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })
}

const CONCEPTO_LABEL = {
  INSCRIPCION: 'Inscripción',
  TARJETA_AMARILLA: 'Tarjeta amarilla',
  TARJETA_ROJA: 'Tarjeta roja',
}

const COLS_PAGOS = 'minmax(0,1.4fr) 10rem minmax(0,1.2fr) 7rem 6rem max-content'

function ConceptoIcon({ concepto }) {
  if (concepto === 'TARJETA_AMARILLA') {
    return <Box sx={{ width: 12, height: 16, borderRadius: '2px', bgcolor: 'warning.main', flexShrink: 0 }} />
  }
  if (concepto === 'TARJETA_ROJA') {
    return <Box sx={{ width: 12, height: 16, borderRadius: '2px', bgcolor: 'error.main', flexShrink: 0 }} />
  }
  return <ReceiptLongIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
}

function DialogPago({ open, onClose, equipo, jugador, onSave }) {
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const to = useToast()

  const reset = () => {
    setMonto('')
    setNota('')
  }

  const submit = () => {
    const body = {
      concepto: 'INSCRIPCION',
      monto: Number(monto),
      nota,
      jugador_id: jugador ? jugador.jugador_id : null,
      equipo_id: !jugador ? equipo.id : null,
    }
    onSave(body)
    onClose()
    reset()
    to.show('Pago registrado', 'success')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Registrar inscripción — {jugador ? jugador.jugador : equipo.nombre}
      </DialogTitle>
      <DialogContent>
        <TextField label="Monto" type="number" fullWidth required sx={{ mt: 1 }}
          value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
        <TextField label="Nota (opcional)" fullWidth sx={{ mt: 2 }}
          value={nota} onChange={(e) => setNota(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={!monto || Number(monto) <= 0}>Guardar pago</Button>
      </DialogActions>
    </Dialog>
  )
}

const celdasHeader = (label, justify = 'flex-start') => (
  <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary', justifyContent: justify, display: 'flex', alignItems: 'center' }}>{label}</Typography>
)

function PagosList({ pagos, onDelete, isMobile, emptyText = 'Aún no hay pagos registrados.' }) {
  if (pagos.length === 0) {
    return <Box sx={{ p: 1.5 }}><Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{emptyText}</Typography></Box>
  }
  if (isMobile) {
    return pagos.map((p, i) => (
      <Box key={p.id} sx={{
        px: 1.5, py: 0.5,
        borderBottom: i === pagos.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
        bgcolor: i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 0, flexShrink: 1 }} noWrap>
            {p.jugador || p.equipo}
          </Typography>
          <Tooltip title={CONCEPTO_LABEL[p.concepto] || p.concepto}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <ConceptoIcon concepto={p.concepto} />
            </Box>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 6 }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }}>{fecha(p.created_at)}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}>{mon(p.monto)}</Typography>
          <IconButton size="small" color="error" onClick={() => onDelete(p.id)} sx={{ flexShrink: 0, ml: 0.25, py: 0.25 }}>
            <DeleteIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
        {p.nota && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', minWidth: 0, mt: 0.15 }} noWrap>
            {p.nota}
          </Typography>
        )}
      </Box>
    ))
  }
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: COLS_PAGOS, alignItems: 'center', gap: 1, px: 1.5, py: 0.65, bgcolor: 'rgba(0,0,0,0.025)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {celdasHeader('Pagador')}
        {celdasHeader('Concepto')}
        {celdasHeader('Nota')}
        {celdasHeader('Fecha')}
        {celdasHeader('Monto', 'flex-end')}
        {celdasHeader('', 'flex-end')}
      </Box>
      {pagos.map((p, i) => (
        <Box key={p.id} sx={{
          display: 'grid', gridTemplateColumns: COLS_PAGOS, alignItems: 'center', gap: 1, px: 1.5, py: 0.3,
          borderBottom: i === pagos.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
          bgcolor: i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.045)' },
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 0 }} noWrap>
            {p.jugador || p.equipo}
          </Typography>
          <Chip size="small" label={CONCEPTO_LABEL[p.concepto] || p.concepto} variant="outlined" sx={{ height: 19, fontSize: 10.5, justifySelf: 'start', maxWidth: '100%', '& .MuiChip-label': { px: 0.8 } }} />
          <Tooltip title={p.nota || ''} disableHoverListener={!p.nota}>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', minWidth: 0 }} noWrap>
              {p.nota || '—'}
            </Typography>
          </Tooltip>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>{fecha(p.created_at)}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 800, textAlign: 'right' }}>{mon(p.monto)}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <IconButton size="small" color="error" onClick={() => onDelete(p.id)} sx={{ py: 0.25, px: 0.5 }}>
              <DeleteIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Box>
      ))}
    </>
  )
}

const COLUMNAS = 'minmax(0,1fr) 7rem 8rem auto'

export default function Tesoreria({ selectedTorneoId }) {
  const qc = useQueryClient()
  const to = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [equipoSel, setEquipoSel] = useState('')
  const [pago, setPago] = useState(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['finanzas', selectedTorneoId],
    queryFn: () => apiGet(`/torneos/${selectedTorneoId}/finanzas`),
    enabled: !!selectedTorneoId,
  })

  const delMut = useMutation({
    mutationFn: (id) => apiDelete(`/pagos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['finanzas', selectedTorneoId])
      to.show('Pago eliminado', 'success')
    },
    onError: (e) => to.show(e.message, 'error'),
  })

  const addMut = useMutation({
    mutationFn: (body) => apiPost(`/torneos/${selectedTorneoId}/pagos`, body),
    onSuccess: () => qc.invalidateQueries(['finanzas', selectedTorneoId]),
    onError: (e) => to.show(e.message, 'error'),
  })

  const [prevTorneo, setPrevTorneo] = useState(selectedTorneoId)
  if (selectedTorneoId !== prevTorneo) {
    setPrevTorneo(selectedTorneoId)
    setEquipoSel('')
  }

  const equipos = useMemo(() => {
    const map = {}
    ;(data?.jugadores || []).forEach((j) => {
      ;(map[j.equipo] = map[j.equipo] || []).push(j)
    })
    return Object.entries(map)
      .map(([nombre, jugadores]) => ({
        id: jugadores[0]?.equipo_id,
        nombre,
        jugadores,
        bloqueados: jugadores.filter((j) => j.bloqueado).length,
        pendientes: jugadores.filter((j) => j.inscripcion_pendiente).length,
        inscripcionPendiente: jugadores.some((j) => j.inscripcion_pendiente),
        deuda: jugadores.reduce((a, j) => a + (j.deuda_tarjetas || 0), 0),
      }))
      .sort((a, b) => b.deuda - a.deuda || b.bloqueados - a.bloqueados)
  }, [data])

  if (!selectedTorneoId) return <Alert severity="info">Selecciona un torneo para ver la tesorería.</Alert>
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>

  const cfg = data?.config || {}
  const rus = data?.resumen || {}
  const activo = equipos.find((e) => e.nombre === equipoSel) || equipos[0]
  const esGrupal = cfg.modalidad_pago === 'GRUPAL'
  const pagosEquipo = (data?.pagos || []).filter((p) => p.equipo_id === activo.id)
  const pagosTarjetas = (data?.pagos || []).filter((p) => p.concepto === 'TARJETA_AMARILLA' || p.concepto === 'TARJETA_ROJA')

  return (
    <Box>
      <PageHeader title="Tesorería" subtitle={`${data?.torneo} — recaudo de inscripciones y sanciones de tarjetas.`} />

      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Recaudado', value: mon(rus.recaudado), color: 'success' },
          { label: 'Por inscripción', value: mon(rus.recaudado_inscripcion), color: 'primary' },
          { label: 'Por tarjetas', value: mon(rus.recaudado_tarjetas), color: 'info' },
          { label: 'Deuda inscripción', value: `${mon(rus.deuda_inscripcion)} · ${rus.jugadores_sin_inscripcion}`, color: 'error' },
          { label: 'Deuda tarjetas', value: mon(rus.deuda_tarjetas), color: 'error' },
          { label: 'Bloqueados', value: rus.jugadores_bloqueados, color: 'warning' },
        ].map((s) => (
          <Grid item xs={6} md={4} key={s.label}>
            <Card elevation={0} sx={{ height: '100%', border: '1px solid rgba(0,0,0,0.06)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} color={`${s.color}.main`}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" fontWeight={800}>Configuración financiera</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" label={`Amarilla: ${mon(cfg.valor_tarjeta_amarilla)}`} />
            <Chip size="small" label={`Roja: ${mon(cfg.valor_tarjeta_roja)}`} color="error" variant="outlined" />
            <Chip size="small" label={`Inscripción ${esGrupal ? 'grupal (por equipo)' : 'individual'}: ${mon(cfg.valor_inscripcion)}`} color="primary" variant="outlined" />
            {cfg.bloquear_por_inscripcion_pendiente && <Chip size="small" label="Bloqueo por inscripción pendiente" color="warning" variant="outlined" />}
            {cfg.bloquear_por_tarjetas_no_pagadas && <Chip size="small" label="Bloqueo por tarjetas sin pagar" color="warning" variant="outlined" />}
          </Box>
        </CardContent>
      </Card>

      {!cfg.valor_inscripcion && !cfg.valor_tarjeta_amarilla && (
        <Alert severity="info" sx={{ mb: 2 }}>
          El torneo no tiene valores financieros configurados. Ajustalos en Torneos → Reglamento → Configuración Financiera.
        </Alert>
      )}

      {equipos.length === 0 ? (
        <Alert severity="info">No hay jugadores en este torneo.</Alert>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
            {equipos.map((equipo) => {
              const active = equipo.nombre === activo.nombre
              return (
                <Button key={equipo.nombre} size="small" onClick={() => setEquipoSel(equipo.nombre)}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: 99, px: 1.5, minHeight: 36, gap: 0.6,
                    bgcolor: active ? 'primary.main' : 'background.default',
                    color: active ? 'primary.contrastText' : 'text.primary',
                    border: '1px solid', borderColor: active ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                  }}>
                  {equipo.nombre}
                  {equipo.bloqueados > 0 && (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, px: 0.6, py: 0.15, borderRadius: 99, fontSize: 11, fontWeight: 800, bgcolor: active ? 'rgba(0,0,0,0.18)' : 'error.main', color: '#fff' }}>
                      <LockIcon sx={{ fontSize: 12 }} />{equipo.bloqueados}
                    </Box>
                  )}
                </Button>
              )
            })}
          </Box>

          {esGrupal ? (
            <>
              {/* Inscripción a nivel equipo */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{activo.nombre}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small"
                        icon={activo.inscripcionPendiente ? undefined : <CheckCircleIcon sx={{ fontSize: 14 }} />}
                        label={activo.inscripcionPendiente ? 'Inscripción pendiente' : 'Inscripción pagada'}
                        color={activo.inscripcionPendiente ? 'error' : 'success'} variant="outlined"
                        sx={{ height: 24, '& .MuiChip-icon': { marginLeft: '6px' } }} />
                      <Typography variant="caption" color="text.secondary">Valor equipo: {mon(cfg.valor_inscripcion)}</Typography>
                      {activo.deuda > 0 && (
                        <Typography variant="caption" color="error.main" fontWeight={700}>Deuda tarjetas: {mon(activo.deuda)}</Typography>
                      )}
                    </Box>
                  </Box>
                  <Button variant="contained" size="small" startIcon={<AddIcon />}
                    disabled={!activo.inscripcionPendiente}
                    onClick={() => setPago({ equipo: activo, jugador: null })}>
                    {activo.inscripcionPendiente ? 'Registrar inscripción grupal' : 'Inscripción registrada'}
                  </Button>
                </CardContent>
              </Card>

              {/* Pagos del equipo */}
              <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
<Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(0,0,0,0.045)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Pagos de {activo.nombre} ({pagosEquipo.length})
          </Typography>
        </Box>
                <PagosList pagos={pagosEquipo} onDelete={delMut.mutate} isMobile={isMobile} emptyText="Este equipo aún no tiene pagos registrados." />
              </Card>
            </>
          ) : (
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: COLUMNAS, alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: 'rgba(0,0,0,0.045)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {celdasHeader('Jugador')}
                {celdasHeader('Inscripción', 'center')}
                {celdasHeader('Deuda tarjetas')}
                {celdasHeader('')}
              </Box>
              {activo.jugadores.map((j, i) => {
                const inscOk = !j.inscripcion_pendiente
                return (
                  <Box key={j.jugador_id} sx={{
                    display: 'grid', gridTemplateColumns: COLUMNAS, alignItems: 'center', gap: 1,
                    px: 2, py: 0.55,
                    borderBottom: i === activo.jugadores.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                    bgcolor: i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.045)' },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 800, bgcolor: j.bloqueado ? 'error.light' : 'primary.light', color: '#fff' }}>
                        {j.numero || '?'}
                      </Avatar>
                      <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: j.bloqueado ? 'text.secondary' : 'text.primary' }}>
                        {j.jugador}
                      </Typography>
                      {j.bloqueado && (
                        <Tooltip title={j.motivos.join(' · ')}>
                          <LockIcon sx={{ fontSize: 15, color: 'error.main' }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Chip size="small" icon={inscOk ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                        label={inscOk ? 'Pagado' : 'Pendiente'}
                        color={inscOk ? 'success' : 'error'} variant="outlined" sx={{ height: 24, '& .MuiChip-icon': { marginLeft: '6px' } }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: j.deuda_tarjetas > 0 ? 'error.main' : 'success.main' }}>
                      {j.deuda_tarjetas > 0 ? mon(j.deuda_tarjetas) : '—'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Registrar pago de inscripción">
                        <IconButton size="small" onClick={() => setPago({ equipo: activo, jugador: j })}>
                          <ReceiptLongIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )
              })}
            </Card>
          )}
        </Box>
      )}

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mt: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(0,0,0,0.045)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Pagos de tarjetas ({pagosTarjetas.length})
          </Typography>
        </Box>
        <PagosList pagos={pagosTarjetas} onDelete={delMut.mutate} isMobile={isMobile} emptyText="No hay pagos de tarjetas registrados." />
      </Card>

      {pago && (
        <DialogPago
          open
          onClose={() => setPago(null)}
          equipo={pago.equipo}
          jugador={pago.jugador}
          onSave={addMut.mutate}
        />
      )}
    </Box>
  )
}