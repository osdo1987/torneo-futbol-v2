import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Button, CircularProgress, Alert,
} from '@mui/material'
import { Print as PrintIcon, ArrowBack } from '@mui/icons-material'
import { apiGet } from '../api'
import '../actaPrint.css'

const fmtFecha = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}
const fmtHora = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function Alineaciones({ acta }) {
  return (
    <section className="acta-sec">
      <h3>3. Alineaciones</h3>
      <div className="acta-cols">
        {(acta.alineaciones?.equipos || []).map((eq) => {
          const titulares = (eq.jugadores || []).filter((j) => j.titular)
          const suplentes = (eq.jugadores || []).filter((j) => !j.titular)
          return (
            <div key={eq.equipo_id}>
              <h4>{eq.nombre}</h4>
              <p className="acta-titular-tag">Titulares ({titulares.length})</p>
              <ul className="acta-list">
                {titulares.map((j) => (
                  <li key={j.jugador_id}>{j.numero ? `${j.numero} · ` : ''}{j.nombre}</li>
                ))}
              </ul>
              <p className="acta-titular-tag">Suplentes ({suplentes.length})</p>
              <ul className="acta-list">
                {suplentes.map((j) => (
                  <li key={j.jugador_id}>{j.numero ? `${j.numero} · ` : ''}{j.nombre}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Acta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [acta, setActa] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    setLoading(true)
    apiGet(`/landing/partido/${id}/acta`)
      .then((d) => { if (on) { setActa(d); setError(null) } })
      .catch((e) => { if (on) setError(e.message) })
      .finally(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [id])

  const fechas = acta?.fecha_programada
  const arbitro = acta?.arbitro
  const local = acta?.equipos?.[0]
  const visitante = acta?.equipos?.[1]

  return (
    <Box sx={{ py: 3 }}>
      <Box className="acta-toolbar">
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Volver
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Imprimir acta
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>No se pudo cargar el acta: {error}</Alert>
      )}

      {acta && (
        <div className="acta-sheet">
          <header className="acta-head">
            <div>
              <h1>ACTA DE PARTIDO</h1>
              <p className="acta-org">{acta.organizador || 'Organizador'} · {acta.torneo || ''}</p>
            </div>
            <div className="acta-num">
              <span className="acta-token">{acta.token}</span>
              <span>Emitida: {fmtFecha(acta.emitido_at)}</span>
            </div>
          </header>

          <section className="acta-sec">
            <h3>1. Datos del partido</h3>
            <table className="acta-tabla">
              <tbody>
                <tr><td>Torneo</td><td>{acta.torneo}</td></tr>
                <tr><td>Jornada</td><td>{acta.jornada}</td></tr>
                <tr>
                  <td>Fecha programada</td>
                  <td>{fechas ? `${fmtFecha(fechas)} · ${fmtHora(fechas)}` : '—'}</td>
                </tr>
                <tr>
                  <td>Escenario</td>
                  <td>{acta.locacion?.nombre || 'Por definir'}{acta.locacion?.direccion ? ` — ${acta.locacion.direccion}` : ''}</td>
                </tr>
                <tr>
                  <td>Árbitro principal</td>
                  <td>{arbitro?.principal || 'Por designar'}</td>
                </tr>
                <tr>
                  <td>Árbitros asistentes</td>
                  <td>{`${arbitro?.asistente1 || '—'} · ${arbitro?.asistente2 || '—'}`}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="acta-sec">
            <h3>2. Equipos y resultado</h3>
            <div className="acta-marcador">
              <div className="acta-equipo">
                <h4>{local?.nombre || 'Local'}</h4>
                <p>Director Técnico: {local?.tecnico || 'No registrado'}</p>
                <p>Delegado: {local?.delegado_email || '—'}</p>
                <p className="acta-score">{acta.marcador?.local ?? 0}</p>
              </div>
              <div className="acta-vs"><span>vs</span><span className="acta-res-tag">{acta.resultado || 'PENDIENTE'}</span></div>
              <div className="acta-equipo">
                <h4>{visitante?.nombre || 'Visitante'}</h4>
                <p>Director Técnico: {visitante?.tecnico || 'No registrado'}</p>
                <p>Delegado: {visitante?.delegado_email || '—'}</p>
                <p className="acta-score">{acta.marcador?.visitante ?? 0}</p>
              </div>
            </div>
          </section>

          <Alineaciones acta={acta} />

          <section className="acta-sec">
            <h3>4. Goles</h3>
            {(acta.goles || []).length === 0 ? (
              <p className="acta-empty">No hubo goles.</p>
            ) : (
              <table className="acta-tabla">
                <thead><tr><th>Min.</th><th>Equipo</th><th>Jugador</th><th>Detalle</th></tr></thead>
                <tbody>
                  {(acta.goles || []).map((g, i) => (
                    <tr key={i}>
                      <td>{g.minuto}'</td>
                      <td>{g.equipo || '—'}</td>
                      <td>{g.jugador || '—'}{g.dorsal ? ` (#${g.dorsal})` : ''}</td>
                      <td>{g.tipo === 'AUTOGOL' ? 'Autogol' : (g.descripcion || 'Gol')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="acta-sec">
            <h3>5. Tarjetas</h3>
            {(acta.tarjetas || []).length === 0 ? (
              <p className="acta-empty">No hubo amonestaciones ni expulsiones.</p>
            ) : (
              <table className="acta-tabla">
                <thead><tr><th>Min.</th><th>Equipo</th><th>Sancionado</th><th>Cargo</th><th>Tarjeta</th></tr></thead>
                <tbody>
                  {(acta.tarjetas || []).map((t, i) => (
                    <tr key={i}>
                      <td>{t.minuto}'</td>
                      <td>{t.equipo || '—'}</td>
                      <td>{t.sancionado || '—'}{t.dorsal ? ` (#${t.dorsal})` : ''}</td>
                      <td>{t.cargo || 'JUGADOR'}</td>
                      <td>{t.tipo === 'TARJETA_AMARILLA' ? 'Amarilla' : 'Roja'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="acta-sec">
            <h3>6. Sustituciones</h3>
            {(acta.cambios || []).length === 0 ? (
              <p className="acta-empty">No hubo sustituciones.</p>
            ) : (
              <table className="acta-tabla">
                <thead><tr><th>Min.</th><th>Equipo</th><th>Sale</th><th>Entra</th></tr></thead>
                <tbody>
                  {(acta.cambios || []).map((c, i) => (
                    <tr key={i}>
                      <td>{c.minuto}'</td>
                      <td>{c.equipo || '—'}</td>
                      <td>{c.sale || '—'}</td>
                      <td>{c.entra || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="acta-sec">
            <h3>7. Incidencias y observaciones</h3>
            {(acta.observaciones || '').trim() ? (
              <p className="acta-obs">{acta.observaciones}</p>
            ) : (
              <p className="acta-empty">Sin incidencias registradas.</p>
            )}
          </section>

          <section className="acta-sec">
            <h3>8. Firmas</h3>
            <div className="acta-firmas">
              <div>
                <p className="acta-firma-line">{arbitro?.principal || '······'}</p>
                <p>Árbitro principal</p>
              </div>
              <div>
                <p className="acta-firma-line">{local?.delegado_email || '······'}</p>
                <p>Delegado del club local</p>
              </div>
              <div>
                <p className="acta-firma-line">{visitante?.delegado_email || '······'}</p>
                <p>Delegado del club visitante</p>
              </div>
            </div>
          </section>

          <footer className="acta-foot">
            <p>{acta.token} · Generado automáticamente por Torneo Fútbol · {fmtFecha(acta.emitido_at)}</p>
          </footer>
        </div>
      )}
    </Box>
  )
}