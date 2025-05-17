# app/routes/likes.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.like import Like
from db import db
from sqlalchemy.exc import IntegrityError

likes_bp = Blueprint('likes_bp', __name__, url_prefix='/api')

def _toggle_like(user_id, model, model_id):
    try:
        # Check for existing like
        filter_kwargs = {
            'user_id': user_id,
            f'{model}_id': model_id
        }
        existing = Like.query.filter_by(**filter_kwargs).first()
        
        if existing:
            db.session.delete(existing)
            db.session.commit()
            # Get updated count
            count = Like.query.filter_by(**{f'{model}_id': model_id}).count()
            return {'liked': False, 'count': count}
        else:
            new_like = Like(user_id=user_id, **{f'{model}_id': model_id})
            db.session.add(new_like)
            db.session.commit()
            # Get updated count
            count = Like.query.filter_by(**{f'{model}_id': model_id}).count()
            return {'liked': True, 'count': count}
            
    except IntegrityError:
        db.session.rollback()
        # Return current state without changes
        count = Like.query.filter_by(**{f'{model}_id': model_id}).count()
        is_liked = bool(Like.query.filter_by(**filter_kwargs).first())
        return {'liked': is_liked, 'count': count}

@likes_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def toggle_post_like(post_id):
    user_id = get_jwt_identity()
    result = _toggle_like(user_id, 'post', post_id)
    return jsonify(result), 200

@likes_bp.route('/comments/<int:comment_id>/like', methods=['POST'])
@jwt_required()
def toggle_comment_like(comment_id):
    user_id = get_jwt_identity()
    result = _toggle_like(user_id, 'comment', comment_id)
    return jsonify(result), 200
