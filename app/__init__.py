from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, migrate, jwt, ma, bcrypt, swagger, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Init extensions
    cors.init_app(app)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)
    bcrypt.init_app(app)
    swagger.init_app(app)

    # Swagger UI
    app.config['SWAGGER'] = {
        'title': 'Torneo Futbol API',
        'uiversion': 3
    }

    # Register Blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.organizador_routes import organizador_bp
    from app.routes.torneo_routes import torneo_bp
    from app.routes.equipo_routes import equipo_bp
    from app.routes.jugador_routes import jugador_bp
    from app.routes.partido_routes import partido_bp
    from app.routes.fase_routes import fase_bp
    from app.routes.evento_routes import evento_bp
    from app.routes.panel_routes import panel_bp
    from app.routes.landing_routes import landing_bp
    from app.routes.inscripcion_routes import inscripcion_bp
    from app.routes.locacion_routes import locacion_bp
    from app.routes.jornada_routes import jornada_bp

    app.register_blueprint(inscripcion_bp, url_prefix='/api/inscripcion')
    app.register_blueprint(jornada_bp, url_prefix='/api/jornadas')

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(organizador_bp, url_prefix='/api/organizadores')
    app.register_blueprint(torneo_bp, url_prefix='/api/torneos')
    app.register_blueprint(equipo_bp, url_prefix='/api/equipos')
    app.register_blueprint(jugador_bp, url_prefix='/api/jugadores')
    app.register_blueprint(partido_bp, url_prefix='/api/partidos')
    app.register_blueprint(fase_bp, url_prefix='/api/fases')
    app.register_blueprint(evento_bp, url_prefix='/api/eventos')
    app.register_blueprint(panel_bp, url_prefix='/api/panel')
    app.register_blueprint(landing_bp, url_prefix='/api/landing')
    app.register_blueprint(locacion_bp, url_prefix='/api/locaciones')

    # Global Error Handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        if app.config.get('DEBUG'):
            raise e  # en desarrollo, dejar que Flask muestre el traceback
        response = {
            "error": str(e),
            "message": "An internal error occurred"
        }
        return jsonify(response), 500

    return app