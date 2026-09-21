from app.extensions import db
from app.models.organizador import Organizador
from app.models.landing import OrganizadorLanding
from app.models.torneo import Torneo
from app.models.partido import Partido
from app.models.partido_alineacion import PartidoAlineacion
from app.models.partido_en_vivo import PartidoEnVivo
from app.models.equipo import Equipo
from app.models.jugador import Jugador

# Orden de visualización de las líneas en la formación (estilo TV)
POSICION_ORDEN = {'POR': 0, 'DEF': 1, 'MED': 2, 'DEL': 3, 'OTROS': 4}

# Campos editables de la landing (mapeo directo atributo -> columna)
LANDING_FIELDS = {
    'hero_title', 'hero_subtitle', 'banner_url',
    'about_title', 'about_text', 'about_image_url',
    'features_title', 'features',
    'gallery_title', 'gallery_images',
    'contact_email', 'contact_phone', 'address',
    'social_facebook', 'social_instagram', 'social_whatsapp',
    'social_twitter', 'social_youtube',
    'show_login_in_hero', 'show_about', 'show_features',
    'show_gallery', 'show_contact', 'show_footer_social',
    'show_registration', 'footer_text',
}

# Campos de identidad del organizador que se exponen en la landing
ORG_PUBLIC_FIELDS = [
    'id', 'slug', 'name', 'description', 'whatsapp', 'address',
    'primary_color', 'logo_url', 'welcome_message',
]


class LandingService:

    @staticmethod
    def _org_dict(org):
        return {f: getattr(org, f, None) for f in ORG_PUBLIC_FIELDS}

    @staticmethod
    def _landing_dict(landing=None):
        return {
            'hero_title': landing.hero_title if landing else None,
            'hero_subtitle': landing.hero_subtitle if landing else None,
            'banner_url': landing.banner_url if landing else None,
            'about_title': landing.about_title if landing else 'Sobre nosotros',
            'about_text': landing.about_text if landing else None,
            'about_image_url': landing.about_image_url if landing else None,
            'features_title': landing.features_title if landing else 'Nuestros servicios',
            'features': landing.features if landing else [],
            'gallery_title': landing.gallery_title if landing else 'Galería',
            'gallery_images': landing.gallery_images if landing else [],
            'contact_email': landing.contact_email if landing else None,
            'contact_phone': landing.contact_phone if landing else None,
            'address': landing.address if landing else None,
            'social_facebook': landing.social_facebook if landing else None,
            'social_instagram': landing.social_instagram if landing else None,
            'social_whatsapp': landing.social_whatsapp if landing else None,
            'social_twitter': landing.social_twitter if landing else None,
            'social_youtube': landing.social_youtube if landing else None,
            'show_login_in_hero': landing.show_login_in_hero if landing else True,
            'show_about': landing.show_about if landing else True,
            'show_features': landing.show_features if landing else True,
            'show_gallery': landing.show_gallery if landing else True,
            'show_contact': landing.show_contact if landing else True,
            'show_footer_social': landing.show_footer_social if landing else True,
            'show_registration': landing.show_registration if landing else False,
            'footer_text': landing.footer_text if landing else None,
        }

    @staticmethod
    def get_public_by_slug(slug):
        """Datos públicos de la landing de un organizador por su slug."""
        org = Organizador.query.filter_by(slug=slug).first()
        if not org:
            return None
        landing = OrganizadorLanding.query.filter_by(organizador_id=org.id).first()
        torneos = [
            {'id': t.id, 'nombre': t.nombre, 'estado': t.estado}
            for t in Torneo.query.filter_by(organizador_id=org.id).order_by(Torneo.created_at.desc()).all()
        ]
        return {
            'organizador': LandingService._org_dict(org),
            'landing': LandingService._landing_dict(landing),
            'torneos': torneos,
        }

    @staticmethod
    def get_payload(org):
        """Payload para el editor (organizador + landing)."""
        landing = OrganizadorLanding.query.filter_by(organizador_id=org.id).first()
        return {
            'organizador': LandingService._org_dict(org),
            'landing': LandingService._landing_dict(landing),
            'torneos': LandingService.get_public_by_slug(org.slug)['torneos'],
        }

    @staticmethod
    def get_by_organizador_id(org_id):
        return OrganizadorLanding.query.filter_by(organizador_id=org_id).first()

    @staticmethod
    def create_or_update(org_id, data):
        """Crea o actualiza la landing de un organizador (merge de campos)."""
        landing = OrganizadorLanding.query.filter_by(organizador_id=org_id).first()
        if not landing:
            landing = OrganizadorLanding(organizador_id=org_id)
            db.session.add(landing)

        for field in LANDING_FIELDS:
            if field in data:
                setattr(landing, field, data[field])

        db.session.commit()
        return landing

    @staticmethod
    def delete_landing(org_id):
        """Elimina la configuración de la landing de un organizador."""
        landing = OrganizadorLanding.query.filter_by(organizador_id=org_id).first()
        if not landing:
            return False
        db.session.delete(landing)
        db.session.commit()
        return True

    @staticmethod
    def public_partidos(torneo_id):
        """Fixture de un torneo agrupado por jornada, con nombres de equipos y estado en vivo."""
        partidos = (Partido.query
                    .filter_by(torneo_id=torneo_id)
                    .order_by(Partido.jornada, Partido.id)
                    .all())

        vivos = {
            v.partido_id: v
            for v in PartidoEnVivo.query.filter(PartidoEnVivo.iniciado.is_(True)).all()
        }
        equipos = {e.id: e.nombre for e in Equipo.query.filter_by(torneo_id=torneo_id).all()}
        por_jornada = {}
        for p in partidos:
            vivo = vivos.get(p.id)
            por_jornada.setdefault(p.jornada or 0, []).append({
                'id': p.id,
                'equipo_local': equipos.get(p.equipo_local_id, 'Equipo local'),
                'equipo_visitante': equipos.get(p.equipo_visitante_id, 'Equipo visitante'),
                'goles_local': p.goles_local,
                'goles_visitante': p.goles_visitante,
                'resultado': p.resultado,
                'fecha_programada': p.fecha_programada.isoformat() if p.fecha_programada else None,
                'en_vivo': {
                    'seg': vivo.seg_actual(),
                    'running': vivo.running,
                    'iniciado': True,
                } if vivo else None,
            })
        return [{'jornada': j, 'partidos': por_jornada[j]} for j in sorted(por_jornada)]

    @staticmethod
    def en_vivo_partido(partido_id):
        """Estado en vivo público de un partido (default apagado)."""
        vivo = PartidoEnVivo.query.get(partido_id)
        if not vivo:
            return {'partido_id': partido_id, 'seg': 0, 'running': False, 'iniciado': False}
        return {'partido_id': vivo.partido_id, 'seg': vivo.seg_actual(), 'running': vivo.running, 'iniciado': vivo.iniciado}

    @staticmethod
    def alineaciones_partido(partido_id):
        """Alineaciones (formación + suplentes) y cambios de un partido, público y legible."""
        from app.models.evento_partido import EventoPartido

        partido = Partido.query.get(partido_id)
        if not partido:
            return None

        items = PartidoAlineacion.query.filter_by(partido_id=partido_id).all()
        ids = [i.jugador_id for i in items]

        cambio_evs = (EventoPartido.query
                      .filter_by(partido_id=partido_id, tipo='CAMBIO')
                      .order_by(EventoPartido.minuto).all())
        for ev in cambio_evs:
            if ev.jugador_id:
                ids.append(ev.jugador_id)
            if ev.jugador_sale_id:
                ids.append(ev.jugador_sale_id)

        jugadores = {j.id: j for j in Jugador.query.filter(Jugador.id.in_(ids)).all()}
        equipos = {
            e.id: e.nombre for e in Equipo.query.filter(
                Equipo.id.in_([partido.equipo_local_id, partido.equipo_visitante_id])
            ).all()
        }

        filas = {}
        for i in items:
            j = jugadores.get(i.jugador_id)
            if not j:
                continue
            filas.setdefault(i.equipo_id, []).append({
                'jugador_id': i.jugador_id,
                'nombre': j.nombre,
                'numero': i.numero_camiseta if i.numero_camiseta is not None else j.numero_camiseta,
                'titular': bool(i.titular),
                'posicion': i.posicion_tactica or 'OTROS',
                'orden': i.posicion_orden or 0,
            })

        def sort_key(item):
            return (
                0 if item['titular'] else 1,
                POSICION_ORDEN.get(item['posicion'], 4),
                item['orden'],
                item['numero'] or 0,
            )

        equipos_data = []
        for eid in (partido.equipo_local_id, partido.equipo_visitante_id):
            lista = sorted(filas.get(eid, []), key=sort_key)
            equipos_data.append({
                'equipo_id': eid,
                'nombre': equipos.get(eid),
                'jugadores': lista,
            })

        cambios = []
        for ev in cambio_evs:
            entra = jugadores.get(ev.jugador_id)
            sale = jugadores.get(ev.jugador_sale_id)
            cambios.append({
                'minuto': ev.minuto,
                'equipo': equipos.get(ev.equipo_id),
                'entra': entra.nombre if entra else None,
                'sale': sale.nombre if sale else None,
            })

        return {
            'partido_id': partido_id,
            'equipos': equipos_data,
            'cambios': cambios,
        }