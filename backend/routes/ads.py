# app/routes/ads.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.ad import Ad
from models.user import User
from db import db
import os
from werkzeug.utils import secure_filename
import uuid

ads_bp = Blueprint('ads_bp', __name__, url_prefix='/api')

# Define allowed file extensions for security
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@ads_bp.route('/ads', methods=['POST'])
@jwt_required()
def create_ad():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Handle form data with file or JSON data
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Get form data
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        link = request.form.get('link', '')
        
        # Handle image file
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                # Create a unique filename
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                
                # Create upload directory if it doesn't exist
                upload_dir = os.path.join(current_app.root_path, 'static/uploads/ad_images')
                os.makedirs(upload_dir, exist_ok=True)
                
                # Save the file
                file_path = os.path.join(upload_dir, unique_filename)
                file.save(file_path)
                
                # Set path for database
                image_path = f"/static/uploads/ad_images/{unique_filename}"
    else:
        # Handle JSON data
        data = request.get_json()
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        link = data.get('link', '')
        
        # Fix: Ensure image_path is a string or None, not a dictionary
        image_path = data.get('image')
        if image_path is None or isinstance(image_path, dict) or image_path == {}:
            image_path = None
        elif not isinstance(image_path, str):
            image_path = str(image_path) if image_path else None
    
    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400

    # Validate link_url
    link_url = link if link and isinstance(link, str) else None

    ad = Ad(
        sponsor_id = user_id,
        title      = title,
        content    = content,
        image_url  = image_path,
        link_url   = link_url
    )
    db.session.add(ad)
    db.session.commit()

    return jsonify({
        'id': ad.id,
        'sponsor': user.username,
        'sponsorProfileImage': user.profile_image,
        'title': ad.title,
        'content': ad.content,
        'image': ad.image_url,
        'link': ad.link_url or '',
        'createdAt': ad.created_at.isoformat(),
        'likes': 0,
        'comments': 0,
        'userLiked': False
    }), 201

@ads_bp.route('/ads', methods=['GET'])
@jwt_required()
def get_ads():
    user_id = int(get_jwt_identity())
    ads = Ad.query.order_by(Ad.created_at.desc()).all()
    ads_data = [{
        'id': ad.id,
        'sponsor': ad.sponsor.username,
        'sponsorProfileImage': ad.sponsor.profile_image,
        'title': ad.title,
        'content': ad.content,
        'image': ad.image_url,
        'link': ad.link_url or '',
        'createdAt': ad.created_at.isoformat(),
        'likes': ad.likes_count if hasattr(ad, 'likes_count') else 0,
        'comments': ad.comments.count(),
        'userLiked': False  # Implement like logic if needed
    } for ad in ads]

    return jsonify(ads_data), 200
