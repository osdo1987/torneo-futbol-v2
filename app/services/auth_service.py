from flask_jwt_extended import create_access_token
from app.extensions import db
from app.models.user import User
from app.models.organizador import Organizador
from datetime import timedelta, datetime


class AuthService:
    @staticmethod
    def login(email, password):
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return {'error': 'Credenciales inválidas'}, 401

        user.last_login = datetime.utcnow()
        db.session.commit()

        additional_claims = {
            'role': user.role,
            'organizadorId': user.organizador_id,
        }

        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=24),
            additional_claims=additional_claims
        )

        return {
            'message': 'Login exitoso',
            'token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'organizadorId': user.organizador_id,
                'organizadorName': user.organizador.name if user.organizador else None,
            }
        }, 200

    @staticmethod
    def register_organizer(organizador_data, user_data):
        """Crea un organizador (tenant) y su usuario ORGANIZADOR. Solo SUPERADMIN."""
        if User.query.filter_by(email=user_data['email']).first():
            return {'error': 'El correo ya está en uso'}, 400
        if Organizador.query.filter_by(slug=organizador_data['slug']).first():
            return {'error': 'El slug/URL ya está en uso'}, 400

        try:
            organizador = Organizador(
                name=organizador_data['name'],
                slug=organizador_data['slug'],
                whatsapp=organizador_data.get('whatsapp'),
                address=organizador_data.get('address'),
            )
            db.session.add(organizador)
            db.session.flush()

            user = User(
                email=user_data['email'],
                password_hash='',
                role=user_data.get('role', 'ORGANIZADOR'),
                organizador_id=organizador.id,
            )
            user.set_password(user_data['password'])
            db.session.add(user)
            db.session.commit()
            return {'success': True, 'organizador': organizador.id, 'user': user.id}, 201
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500

    @staticmethod
    def register_staff(organizador_user, user_data):
        """Crea un usuario STAFF dentro del organizador del usuario autenticado."""
        existing = User.query.filter_by(email=user_data['email']).first()
        if existing:
            return {'error': 'El correo ya está en uso'}, 400

        user = User(
            email=user_data['email'],
            password_hash='',
            role='STAFF',
            organizador_id=organizador_user.organizador_id,
        )
        user.set_password(user_data['password'])
        db.session.add(user)
        db.session.commit()
        return {'success': True, 'user': user.id}, 201