# app/routes/posts.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity  # Updated import
from models.post import Post
from models.like import Like
from db import db

posts_bp = Blueprint('posts_bp', __name__, url_prefix='/api')

@posts_bp.route('/posts', methods=['POST'])
@jwt_required()  # Changed from @login_required
def create_post():
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Content cannot be empty'}), 400

    user_id = int(get_jwt_identity())  # Use JWT to get the logged-in user's ID
    post = Post(author_id=user_id, content=content)
    db.session.add(post)
    db.session.commit()

    return jsonify({
        'id': post.id,
    }), 201

@posts_bp.route('/posts', methods=['GET'])
@jwt_required()  # Add JWT requirement to GET endpoint as well
def get_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    current_user_id = int(get_jwt_identity())
    
    posts_data = [{
        'id': post.id,
        'author': {
            'id': post.author.id,
            'name': post.author.username,
            'avatar': post.author.profile_image  # Use profile_image from user model
        },
        'content': post.content,
        'createdAt': post.created_at.isoformat(),
        'likes': Like.query.filter_by(post_id=post.id).count(),
        'comments': post.comments.count(),
        'userLiked': Like.query.filter_by(post_id=post.id, user_id=current_user_id).first() is not None
    } for post in posts]

    return jsonify(posts_data), 200

@posts_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def toggle_like(post_id):
    user_id = int(get_jwt_identity())
    post = Post.query.get_or_404(post_id)
    
    # Check if user already liked this post
    existing_like = Like.query.filter_by(post_id=post_id, user_id=user_id).first()
    
    if existing_like:
        # Unlike - remove the like
        db.session.delete(existing_like)
        liked = False
    else:
        # Like - add new like
        new_like = Like(post_id=post_id, user_id=user_id)
        db.session.add(new_like)
        liked = True
    
    # Update post like count
    post.likes_count = Like.query.filter_by(post_id=post_id).count()
    db.session.commit()
    
    return jsonify({
        'liked': liked,
        'likes_count': post.likes_count
    }), 200
