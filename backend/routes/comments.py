# app/routes/comments.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.comment import Comment
from db import db

comments_bp = Blueprint('comments_bp', __name__, url_prefix='/api')

@comments_bp.route('/<string:post_type>s/<int:post_id>/comments', methods=['GET'])
def get_comments(post_type, post_id):
    # Validate post_type
    if post_type not in ('post', 'ad'):
        return jsonify({'error': 'Invalid type'}), 400

    comments = Comment.query.filter_by(post_type=post_type, post_id=post_id) \
                             .order_by(Comment.created_at.desc()).all()
    return jsonify([c.to_dict() for c in comments]), 200

@comments_bp.route('/<string:post_type>s/<int:post_id>/comments', methods=['POST'])
@jwt_required()
def create_comment(post_type, post_id):
    if post_type not in ('post', 'ad'):
        return jsonify({'error': 'Invalid type'}), 400

    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Content cannot be empty'}), 400

    comment = Comment(
        author_id  = get_jwt_identity(),
        post_type  = post_type,
        post_id    = post_id,
        content    = content
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201
