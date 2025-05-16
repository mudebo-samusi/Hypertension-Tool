# app/models/ad.py
from datetime import datetime
from db import db
from sqlalchemy.orm import foreign, remote

class Ad(db.Model):
    __tablename__ = 'ads'
    id          = db.Column(db.Integer, primary_key=True)
    sponsor_id  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    title       = db.Column(db.String(100), nullable=False)
    content     = db.Column(db.Text, nullable=False)
    image_url   = db.Column(db.String(255), nullable=True)
    link_url    = db.Column(db.String(255), nullable=True)
    created_at  = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    sponsor     = db.relationship('User', back_populates='ads')
    
    comments = db.relationship(
        'Comment',
        primaryjoin="and_(foreign(Comment.post_id)==Ad.id, Comment.post_type=='ad')",
        viewonly=True,
        lazy='dynamic'
    )
