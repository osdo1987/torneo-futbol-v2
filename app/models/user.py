from app.extensions import db, bcrypt
from datetime import datetime


class User(db.Model):
    """Usuario del sistema. Roles: SUPERADMIN, ORGANIZADOR, STAFF, REFEREE."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='ORGANIZADOR')
    # SUPERADMIN, ORGANIZADOR or STAFF

    # ORGANIZADOR y STAFF pertenecen a un organizador (tenant).
    organizador_id = db.Column(db.Integer, db.ForeignKey('organizadores.id'), nullable=True)

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