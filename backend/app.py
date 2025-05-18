from flask import Flask, request, jsonify, render_template_string, session
from flask_cors import CORS
import datetime
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from flask_migrate import Migrate  # Add this import
import joblib
import numpy as np
import pandas as pd
import logging
from pipeline import HypertensionPipeline
import secrets
import os
import threading
import json
from flask_socketio import SocketIO, Namespace
# Import the MQTT client module
import mqtt_client
import uuid  # Add import for UUID

# Import db from the new file
from db import db, init_db
from models.user import User
from models.bp_reading import BPReading
from models.review import Review
from werkzeug.security import generate_password_hash, check_password_hash
from models.subscription import Subscription
from models.payments import Payment
# Import SubscriptionService after all models are defined
from services.SubService import SubscriptionService

# Add rate limiting to protect against abuse
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Import blueprints for posts and ads
from routes.posts import posts_bp
from routes.ads import ads_bp
from routes.comments import comments_bp
from routes.likes import likes_bp
from routes.profile import profile_bp
from routes.chat import chat_bp, register_socketio_handlers

# Initialize Flask app
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config["SECRET_KEY"] = app.secret_key  # <-- Ensure SECRET_KEY is set
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hypertension.db"
app.config["JWT_SECRET_KEY"] = "4e8b352387ca940a69deafb95a8b62661366473606e4ae6e67ac5f4bde944b99"
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = "your-email@gmail.com"
app.config["MAIL_PASSWORD"] = "your-email-password"
app.config["MAIL_DEFAULT_SENDER"] = "your-email@gmail.com"

# Update SocketIO to allow CORS properly and set up namespaces
socketio = SocketIO(app, 
                   cors_allowed_origins=["http://localhost:5173", "http://192.168.171.235:5173"], 
                   async_mode='threading', 
                   manage_session=True,
                   logger=True, 
                   engineio_logger=True)

# Create namespaces for different services
class MonitorNamespace(Namespace):
    def on_connect(self):
        # Get token from query parameter or headers
        token = None
        if request.args and 'token' in request.args:
            token = request.args.get('token')
        elif request.headers.get('Authorization'):
            auth_header = request.headers.get('Authorization')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                
        if not token:
            logging.warning(f"Socket connection attempt without token")
            # Don't return False here as it blocks the connection entirely
            # Instead, we'll allow the connection but restrict access later
        
        try:
            # Use proper Flask-JWT-Extended methods
            from flask_jwt_extended import decode_token
            
            # Verify token
            decoded = decode_token(token)
            session['user_id'] = decoded['sub']
            logging.info(f"BP Monitor client connected: {request.sid}")
            return True
        except Exception as e:
            logging.error(f"Invalid token: {str(e)}")
            # Still allow connection for debugging, but track it as unauthorized
            session['unauthorized'] = True
            return True  # Allow connection but mark as unauthorized

monitor_namespace = MonitorNamespace('/monitor')
socketio.on_namespace(monitor_namespace)

# Improve CORS configuration
CORS(app, 
     origins=["http://localhost:5173", "http://192.168.171.235:5173"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     expose_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Add debug logging
logging.basicConfig(level=logging.DEBUG)

# Initialize limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "100 per hour"]
)

# Initialize extensions
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
jwt = JWTManager(app)
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])

# Initialize database using the new function
with app.app_context():
    init_db(app)
    migrate = Migrate(app, db)  # Add this line to initialize Flask-Migrate

# Register blueprints
app.register_blueprint(posts_bp)
app.register_blueprint(ads_bp)
app.register_blueprint(comments_bp)
app.register_blueprint(likes_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(chat_bp)
register_socketio_handlers(socketio, '/chat')  # Add namespace parameter here

# Add JWT error handler
@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    logging.error(f"Invalid token: {error_string}")
    return jsonify({
        'msg': 'Invalid token',
        'error': error_string
    }), 422

@jwt.unauthorized_loader
def unauthorized_callback(error_string):
    logging.error(f"Missing Authorization header: {error_string}")
    return jsonify({
        'msg': 'Missing Authorization header',
        'error': error_string
    }), 401

@app.before_request
def handle_options_request():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight request successful'})
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 200

# Add a health check endpoint for CORS and connectivity testing
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "Thanks for checking my health status, ok"}), 200

# Ensure CORS headers are set for all responses, including errors
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = [
        "http://localhost:5173",
        "http://192.168.171.235:5173"
    ]
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = allowed_origins[0]
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Handler for health data received from MQTT
def handle_mqtt_health_data(data):
    try:
        logging.info(f"Received health data from MQTT: {data}")
        
        # Extract BP data (explicitly ignoring 'map' and 'timestamp' as requested)
        systolic = data.get("systolic")
        diastolic = data.get("diastolic")
        heart_rate = data.get("heart_rate")
        user_id = data.get("user_id")  # Optional: if user ID is provided in MQTT message
        
        if not all([systolic, diastolic, heart_rate]):
            logging.error("Missing required BP data fields")
            return
            
        # Send to ALL clients in the monitor namespace, not filtered by session
        try:
            bp_data = {
                'systolic': systolic, 
                'diastolic': diastolic, 
                'heart_rate': heart_rate
            }
            logging.info(f"Emitting BP reading to all monitor clients: {bp_data}")
            socketio.emit('new_bp_reading', bp_data, namespace='/monitor')
        except Exception as e:
            logging.error(f"Error emitting BP data via socketio: {str(e)}")
        
        # Save to database - wrap in app context to avoid the application context error
        try:
            with app.app_context():
                save_reading_to_db(systolic, diastolic, heart_rate, user_id)
                if user_id:
                    logging.info(f"Saved BP reading for user {user_id}")
                else:
                    logging.info(f"Saved anonymous BP reading")
        except Exception as e:
            logging.error(f"Error saving reading to database: {e}")
        
        # Process prediction
        try:
            prediction_result = process_bp_prediction(systolic, diastolic, heart_rate)
            logging.info(f"Generated prediction result: {prediction_result}")
            
            # Send prediction results to ALL monitor clients
            try:
                socketio.emit('prediction_result', prediction_result, namespace='/monitor')
                logging.info("Prediction result sent to frontend via Socket.IO")
            except Exception as e:
                logging.error(f"Error emitting prediction via socketio: {str(e)}")
            
            # Send prediction results to MQTT notification topic
            mqtt_client.send_prediction_result(prediction_result)
            logging.info("Prediction result sent to MQTT notification topic")
            
        except Exception as e:
            logging.error(f"Error processing prediction: {e}")
            
    except Exception as e:
        logging.error(f"Error handling MQTT health data: {e}")

# Helper function to save BP reading to database
def save_reading_to_db(systolic, diastolic, heart_rate, user_id=None):
    # Generate a random numeric ID from UUID if user_id is not provided
    if user_id is None:
        # Generate random UUID and convert to integer by removing dashes and using only a portion
        random_uuid = uuid.uuid4()
        # Use the integer hash of the UUID as a substitute for user_id
        user_id = abs(hash(str(random_uuid))) % (10 ** 10)  # Keep it to 10 digits
        logging.info(f"Generated random user_id: {user_id} for anonymous reading")
    
    new_reading = BPReading(
        systolic=systolic,
        diastolic=diastolic,
        heart_rate=heart_rate,
        user_id=user_id,
    )
    db.session.add(new_reading)
    db.session.commit()

# Helper function to process BP prediction
def process_bp_prediction(systolic, diastolic, heart_rate):
    # Prepare input for the pipeline
    input_data = {
        "Systolic_BP": systolic,
        "Diastolic_BP": diastolic,
        "Heart_Rate": heart_rate
    }
    
    # Use the pipeline for prediction
    pipeline = HypertensionPipeline()
    results = pipeline.predict(input_data)
    
    # Check for errors
    if "error" in results:
        return {"error": results["error"]}
    
    # Extract final prediction and additional info
    final_prediction = results.get("final_prediction", {})
    additional_info = results.get("additional_info", {})
    
    # Return the formatted results
    return {
        "prediction": final_prediction.get("prediction_text", "Unknown"),
        "probability": final_prediction.get("probability", None),
        "risk_level": additional_info.get("risk_level", "Unknown"),
        "recommendation": additional_info.get("recommendation", "No recommendation available"),
        "confidence": additional_info.get("confidence", "Unknown"),
        "bp_category": additional_info.get("bp_category", "Unknown")
    }

# Add endpoint to get user profile
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    # Convert string ID back to integer
    user_id = int(get_jwt_identity())
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    # Return user profile data
    profile_data = {
        "name": user.username,
        "email": user.email,
        "role": user.role,
        # Add other fields you want to include
        # These can be expanded as your User model grows
    
    }
    
    return jsonify(profile_data), 200

# Add missing payment profile endpoint
@app.route("/profile/payment-info", methods=["GET"])
@jwt_required()
def get_payment_profile():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Check if user has any payments at all
        # Expanded to search any relationship to the user (not just direct ids)
        has_payments = db.session.query(Payment).filter(
            db.or_(
                Payment.user_id == user_id,
                Payment.patient_id == user_id,
                Payment.provider_id == user_id,
                Payment.patient_name == user.username,
                Payment.provider_name == user.username
            )
        ).limit(1).count() > 0
        
        # Get payment statistics
        total_payments = 0
        completed_payments = 0
        pending_payments = 0
        subscription_payments = 0
        
        if has_payments:
            # Only count if payments exist for this user
            payment_query = Payment.query.filter(
                db.or_(
                    Payment.user_id == user_id,
                    Payment.patient_id == user_id,
                    Payment.provider_id == user_id,
                    Payment.patient_name == user.username, 
                    Payment.provider_name == user.username
                )
            )
            
            total_payments = payment_query.count()
            completed_payments = payment_query.filter_by(status="completed").count()
            pending_payments = payment_query.filter_by(status="pending").count()
            subscription_payments = payment_query.filter_by(is_subscription_payment=True).count()

        # Get user's active subscription
        active_subscription = None
        subscription = Subscription.query.filter_by(user_id=user_id, status="active").first()
        if subscription:
            active_subscription = subscription.to_dict()
            
        return jsonify({
            "has_payments": has_payments,
            "payment_stats": {
                "total_payments": total_payments,
                "completed_payments": completed_payments,
                "pending_payments": pending_payments,
                "subscription_payments": subscription_payments
            },
            "active_subscription": active_subscription,
            "username": user.username
        }), 200
    except Exception as e:
        logging.error(f"Error fetching payment profile: {e}")
        return jsonify({"error": f"Failed to fetch payment profile: {str(e)}"}), 500

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Register endpoint
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        additional_info = data.get('additionalInfo', {})

        # Basic validation
        if not username or not email or not password or not role:
            return jsonify(success=False, message="Missing required fields"), 400

        # Check if user/email already exists
        if User.query.filter_by(username=username).first():
            return jsonify(success=False, message="Username already exists"), 400
        if User.query.filter_by(email=email).first():
            return jsonify(success=False, message="Email already exists"), 400

        # Create user with basic fields
        hashed_password = generate_password_hash(password)
        user = User(
            username=username,
            email=email,
            password=hashed_password,
            role=role
        )
        
        # Add role-specific data to user object
        if role == "Care Taker":
            if not additional_info.get('patientId'):
                return jsonify(success=False, message="Patient ID required for Care Taker"), 400
            user.patient_id = additional_info.get('patientId')

        if role == "Doctor":
            if not additional_info.get('type'):
                return jsonify(success=False, message="Doctor type required"), 400
            user.doctor_type = additional_info.get('type')
            if additional_info.get('type') == "Organizational" and not additional_info.get('hospitalName'):
                return jsonify(success=False, message="Hospital/Clinic Name required for Organizational Doctor"), 400
            user.hospital_name = additional_info.get('hospitalName')

        if role == "Patient":
            if not additional_info.get('caretakerId'):
                return jsonify(success=False, message="Caretaker ID required for Patient"), 400
            user.caretaker_id = additional_info.get('caretakerId')

        if role == "Organization":
            if not additional_info.get('organizationType'):
                return jsonify(success=False, message="Organization Type required"), 400
            user.organization_type = additional_info.get('organizationType')

        db.session.add(user)
        db.session.commit()

        # Generate a temporary token valid for 1 hour
        temp_token = create_access_token(identity=str(user.id), expires_delta=datetime.timedelta(hours=1))

        return jsonify(success=True, message="Registration successful", temp_token=temp_token), 201
    except Exception as e:
        import traceback
        logging.error(f"Registration error: {e}\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify(success=False, message=f"Registration failed: {str(e)}"), 500

# Configure Flask-Login
login_manager.login_view = "login"
login_manager.login_message = "Please log in to access this page."
login_manager.login_message_category = "info"
login_manager.refresh_view = "login"
login_manager.needs_refresh_message = "Session timed out, please re-login."
login_manager.needs_refresh_message_category = "warning"

# Enable "remember me" functionality
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided."}), 400

        username = data.get("username")
        password = data.get("password")
        remember = data.get("remember", True)

        # Logging for debugging
        logging.debug(f"Login attempt for user: {username}")

        # First, try to get the user without the is_active field
        user = User.query.filter_by(username=username).first()
        
        if not user:
            logging.warning(f"Login failed - User not found: {username}")
            return jsonify({"error": "User not found."}), 404

        # Verify password using Werkzeug
        if not check_password_hash(user.password, password):
            logging.warning(f"Login failed - Invalid password for user: {username}")
            return jsonify({"error": "Invalid username or password."}), 401
            
        # Check if user is active - safely access the attribute
        if hasattr(user, 'is_active') and not user.is_active:
            logging.warning(f"Login failed - Inactive account for user: {username}")
            return jsonify({"error": "Your account is not active. Please contact support."}), 403

        # Log in via Flask-Login
        login_user(user, remember=remember)

        # Generate JWT tokens
        expires_delta = datetime.timedelta(days=30) if remember else datetime.timedelta(hours=1)
        access_token = create_access_token(identity=str(user.id), expires_delta=expires_delta)
        refresh_token = create_refresh_token(identity=str(user.id))

        logging.info(f"User {username} logged in successfully")
        
        # Create user data dictionary with basic fields
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
        
        # Only add is_active if it exists
        if hasattr(user, 'is_active'):
            user_data["is_active"] = user.is_active
        else:
            user_data["is_active"] = True  # Default to active if field doesn't exist
            
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_data
        }), 200
    except Exception as e:
        logging.error(f"Error during login: {str(e)}")
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

# Add token verification endpoint
@app.route("/verify-token", methods=["GET"])
@jwt_required()
def verify_token():
    # Convert string ID back to integer
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    
    if not user:
        return jsonify({"valid": False}), 401
    
    return jsonify({
        "valid": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }), 200

# Rename /protected to use as token verification endpoint
@app.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    # Convert string ID back to integer
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({"message": f"Hello, {user.username}! You are logged in.", "valid": True}), 200

# Logout endpoint
@app.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # Note: In a production environment, you would add the current token 
    # to a blacklist here. Since JWT tokens are stateless, they remain valid 
    # until they expire unless blacklisted server-side.
            
    # Client-side, the token should be removed from storage (localStorage/cookies)
    return jsonify({"message": "Successfully logged out."}), 200       

# Request password reset endpoint
@app.route("/request-password-reset", methods=["POST"])
def request_password_reset():
    email = request.json.get("email")
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "No user found with that email address."}), 404

    # Generate a reset token
    token = serializer.dumps(email, salt="password-reset")

    # Render the HTML template
    reset_url = f"http://localhost:3000/reset-password?token={token}"
    html_content = render_template_string(open("reset_email.html").read(), reset_url=reset_url)

    # Send the reset email
    msg = Message(
        "Password Reset Request",
        recipients=[email],
        html=html_content,
    )
    mail.send(msg)

    return jsonify({"message": "Password reset link sent to your email."}), 200

# Reset password endpoint
@app.route("/reset-password", methods=["POST"])
def reset_password():
    token = request.json.get("token")
    new_password = request.json.get("new_password")

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required."}), 400

    try:
        email = serializer.loads(token, salt="password-reset", max_age=3600)  # Token valid for 1 hour
    except:
        return jsonify({"error": "Invalid or expired token."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "No user found with that email address."}), 404

    # Update the password
    hashed_password = bcrypt.generate_password_hash(new_password).decode("utf-8")
    user.password = hashed_password
    db.session.commit()

    return jsonify({"message": "Password reset successfully."}), 200

# Modify Save BP reading endpoint to also send via MQTT
@app.route("/save-reading", methods=["POST"])
@jwt_required()
def save_reading():
    # Convert string ID back to integer
    user_id = int(get_jwt_identity())
    data = request.json
    systolic = data.get("systolic")
    diastolic = data.get("diastolic")
    heart_rate = data.get("heart_rate")

    if not all([systolic, diastolic, heart_rate]):
        return jsonify({"error": "Missing data. Please provide systolic, diastolic, and heart rate."}), 400

    # Save the reading with updated function signature
    save_reading_to_db(systolic, diastolic, heart_rate, user_id)

    # Notify via MQTT
    try:
        mqtt_data = {
            "systolic": systolic,
            "diastolic": diastolic,
            "heart_rate": heart_rate,
            "user_id": user_id,
            "source": "web_api"
        }
        mqtt_client.send_notification(mqtt_data)
    except Exception as e:
        logging.error(f"Error sending MQTT notification: {e}")

    return jsonify({"message": "Reading saved successfully."}), 201

# Define a function to provide treatment recommendations
def get_treatment_recommendation(category):
    recommendations = {
        "Normal": "Maintain a healthy lifestyle with regular exercise and a balanced diet.",
        "Elevated": "Monitor your blood pressure regularly. Consider reducing salt intake and increasing physical activity.",
        "Hypertension Stage 1": "Consult a doctor. You may need lifestyle changes and possibly medication.",
        "Hypertension Stage 2": "Seek immediate medical attention. Medication and lifestyle changes are essential.",
    }
    return recommendations.get(category, "No recommendation available.")

# Get historical readings endpoint
@app.route("/get-readings", methods=["GET"])
def get_readings():
    try:
        logging.debug("Entered get-readings endpoint")
        
        # Fetch all readings without filtering by user_id
        readings = BPReading.query.order_by(BPReading.timestamp.desc()).all()
        
        readings_data = []
        for reading in readings:
            readings_data.append({
                "systolic": float(reading.systolic),
                "diastolic": float(reading.diastolic),
                "heart_rate": float(reading.heart_rate),
                "timestamp": reading.timestamp.isoformat() if reading.timestamp else None,
                "user_id": reading.user_id  # Include user_id in the response
            })

        return jsonify(readings_data), 200

    except Exception as e:
        logging.error(f"Error in get-readings: {str(e)}")
        return jsonify({"msg": "An error occurred while fetching readings", "error": str(e)}), 500

# Modify Prediction endpoint to also send results via MQTT
@app.route("/predict", methods=["POST"])
def predict():
    try:
        # Get data from the request
        data = request.json
        systolic = data.get("systolic")
        diastolic = data.get("diastolic")
        heart_rate = data.get("heart_rate")

        # Validate input
        if not all([systolic, diastolic, heart_rate]):
            return jsonify({"error": "Missing data. Please provide systolic, diastolic, and heart rate."}), 400

        # Process prediction
        prediction_result = process_bp_prediction(systolic, diastolic, heart_rate)
        
        # Send prediction to MQTT notification topic
        try:
            mqtt_client.send_prediction_result(prediction_result)
        except Exception as e:
            logging.error(f"Error sending prediction to MQTT: {e}")
            
        # Return the result
        return jsonify(prediction_result)
        
    except Exception as e:
        logging.error(f"Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500

# Add review endpoints
@app.route("/reviews", methods=["GET"])
def get_reviews():
    try:
        reviews = Review.query.order_by(Review.timestamp.desc()).all()
        return jsonify([{
            'id': review.id,
            'text': review.text,
            'timestamp': review.timestamp.isoformat(),
            'user_id': review.user_id
        } for review in reviews]), 200
    except Exception as e:
        logging.error(f"Error fetching reviews: {e}")
        return jsonify({"error": "Failed to fetch reviews"}), 500

@app.route("/reviews", methods=["POST"])
@jwt_required()
def create_review():
    try:
        data = request.json
        user_id = int(get_jwt_identity())
        
        if not data or 'text' not in data:
            return jsonify({"error": "Review text is required"}), 400
            
        review = Review(
            text=data['text'],
            user_id=user_id
        )
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'id': review.id,
            'text': review.text,
            'timestamp': review.timestamp.isoformat(),
            'user_id': review.user_id
        }), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating review: {e}")
        return jsonify({"error": "Failed to create review"}), 500

@app.route("/subscriptions/new", methods=["POST"])
@jwt_required()
@limiter.limit("10/minute")  # More restrictive rate limit for subscription creation
def create_subscription():
    try:
        data = request.json
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Check if user role is eligible for subscription
        if user.role not in ["Patient", "Doctor", "Organization"]:
            return jsonify({"error": f"Users with role '{user.role}' cannot subscribe"}), 400
        
        # Create subscription with SubscriptionService
        subscription, payment = SubscriptionService.create_subscription(
            user_id,
            data['subscription'],
            data['payment']
        )
        
        # Update payment to indicate it's a subscription payment
        payment_record = Payment.query.get(payment['id']) if payment and 'id' in payment else None
        if payment_record:
            payment_record.is_subscription_payment = True
            payment_record.patient_name = user.username
            payment_record.client_id = data['payment'].get('client_id', f"sub_{subscription['id']}_{datetime.datetime.now().timestamp()}")
            db.session.commit()
        
        return jsonify({
            'subscription': subscription,
            'payment': payment
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route("/subscriptions/active", methods=["GET"])
@jwt_required()
def get_active_subscription():
    try:
        user_id = int(get_jwt_identity())
        subscription = SubscriptionService.get_active_subscription(user_id)
        
        if subscription:
            return jsonify(subscription.to_dict()), 200
        return jsonify({'message': 'No active subscription found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route("/subscriptions/<int:subscription_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_subscription(subscription_id):
    try:
        subscription = SubscriptionService.cancel_subscription(subscription_id)
        if subscription:
            return jsonify(subscription), 200
        return jsonify({'error': 'Subscription not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Enhanced payment creation endpoint with role-based validation
@app.route("/payments", methods=["POST"])
@jwt_required()
@limiter.limit("30/minute")
def create_payment():
    try:
        data = request.json
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Validate payment method
        payment_method = data.get('payment_method')
        if not payment_method or payment_method not in Payment.SUPPORTED_METHODS:
            return jsonify({"error": f"Unsupported payment method. Supported methods: {', '.join(Payment.SUPPORTED_METHODS)}"}), 400
        
        # Get user info for enriching payment data
        patient_id = data.get('patient_id', user_id)
        
        # Handle provider_id based on role
        provider_id = data.get('provider_id')
        if user.role in ["Doctor", "Organization"] and not provider_id:
            # If user is a provider and no provider_id specified, use their own ID
            provider_id = user_id
        
        # Validate that the patient/provider exists if IDs are provided
        if patient_id and patient_id != user_id and not User.query.get(patient_id):
            return jsonify({"error": "Patient not found"}), 404
            
        if provider_id and not User.query.get(provider_id):
            return jsonify({"error": "Provider not found"}), 404
            
        # Create new payment record with only columns that exist in the database
        # Omitting patient_name and provider_name which are causing the error
        payment = Payment(
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            payment_method=payment_method,
            patient_id=patient_id,
            provider_id=provider_id,
            status="completed",
            payment_date=datetime.datetime.now(),
            user_id=user_id,
            payment_details=data.get('payment_details', {}),
            # patient_name and provider_name removed
            client_id=data.get('client_id'),
            is_subscription_payment=data.get('is_subscription_payment', False)
        )
        
        db.session.add(payment)
        db.session.commit()
        
        # For the response, manually add the names that aren't stored in DB
        response_data = payment.to_dict()
        # Add names for display purposes (not stored in DB)
        response_data['patient_name'] = user.username if patient_id == user_id else None
        response_data['provider_name'] = data.get('provider_name')
        
        return jsonify(response_data), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating payment: {e}")
        return jsonify({"error": f"Failed to create payment: {str(e)}"}), 500

# Updated endpoint to get payments with role-based filtering and session management
@app.route("/payments", methods=["GET"])
@jwt_required()
@limiter.limit("300/minute")  # Increased limit from previous fix
def get_payments():
    try:
        # Check session first to avoid redundant queries
        user_id = int(get_jwt_identity())
        
        # Use request session to cache results
        session_key = f'payments_for_user_{user_id}'
        if session_key in request.environ.get('werkzeug.request.session', {}):
            # Use cached response if available within the same session
            return request.environ['werkzeug.request.session'][session_key]
        
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # First check quickly if user has any payments to avoid unnecessary processing
        has_payments = db.session.query(Payment).filter(
            db.or_(
                Payment.user_id == user_id,
                Payment.patient_id == user_id,
                Payment.provider_id == user_id,
                Payment.patient_name == user.username,
                Payment.provider_name == user.username
            )
        ).limit(1).count() > 0
        
        if not has_payments:
            # Return early with a flag indicating no payments exist
            empty_response = jsonify({
                "payments": [],
                "has_payments": False,
                "message": "No payment records found for this user."
            })
            
            # Cache empty response in session
            if 'werkzeug.request.session' not in request.environ:
                request.environ['werkzeug.request.session'] = {}
            request.environ['werkzeug.request.session'][session_key] = empty_response
            
            return empty_response

        # Get include_subscriptions parameter with default to True
        include_subscriptions = request.args.get('include_subscriptions', 'true').lower() == 'true'
        
        # Base query for payments - expanded to check name fields too
        query = Payment.query.filter(
            db.or_(
                Payment.user_id == user_id,
                Payment.patient_id == user_id, 
                Payment.provider_id == user_id,
                Payment.patient_name == user.username,
                Payment.provider_name == user.username
            )
        )
                
        # Filter by subscription status if requested
        if not include_subscriptions:
            query = query.filter_by(is_subscription_payment=False)

        payments = query.all()
        
        # Convert to list of dicts with additional user information
        payment_list = []
        for payment in payments:
            payment_dict = payment.to_dict()
            
            # Add patient name if available but not already set
            if payment.patient_id and not payment_dict.get('patient_name'):
                patient = db.session.get(User, payment.patient_id)
                if patient:
                    payment_dict['patient_name'] = patient.username
            
            # Add provider name if available but not already set
            if payment.provider_id and not payment_dict.get('provider_name'):
                provider = db.session.get(User, payment.provider_id)
                if provider:
                    payment_dict['provider_name'] = provider.username
                    
            payment_list.append(payment_dict)
            
        response = jsonify({
            "payments": payment_list,
            "has_payments": True
        })
        
        # Cache response in session to minimize repeated identical queries
        if 'werkzeug.request.session' not in request.environ:
            request.environ['werkzeug.request.session'] = {}
        request.environ['werkzeug.request.session'][session_key] = response
        
        return response

    except Exception as e:
        logging.error(f"Error fetching payments: {e}")
        return jsonify({"error": f"Failed to fetch payments: {str(e)}"}), 500

# New dedicated endpoint for payment list view
@app.route("/payments/list", methods=["GET"])
@jwt_required()
@limiter.limit("300/minute")
def get_payments_list():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Get include_subscriptions parameter
        include_subscriptions = request.args.get('include_subscriptions', 'true').lower() == 'true'
        
        # Optimized query for list view (fewer joins, focus on display data)
        query = Payment.query.filter(
            db.or_(
                Payment.user_id == user_id,
                Payment.patient_id == user_id, 
                Payment.provider_id == user_id,
                Payment.patient_name == user.username,
                Payment.provider_name == user.username
            )
        )
                
        # Filter by subscription status if requested
        if not include_subscriptions:
            query = query.filter_by(is_subscription_payment=False)

        # Order by date for list view
        payments = query.order_by(Payment.payment_date.desc()).all()
        
        # Convert to list of dicts with additional user information
        payment_list = []
        for payment in payments:
            payment_dict = payment.to_dict()
            
            # Add patient name if available but not already set
            if payment.patient_id and not payment_dict.get('patient_name'):
                patient = db.session.get(User, payment.patient_id)
                if patient:
                    payment_dict['patient_name'] = patient.username
            
            # Add provider name if available but not already set
            if payment.provider_id and not payment_dict.get('provider_name'):
                provider = db.session.get(User, payment.provider_id)
                if provider:
                    payment_dict['provider_name'] = provider.username
                    
            payment_list.append(payment_dict)
            
        return jsonify(payment_list)

    except Exception as e:
        logging.error(f"Error fetching payment list: {e}")
        return jsonify({"error": f"Failed to fetch payment list: {str(e)}"}), 500

# New dedicated endpoint for payment analytics
@app.route("/payments/analytics", methods=["GET"])
@jwt_required()
@limiter.limit("120/minute")  # Less frequent analytics calls
def get_payments_analytics():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Get include_subscriptions parameter
        include_subscriptions = request.args.get('include_subscriptions', 'true').lower() == 'true'
        
        # Base query for payments
        query = Payment.query.filter(
            db.or_(
                Payment.user_id == user_id,
                Payment.patient_id == user_id, 
                Payment.provider_id == user_id,
                Payment.patient_name == user.username,
                Payment.provider_name == user.username
            )
        )
                
        # Filter by subscription status if requested
        if not include_subscriptions:
            query = query.filter_by(is_subscription_payment=False)

        payments = query.all()
        
        # Calculate analytics data
        total_revenue = sum(payment.amount for payment in payments if payment.status == "completed")
        avg_transaction = total_revenue / len(payments) if payments else 0
        
        # Payment method distribution
        method_counts = {}
        for payment in payments:
            method = payment.payment_method
            method_counts[method] = method_counts.get(method, 0) + 1
            
        payment_methods = [{"name": method, "count": count} for method, count in method_counts.items()]
        
        # Revenue by period (monthly and weekly)
        monthly_revenue = {}
        weekly_revenue = {}
        
        for payment in payments:
            if payment.payment_date and payment.status == "completed":
                # Monthly data
                month_key = payment.payment_date.strftime("%Y-%m")
                monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + payment.amount
                
                # Weekly data
                week_of_month = (payment.payment_date.day - 1) // 7 + 1
                week_key = f"Week {week_of_month}"
                weekly_revenue[week_key] = weekly_revenue.get(week_key, 0) + payment.amount
        
        # Format for charts
        monthly_data = [{"period": month, "revenue": amount} for month, amount in monthly_revenue.items()]
        weekly_data = [{"period": week, "revenue": amount} for week, amount in weekly_revenue.items()]
        
        # Sort data by period
        monthly_data.sort(key=lambda x: x["period"])
        weekly_data.sort(key=lambda x: int(x["period"].split(" ")[1]))
        
        return jsonify({
            "analytics": {
                "total_revenue": total_revenue,
                "avg_transaction_value": avg_transaction,
                "payment_method_distribution": payment_methods,
                "monthly_revenue": monthly_data,
                "weekly_revenue": weekly_data,
                "total_transactions": len(payments)
            },
            "has_payments": len(payments) > 0
        })

    except Exception as e:
        logging.error(f"Error fetching payment analytics: {e}")
        return jsonify({"error": f"Failed to fetch payment analytics: {str(e)}"}), 500

# Initialize and start MQTT client when Flask app starts
def start_mqtt():
    mqtt_client.start_mqtt_client(
        health_callback=handle_mqtt_health_data,
        prediction_callback=None  # We'll handle predictions directly
    )

# Start MQTT client in a thread when the Flask app starts
threading.Thread(target=start_mqtt, daemon=True).start()

# Run the Flask app with SocketIO
if __name__ == "__main__":
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)