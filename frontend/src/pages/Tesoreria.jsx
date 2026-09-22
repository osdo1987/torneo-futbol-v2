import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
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

const CONCEPTO_LABEL = {
  INSCRIPCION: 'Inscripción',
  TARJETA_AMARILLA: 'Tarjeta amarilla',
  TARJETA_ROJA: 'Tarjeta roja',
}

function DialogPago({ open, onClose, equipo, jugador, config, onSave }) {
  const [concepto, setConcepto] = useState('INSCRIPCION')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const to = useToast()

  const reset = () => {
    setConcepto(config?.modalidad_pago === 'GRUPAL' && !jugador ? 'INSCRIPCION' : 'INSCRIPCION')
    setMonto('')
    setNota('')
  }

  const submit = () => {
    const body = {
      concepto,
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
        Registrar pago — {jugador ? jugador.jugador : equipo.nombre}
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>Concepto</InputLabel>
          <Select value={concepto} label="Concepto" onChange={(e) => setConcepto(e.target.value)}>
            <MenuItem value="INSCRIPCION">Inscripción</MenuItem>
            {jugador && <MenuItem value="TARJETA_AMARILLA">Tarjeta amarilla</MenuItem>}
            {jugador && <MenuItem value="TARJETA_ROJA">Tarjeta roja</MenuItem>}
          </Select>
        </FormControl>
        <TextField label="Monto" type="number" fullWidth required sx={{ mt: 2 }}
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

const COLUMNAS = 'minmax(0,1fr) 7rem 8rem auto'

export default function Tesoreria({ selectedTorneoId }) {
  const qc = useQueryClient()
  const to = useToast()
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
        nombre,
        jugadores,
        bloqueados: jugadores.filter((j) => j.bloqueado).length,
        pendientes: jugadores.filter((j) => j.inscripcion_pendiente).length,
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

  const celdasHeader = (label, justify = 'flex-start') => (
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary', justifyContent: justify, display: 'flex', alignItems: 'center' }}>{label}</Typography>
  )

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

          {esGrupal && (
            <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => setPago({ equipo: activo, jugador: null })}>
              Registrar inscripción grupal de {activo.nombre}
            </Button>
          )}

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
                    <Tooltip title="Registrar pago">
                      <IconButton size="small" onClick={() => setPago({ equipo: activo, jugador: j })}>
                        <ReceiptLongIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )
            })}
          </Card>
        </Box>
      )}

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mt: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.25, bgcolor: 'rgba(0,0,0,0.045)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Pagos registrados ({data?.pagos?.length || 0})
          </Typography>
        </Box>
        {(!data?.pagos || data.pagos.length === 0) ? (
          <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Aún no hay pagos registrados.</Typography></Box>
        ) : (
          data.pagos.map((p, i) => (
            <Box key={p.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.6,
              borderBottom: i === data.pagos.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
              bgcolor: i % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
            }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                {p.jugador || p.equipo}
              </Typography>
              <Chip size="small" label={CONCEPTO_LABEL[p.concepto] || p.concepto} variant="outlined" sx={{ height: 22 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{mon(p.monto)}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.nota}</Typography>
              <IconButton size="small" color="error" onClick={() => delMut.mutate(p.id)}>
                <DeleteIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
          ))
        )}
      </Card>

      {pago && (
        <DialogPago
          open
          onClose={() => setPago(null)}
          equipo={pago.equipo}
          jugador={pago.jugador}
          config={cfg}
          onSave={addMut.mutate}
        />
      )}
    </Box>
  )
}