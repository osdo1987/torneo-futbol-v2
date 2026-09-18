from flask_jwt_extended import create_access_token
from app.extensions import db
from app.models.user import User
from app.models.organizador import Organizador
from app.models.equipo import Equipo
from datetime import timedelta, datetime

# Roles que puede asignar un gestor (SUPERADMIN / ORGANIZADOR / ADMIN) al crear o
# cambiar el rol de un usuario. SUPERADMIN nunca se asigna por esta vía.
ASSIGNABLE_ROLES = ('ORGANIZADOR', 'ADMIN', 'STAFF', 'REFEREE', 'DELEGADO')

# Roles que puede gestionar un ADMIN (por debajo de ORGANIZADOR).
ADMIN_MANAGEABLE_ROLES = ('STAFF', 'REFEREE', 'DELEGADO')


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
                'equipoId': user.equipo_id,
                'equipoName': user.equipo.nombre if user.equipo else None,
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

    # ------------------------------------------------------------------
    # Gestión de usuarios y roles (SUPERADMIN / ORGANIZADOR)
    # ------------------------------------------------------------------
    @staticmethod
    def _can_manage(actor, target):
        """¿Puede el actor operar sobre target (cambiar rol, clave, eliminar)?
        SUPERADMIN gestiona todo; ORGANIZADOR su tenant (salvo SUPERADMIN);
        ADMIN solo STAFF/REFEREE/DELEGADO de su tenant."""
        if actor.role == 'SUPERADMIN':
            return True
        if actor.role == 'ORGANIZADOR':
            return target.role != 'SUPERADMIN' and target.organizador_id == actor.organizador_id
        if actor.role == 'ADMIN':
            return (target.role in ADMIN_MANAGEABLE_ROLES
                    and target.organizador_id == actor.organizador_id)
        return False

    @staticmethod
    def _assignable_for(actor):
        """Roles que el actor puede crear/asignar (de mayor a menor jerarquía)."""
        if actor.role == 'SUPERADMIN' or actor.role == 'ORGANIZADOR':
            return ASSIGNABLE_ROLES
        if actor.role == 'ADMIN':
            return ADMIN_MANAGEABLE_ROLES
        return ()

    @staticmethod
    def _user_dict(u):
        return {
            'id': u.id,
            'email': u.email,
            'role': u.role,
            'organizador_id': u.organizador_id,
            'organizador_name': u.organizador.name if u.organizador else None,
            'equipo_id': u.equipo_id,
            'equipo_name': u.equipo.nombre if u.equipo else None,
            'created_at': u.created_at,
            'updated_at': u.updated_at,
            'last_login': u.last_login,
        }

    @staticmethod
    def list_users(actor):
        """Lista los usuarios. SUPERADMIN ve todos; los del tenant solo los suyos."""
        if actor.role == 'SUPERADMIN':
            users = User.query.order_by(User.email).all()
        else:
            users = User.query.filter_by(organizador_id=actor.organizador_id).order_by(User.email).all()
        return [AuthService._user_dict(u) for u in users]

    @staticmethod
    def _validate_equipo(equipo_id, organizador_id):
        """Valida que el equipo exista dentro del tenant. Devuelve (ok, error)."""
        if not equipo_id:
            return False, 'equipo_id es requerido para el rol DELEGADO'
        equipo = Equipo.query.get(equipo_id)
        if not equipo or equipo.torneo.organizador_id != organizador_id:
            return False, 'El equipo no pertenece al organizador'
        return True, None

    @staticmethod
    def create_user(actor, data):
        """Crea un usuario dentro del tenant (según el alcance del rol del actor)."""
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        role = (data.get('role') or 'STAFF').upper()
        organizador_id = data.get('organizador_id')
        equipo_id = data.get('equipo_id')

        if not email or not password:
            return {'error': 'email y password son requeridos'}, 400
        if len(password) < 6:
            return {'error': 'La contraseña debe tener al menos 6 caracteres'}, 400

        assignable = AuthService._assignable_for(actor)
        if role not in assignable:
            return {'error': f'Rol no permitido para tu perfil. Válidos: {", ".join(assignable)}'}, 400
        if User.query.filter_by(email=email).first():
            return {'error': 'El correo ya está en uso'}, 400

        if actor.role == 'SUPERADMIN':
            if not organizador_id or not Organizador.query.get(organizador_id):
                return {'error': 'organizador_id es requerido'}, 400
        else:
            organizador_id = actor.organizador_id

        if role == 'DELEGADO':
            ok, err = AuthService._validate_equipo(equipo_id, organizador_id)
            if not ok:
                return {'error': err}, 400

        user = User(
            email=email,
            password_hash='',
            role=role,
            organizador_id=organizador_id,
            equipo_id=equipo_id if role == 'DELEGADO' else None,
        )
        user.set_password(password)
        db.session.add(user)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 400
        return {'success': True, 'user': AuthService._user_dict(user)}, 201

    @staticmethod
    def update_role(actor, user_id, role, equipo_id=None):
        role = (role or '').upper()
        assignable = AuthService._assignable_for(actor)
        if role not in assignable:
            return {'error': f'Rol no permitido para tu perfil. Válidos: {", ".join(assignable)}'}, 400
        user = User.query.get(user_id)
        if not user:
            return {'error': 'Usuario no encontrado'}, 404
        if not AuthService._can_manage(actor, user):
            return {'error': 'No autorizado'}, 403
        if user.id == actor.id:
            return {'error': 'No puedes cambiar tu propio rol'}, 400
        if role == 'DELEGADO':
            ok, err = AuthService._validate_equipo(equipo_id, user.organizador_id)
            if not ok:
                return {'error': err}, 400
            user.equipo_id = equipo_id
        elif user.role == 'DELEGADO':
            user.equipo_id = None
        user.role = role
        db.session.commit()
        return {'success': True, 'user': AuthService._user_dict(user)}, 200

    @staticmethod
    def reset_password(actor, user_id, password):
        user = User.query.get(user_id)
        if not user:
            return {'error': 'Usuario no encontrado'}, 404
        if not AuthService._can_manage(actor, user):
            return {'error': 'No autorizado'}, 403
        if not password or len(password) < 6:
            return {'error': 'La contraseña debe tener al menos 6 caracteres'}, 400
        user.set_password(password)
        db.session.commit()
        return {'success': True}, 200

    @staticmethod
    def delete_user(actor, user_id):
        user = User.query.get(user_id)
        if not user:
            return {'error': 'Usuario no encontrado'}, 404
        if not AuthService._can_manage(actor, user):
            return {'error': 'No autorizado'}, 403
        if user.id == actor.id:
            return {'error': 'No puedes eliminar tu propia cuenta'}, 400
        if user.role == 'ORGANIZADOR' and user.organizador_id:
            restantes = User.query.filter_by(
                organizador_id=user.organizador_id, role='ORGANIZADOR'
            ).count()
            if restantes <= 1:
                return {'error': 'No puedes eliminar el último usuario ORGANIZADOR de este tenant'}, 400
        db.session.delete(user)
        db.session.commit()
        return {'success': True}, 200