from app.extensions import db, bcrypt
from datetime import datetime


class User(db.Model):
    """Usuario del sistema.
    Roles: SUPERADMIN (plataforma), y por tenant: ORGANIZADOR (dueño),
    ADMIN (co-gestor), STAFF (colaborador), REFEREE (planilla), DELEGADO (su equipo).
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='ORGANIZADOR')

    # ORGANIZADOR, ADMIN, STAFF, REFEREE y DELEGADO pertenecen a un organizador (tenant).
    organizador_id = db.Column(db.Integer, db.ForeignKey('organizadores.id'), nullable=True)

    # DELEGADO: equipo que gestiona (alineaciones). Vacío para el resto de roles.
    equipo_id = db.Column(db.Integer, db.ForeignKey('equipos.id'), nullable=True)
    equipo = db.relationship('Equipo', foreign_keys=[equipo_id])

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # Password reset fields
    reset_token = db.Column(db.String(256), nullable=True, index=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email}>'