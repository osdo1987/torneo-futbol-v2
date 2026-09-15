import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Image as ImageIcon,
  Public as PublicIcon,
} from '@mui/icons-material'
import { apiGet, apiPut, apiUpload } from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'

const FEATURE_ICONS = [
  { value: 'star', label: '⭐ Estrella' },
  { value: 'users', label: '👥 Usuarios' },
  { value: 'zap', label: '⚡ Rayo' },
  { value: 'heart', label: '❤️ Corazón' },
  { value: 'shield', label: '🛡️ Escudo' },
  { value: 'clock', label: '⏰ Reloj' },
  { value: 'award', label: '🏆 Trofeo' },
  { value: 'trending', label: '📈 Tendencia' },
  { value: 'credit-card', label: '💳 Tarjeta' },
  { value: 'clipboard', label: '📋 Clip' },
]

const TABS = [
  { id: 'identidad', label: 'Identidad' },
  { id: 'hero', label: 'Hero / Banner' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'galeria', label: 'Galería' },
  { id: 'contacto', label: 'Contacto' },
  { id: 'redes', label: 'Redes sociales' },
  { id: 'visibilidad', label: 'Visibilidad' },
]

function PreviewImage({ url }) {
  if (!url) return null
  return (
    <Box component="img" src={url} alt="Preview"
      sx={{ mt: 1, maxWidth: 220, maxHeight: 120, borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)' }} />
  )
}

export default function LandingConfig({ user }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const orgId = user?.organizadorId
  const [tab, setTab] = useState('identidad')
  const [orgForm, setOrgForm] = useState(null)
  const [landingForm, setLandingForm] = useState(null)

  const { isLoading, isError, error } = useQuery({
    queryKey: ['landing-config'],
    queryFn: () => apiGet('/landing/manage'),
    enabled: !!orgId,
    onSuccess: (d) => {
      setOrgForm(d.organizador)
      setLandingForm(d.landing)
    },
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      if (orgForm) await apiPut(`/organizadores/${orgId}`, orgForm)
      await apiPut('/landing/manage', landingForm)
    },
    onSuccess: () => toast.show('Landing guardada correctamente', 'success'),
    onError: (e) => toast.show(e.message, 'error'),
  })

  const uploadMut = useMutation({
    mutationFn: (file) => apiUpload('/landing/upload-image', file),
    onSuccess: async (res) => {
      toast.show('Imagen subida. Pruébalo ya, se copió al portapapeles', 'success')
      try { await navigator.clipboard.writeText(res.url) } catch { /* noop */ }
    },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const setOrg = (k) => (e) => setOrgForm({ ...orgForm, [k]: e.target.value })
  const setLanding = (k) => (e) => setLandingForm({ ...landingForm, [k]: e.target.value })
  const setLandingBool = (k) => (e) => setLandingForm({ ...landingForm, [k]: e.target.checked })

  const addFeature = () => setLandingForm({ ...landingForm, features: [...(landingForm?.features || []), { icon: 'star', title: '', description: '' }] })
  const updateFeature = (i, k, v) => {
    const features = [...(landingForm.features || [])]
    features[i] = { ...features[i], [k]: v }
    setLandingForm({ ...landingForm, features })
  }
  const removeFeature = (i) => setLandingForm({ ...landingForm, features: landingForm.features.filter((_, idx) => idx !== i) })

  const addGallery = () => setLandingForm({ ...landingForm, gallery_images: [...(landingForm?.gallery_images || []), { url: '', caption: '' }] })
  const updateGallery = (i, k, v) => {
    const images = [...(landingForm.gallery_images || [])]
    images[i] = { ...images[i], [k]: v }
    setLandingForm({ ...landingForm, gallery_images: images })
  }
  const removeGallery = (i) => setLandingForm({ ...landingForm, gallery_images: landingForm.gallery_images.filter((_, idx) => idx !== i) })

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError) return <Alert severity="error">{error.message}</Alert>
  if (!orgId) return <Alert severity="info">Esta sección es solo para organizadores con su propia landing.</Alert>
  if (!landingForm) return null

  const publicUrl = `${window.location.origin}/l/${orgForm?.slug || ''}`

  return (
    <Box>
      <PageHeader title="Landing Page" subtitle="Personaliza la página pública de tu organizador." actions={<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><Button component="a" href={publicUrl} target="_blank" rel="noopener noreferrer" size="small" startIcon={<PublicIcon fontSize="small" />} sx={{ mt: 1 }}>{publicUrl}</Button><Button variant="contained" startIcon={<SaveIcon />} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>{saveMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar cambios'}</Button></Box>} />

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {TABS.map((t) => <Tab key={t.id} label={t.label} value={t.id} />)}
        </Tabs>

        <CardContent>
          {/* Subir imagen */}
          <input
            type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) uploadMut.mutate(e.target.files[0]); e.target.value = '' }}
          />
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => fileInputRef.current.click()} size="small">
              Subir imagen
            </Button>
            <Typography variant="caption" color="text.secondary">Máx 5MB · png/jpg/gif/webp/svg. La URL se copia al portapapeles para pegarla en los campos.</Typography>
          </Box>

          {tab === 'identidad' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Datos del organizador y branding</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Nombre" fullWidth size="small" value={orgForm.name || ''} onChange={setOrg('name')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Slug (URL)" fullWidth size="small" value={orgForm.slug || ''} disabled
                    helperText="Identificador de la URL; no puede cambiarse desde aquí." />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Mensaje de bienvenida" fullWidth size="small" value={orgForm.welcome_message || ''} onChange={setOrg('welcome_message')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Color principal" type="color" fullWidth size="small" value={orgForm.primary_color || '#6366f1'} onChange={setOrg('primary_color')}
                    InputProps={{ startAdornment: <InputAdornment position="start">{orgForm.primary_color || '#6366f1'}</InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Logo (URL)" fullWidth size="small" value={orgForm.logo_url || ''} onChange={setOrg('logo_url')} placeholder="https://ejemplo.com/logo.png" />
                  <PreviewImage url={orgForm.logo_url} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="WhatsApp" fullWidth size="small" value={orgForm.whatsapp || ''} onChange={setOrg('whatsapp')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Descripción" fullWidth size="small" multiline minRows={2} value={orgForm.description || ''} onChange={setOrg('description')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Dirección" fullWidth size="small" value={orgForm.address || ''} onChange={setOrg('address')} />
                </Grid>
              </Grid>
            </Box>
          )}

          {tab === 'hero' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Hero / Banner (portada)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Título principal" fullWidth size="small" value={landingForm.hero_title || ''} onChange={setLanding('hero_title')} placeholder="Bienvenido a nuestro torneo" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Subtítulo" fullWidth size="small" value={landingForm.hero_subtitle || ''} onChange={setLanding('hero_subtitle')} placeholder="Subtítulo opcional" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="URL del banner (imagen de fondo)" fullWidth size="small" value={landingForm.banner_url || ''} onChange={setLanding('banner_url')} placeholder="https://ejemplo.com/banner.jpg" />
                  <PreviewImage url={landingForm.banner_url} />
                </Grid>
              </Grid>
            </Box>
          )}

          {tab === 'nosotros' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Sección "Sobre nosotros"</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Título de la sección" fullWidth size="small" value={landingForm.about_title || ''} onChange={setLanding('about_title')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="URL de imagen" fullWidth size="small" value={landingForm.about_image_url || ''} onChange={setLanding('about_image_url')} placeholder="https://ejemplo.com/imagen.jpg" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Texto descriptivo" fullWidth size="small" multiline minRows={4} value={landingForm.about_text || ''} onChange={setLanding('about_text')} placeholder="Describe tu liga / cancha..." />
                </Grid>
                <Grid item xs={12}><PreviewImage url={landingForm.about_image_url} /></Grid>
              </Grid>
            </Box>
          )}

          {tab === 'servicios' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Servicios / características</Typography>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addFeature}>Agregar</Button>
              </Box>
              <TextField label="Título de la sección" fullWidth size="small" sx={{ mb: 2 }} value={landingForm.features_title || ''} onChange={setLanding('features_title')} />
              {landingForm.features?.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>No hay servicios. Haz clic en "Agregar".</Alert>
              )}
              {landingForm.features?.map((f, i) => (
                <Box key={i} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Servicio {i + 1}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeFeature(i)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Icono</InputLabel>
                        <Select label="Icono" value={f.icon || 'star'} onChange={(e) => updateFeature(i, 'icon', e.target.value)}>
                          {FEATURE_ICONS.map((ic) => <MenuItem key={ic.value} value={ic.value}>{ic.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="Título" fullWidth size="small" value={f.title || ''} onChange={(e) => updateFeature(i, 'title', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="Descripción" fullWidth size="small" value={f.description || ''} onChange={(e) => updateFeature(i, 'description', e.target.value)} />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          )}

          {tab === 'galeria' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Galería de imágenes</Typography>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addGallery}>Agregar imagen</Button>
              </Box>
              <TextField label="Título de la sección" fullWidth size="small" sx={{ mb: 2 }} value={landingForm.gallery_title || ''} onChange={setLanding('gallery_title')} />
              {landingForm.gallery_images?.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>No hay imágenes. Haz clic en "Agregar imagen".</Alert>
              )}
              {landingForm.gallery_images?.map((img, i) => (
                <Box key={i} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Imagen {i + 1}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeGallery(i)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                  <Grid container spacing={2} alignItems="start">
                    <Grid item xs={12} sm={6}>
                      <TextField label="URL de la imagen" fullWidth size="small" value={img.url || ''} onChange={(e) => updateGallery(i, 'url', e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Pie de foto" fullWidth size="small" value={img.caption || ''} onChange={(e) => updateGallery(i, 'caption', e.target.value)} />
                    </Grid>
                  </Grid>
                  <PreviewImage url={img.url} />
                </Box>
              ))}
            </Box>
          )}

          {tab === 'contacto' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Información de contacto</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Correo electrónico" fullWidth size="small" type="email" value={landingForm.contact_email || ''} onChange={setLanding('contact_email')} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Teléfono" fullWidth size="small" value={landingForm.contact_phone || ''} onChange={setLanding('contact_phone')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Dirección (opcional, si difiere de la del organizador)" fullWidth size="small" value={landingForm.address || ''} onChange={setLanding('address')} />
                </Grid>
              </Grid>
            </Box>
          )}

          {tab === 'redes' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Redes sociales y footer</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField label="Facebook (URL)" fullWidth size="small" value={landingForm.social_facebook || ''} onChange={setLanding('social_facebook')} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Instagram (URL)" fullWidth size="small" value={landingForm.social_instagram || ''} onChange={setLanding('social_instagram')} /></Grid>
                <Grid item xs={12} md={6}><TextField label="WhatsApp (URL completa, ej: https://wa.me/57...)" fullWidth size="small" value={landingForm.social_whatsapp || ''} onChange={setLanding('social_whatsapp')} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Twitter / X (URL)" fullWidth size="small" value={landingForm.social_twitter || ''} onChange={setLanding('social_twitter')} /></Grid>
                <Grid item xs={12} md={6}><TextField label="YouTube (URL)" fullWidth size="small" value={landingForm.social_youtube || ''} onChange={setLanding('social_youtube')} /></Grid>
                <Grid item xs={12}>
                  <TextField label="Texto del footer" fullWidth size="small" value={landingForm.footer_text || ''} onChange={setLanding('footer_text')} />
                </Grid>
              </Grid>
            </Box>
          )}

          {tab === 'visibilidad' && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Secciones visibles en la landing</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Activa o desactiva qué secciones se muestran.</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {[
                  ['show_login_in_hero', 'Formulario de login en el Hero'],
                  ['show_about', 'Sección "Sobre nosotros"'],
                  ['show_features', 'Sección "Servicios"'],
                  ['show_gallery', 'Sección "Galería"'],
                  ['show_contact', 'Sección "Contacto"'],
                  ['show_footer_social', 'Redes sociales en el footer'],
                  ['show_registration', 'Botón "Registrarse"'],
                ].map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={<Switch checked={!!landingForm[key]} onChange={setLandingBool(key)} />}
                    label={label}
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Guardar cambios'}
        </Button>
      </Box>
    </Box>
  )
}