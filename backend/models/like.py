# app/models/like.py
from datetime import datetime
from db import db

class Like(db.Model):
    __tablename__ = 'likes'
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    post_id      = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=True, index=True)
    comment_id   = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True, index=True)
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user         = db.relationship('User', back_populates='likes')
    post         = db.relationship('Post', back_populates='likes')
    comment      = db.relationship('Comment', back_populates='likes')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='uq_user_post_like'),
        db.UniqueConstraint('user_id', 'comment_id', name='uq_user_comment_like'),
    )
