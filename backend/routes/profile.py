from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from db import db
import os
from werkzeug.utils import secure_filename
import uuid

profile_bp = Blueprint('profile', __name__)

# Define allowed file extensions for security
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@profile_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    # Get current user's identity
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Create profile data to return
    profile_data = {
        "id": user.id,
        "name": user.username,
        "email": user.email,
        "role": user.role,
        "profileImage": user.profile_image
    }
    
    # Add role-specific fields
    if user.role == "doctor":
        profile_data["doctorType"] = user.doctor_type
    elif user.role == "organization":
        profile_data["organizationType"] = user.organization_type
        profile_data["hospitalName"] = user.hospital_name
    elif user.role == "patient" and user.caretaker_id:
        profile_data["caretakerId"] = user.caretaker_id
    
    return jsonify(profile_data)

@profile_bp.route('/update-profile', methods=['POST'])
@jwt_required()
def update_profile():
    # Get current user's identity
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Check if the request has the file part
    if 'profileImage' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['profileImage']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        # Create a unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # Ensure the upload directory exists
        upload_dir = os.path.join(current_app.root_path, 'static/uploads/profile_images')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # Update user's profile_image in the database
        user.profile_image = f"/static/uploads/profile_images/{unique_filename}"
        db.session.commit()
        
        return jsonify({
            "message": "Profile updated successfully",
            "profileImage": user.profile_image
        })
    
    return jsonify({"error": "File type not allowed"}), 400
