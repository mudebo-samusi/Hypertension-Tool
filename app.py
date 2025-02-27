from flask import Flask, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
import joblib
import numpy as np
import pandas as pd

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = "your_secret_key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hypertension.db"
app.config["JWT_SECRET_KEY"] = "your_jwt_secret_key"
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = "your-email@gmail.com"
app.config["MAIL_PASSWORD"] = "your-email-password"
app.config["MAIL_DEFAULT_SENDER"] = "your-email@gmail.com"

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
jwt = JWTManager(app)
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Load the trained model and label encoder
model = joblib.load("hypertension_classifier_xgb.pkl")
label_encoder = joblib.load("label_encoder.pkl")

# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="patient")

# BP Reading model
class BPReading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    systolic = db.Column(db.Float, nullable=False)
    diastolic = db.Column(db.Float, nullable=False)
    heart_rate = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

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
    data = request.json
    username = data.get("username")
    role = data.get("role")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists."}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(username=username, password=hashed_password, role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully."}), 201

# Login endpoint
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()

    if user and bcrypt.check_password_hash(user.password, password):
        access_token = create_access_token(identity=user.id)
        return jsonify({"access_token": access_token}), 200
    else:
        return jsonify({"error": "Invalid username or password."}), 401

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

# Define a function to send notifications
def send_notification(email, message):
    msg = Message(
        "BP Reading Alert",
        recipients=[email],
        body=message,
    )
    mail.send(msg)

# Save BP reading endpoint
@app.route("/save-reading", methods=["POST"])
@jwt_required()
def save_reading():
    user_id = get_jwt_identity()
    data = request.json
    systolic = data.get("systolic")
    diastolic = data.get("diastolic")
    heart_rate = data.get("heart_rate")

    if not all([systolic, diastolic, heart_rate]):
        return jsonify({"error": "Missing data. Please provide systolic, diastolic, and heart rate."}), 400

    # Save the reading
    new_reading = BPReading(
        systolic=systolic,
        diastolic=diastolic,
        heart_rate=heart_rate,
        user_id=user_id,
    )
    db.session.add(new_reading)
    db.session.commit()

    # Send notification for critical BP
    if systolic >= 140 or diastolic >= 90:
        user = User.query.get(user_id)
        send_notification(user.email, "Your BP reading is critical. Please consult a doctor.")

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
@jwt_required()
def get_readings():
    user_id = get_jwt_identity()
    readings = BPReading.query.filter_by(user_id=user_id).all()

    readings_data = [
        {
            "systolic": reading.systolic,
            "diastolic": reading.diastolic,
            "heart_rate": reading.heart_rate,
            "timestamp": reading.timestamp,
        }
        for reading in readings
    ]

    return jsonify(readings_data), 200

# Prediction endpoint
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

        # Prepare input for the model
        input_data = np.array([[systolic, diastolic, heart_rate]])

        # Make prediction
        prediction = model.predict(input_data)
        category = label_encoder.inverse_transform(prediction)[0]

        # Get treatment recommendation
        recommendation = get_treatment_recommendation(category)

        # Return the result
        return jsonify({
            "category": category,
            "recommendation": recommendation
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500    
    
# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)