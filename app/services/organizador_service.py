from marshmallow import ValidationError
from app.extensions import db
from app.models.organizador import Organizador
from app.models.user import User
from app.schemas.organizador_schema import OrganizadorSchema


class OrganizadorService:
    @staticmethod
    def get_all():
        return Organizador.query.order_by(Organizador.name).all()

    @staticmethod
    def get_by_id(org_id):
        return Organizador.query.get(org_id)

    @staticmethod
    def get_by_slug(slug):
        return Organizador.query.filter_by(slug=slug).first()

    @staticmethod
    def create(data):
        if Organizador.query.filter_by(slug=data.get('slug')).first():
            return None, 'El slug/URL ya está en uso'
        try:
            org = OrganizadorSchema().load(data)
            db.session.add(org)
            db.session.commit()
            return org, None
        except ValidationError as e:
            return None, e.messages

    @staticmethod
    def update(org, data):
        try:
            for key, value in data.items():
                if key in ('id', 'created_at', 'updated_at', 'users', 'torneos'):
                    continue
                setattr(org, key, value)
            db.session.commit()
            return org, None
        except ValidationError as e:
            db.session.rollback()
            return None, e.messages
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def delete(org):
        db.session.delete(org)
        db.session.commit()
        return True

    @staticmethod
    def count_staff(org_id):
        return User.query.filter_by(organizador_id=org_id, role='STAFF').count()