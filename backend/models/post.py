# app/models/post.py
from datetime import datetime
from db import db
from sqlalchemy.sql import expression
from sqlalchemy.orm import foreign, remote

class Post(db.Model):
    __tablename__ = 'posts'
    id         = db.Column(db.Integer, primary_key=True)
    author_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    author     = db.relationship('User', back_populates='posts')
    likes      = db.relationship('Like', back_populates='post', lazy='dynamic')
    
    comments = db.relationship(
        'Comment',
        primaryjoin="and_(foreign(Comment.post_id)==Post.id, Comment.post_type=='post')",
        viewonly=True,
        lazy='dynamic'
    )
