# app/models/comment.py
from datetime import datetime
from db import db

class Comment(db.Model):
    __tablename__ = 'comments'
    id          = db.Column(db.Integer, primary_key=True)
    author_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    post_id     = db.Column(db.Integer, nullable=False, index=True)
    post_type   = db.Column(db.Enum('post', 'ad', name='post_type_enum'), nullable=False, index=True)
    content     = db.Column(db.Text, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    author      = db.relationship('User', back_populates='comments')
    likes       = db.relationship('Like', back_populates='comment', lazy='dynamic')

    # Remove the problematic foreign key constraints
    __table_args__ = (
        db.Index('idx_post_id_type', 'post_id', 'post_type'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'author': {
                'id': self.author.id,
                'name': self.author.username,
                'avatar': getattr(self.author, 'avatar', '')
            },
            'content': self.content,
            'createdAt': self.created_at.isoformat()
        }
