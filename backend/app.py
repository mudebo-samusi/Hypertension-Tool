from flask import Flask, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import datetime
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
import joblib
import numpy as np
import pandas as pd
import logging
from pipeline import HypertensionPipeline
import secrets
import os
import threading
import json
from flask_socketio import SocketIO
# Import the MQTT client module
import mqtt_client
import uuid  # Add import for UUID

# Initialize Flask app
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hypertension.db"
app.config["JWT_SECRET_KEY"] = "4e8b352387ca940a69deafb95a8b62661366473606e4ae6e67ac5f4bde944b99"
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = "your-email@gmail.com"
app.config["MAIL_PASSWORD"] = "your-email-password"
app.config["MAIL_DEFAULT_SENDER"] = "your-email@gmail.com"

# Update SocketIO to allow CORS properly
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:5173", "http://172.30.64.1:5173"], async_mode='threading')

# Improve CORS configuration
CORS(app, 
     origins=["http://localhost:5173", "http://172.30.64.1:5173"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     expose_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Add debug logging
logging.basicConfig(level=logging.DEBUG)

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
jwt = JWTManager(app)
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])

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
            
        # Send to frontend via Socket.IO
        socketio.emit('new_bp_reading', {
            'systolic': systolic, 
            'diastolic': diastolic, 
            'heart_rate': heart_rate
        })
        logging.info(f"Emitted BP reading to frontend: systolic={systolic}, diastolic={diastolic}, heart_rate={heart_rate}")
        
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
            
            # Send prediction results to frontend via Socket.IO
            socketio.emit('prediction_result', prediction_result)
            logging.info("Prediction result sent to frontend via Socket.IO")
            
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
    
    user = User.query.get(user_id)
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


# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)  # Add email field
    password = db.Column(db.String(60), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="patient")
  

# BP Reading model
class BPReading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    systolic = db.Column(db.Float, nullable=False)
    diastolic = db.Column(db.Float, nullable=False)
    heart_rate = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)  # Changed to nullable=True

# Initialize database
with app.app_context():
    db.create_all()

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register endpoint
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        role = data.get("role")
        password = data.get("password")

        if not all([username, email, password, role]):
            return jsonify({"success": False, "message": "All fields are required."}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"success": False, "message": "Username already exists."}), 400
            
        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "message": "Email already exists."}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        user = User(
            username=username, 
            email=email, 
            password=hashed_password, 
            role=role,
        )
        db.session.add(user)
        db.session.commit()

        return jsonify({"success": True, "message": "User registered successfully."}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Registration error: {str(e)}")  # Improved error logging
        return jsonify({"success": False, "message": "An error occurred during registration."}), 500


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
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided."}), 400
            
        username = data.get("username")
        password = data.get("password")
        remember = data.get("remember", False)  # Get "remember me" option

        logging.debug(f"Login attempt for username: {username}")

        if not username or not password:
            return jsonify({"error": "Username and password are required."}), 400

        user = User.query.filter_by(username=username).first()

        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user, remember=remember)  # Use Flask-Login's login_user
            
            # Create token with longer expiration if remember is True
            expires_delta = None
            if remember:
                expires_delta = datetime.timedelta(days=30)  # 30 days for "remember me"
            else:
                expires_delta = datetime.timedelta(hours=1)  # 1 hour for regular session
                
            # Convert user.id to string to fix the "Subject must be a string" error
            access_token = create_access_token(
                identity=str(user.id),
                expires_delta=expires_delta
            )
            
            return jsonify({
                "access_token": access_token,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            }), 200
        else:
            return jsonify({"error": "Invalid username or password."}), 401
    except Exception as e:
        logging.error(f"Error in login: {e}")
        return jsonify({"error": "An error occurred during login."}), 500

# Add token verification endpoint
@app.route("/verify-token", methods=["GET"])
@jwt_required()
def verify_token():
    # Convert string ID back to integer
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
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
    user = User.query.get(current_user_id)
    
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