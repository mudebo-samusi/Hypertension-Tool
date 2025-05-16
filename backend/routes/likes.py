# app/routes/likes.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.like import Like
from db import db

likes_bp = Blueprint('likes_bp', __name__, url_prefix='/api')

def _toggle_like(user_id, model, model_id):
    existing = Like.query.filter_by(user_id=user_id, **{f"{model}_id": model_id}).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return False
    else:
        new_like = Like(user_id=user_id, **{f"{model}_id": model_id})
        db.session.add(new_like)
        db.session.commit()
        return True

def _count_likes(model, model_id):
    return Like.query.filter_by(**{f"{model}_id": model_id}).count()

@likes_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def toggle_post_like(post_id):
    user_id = get_jwt_identity()
    liked = _toggle_like(user_id, 'post', post_id)
    count = _count_likes('post', post_id)
    return jsonify({'liked': liked, 'count': count}), 200

@likes_bp.route('/comments/<int:comment_id>/like', methods=['POST'])
@jwt_required()
def toggle_comment_like(comment_id):
    user_id = get_jwt_identity()
    liked = _toggle_like(user_id, 'comment', comment_id)
    count = _count_likes('comment', comment_id)
    return jsonify({'liked': liked, 'count': count}), 200
