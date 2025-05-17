# app/models/chat.py
from datetime import datetime
from db import db

# association table for many-to-many between User and ChatRoom
room_users = db.Table(
    'room_users',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('room_id', db.Integer, db.ForeignKey('chat_room.id'), primary_key=True)
)

class ChatRoom(db.Model):
    __tablename__ = 'chat_room'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=True)  # e.g. “Nurse Team”:contentReference[oaicite:0]{index=0}
    is_group    = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    users       = db.relationship('User', secondary=room_users, back_populates='rooms')
    messages    = db.relationship('Message', back_populates='room', lazy='dynamic')

class Message(db.Model):
    __tablename__ = 'message'
    id          = db.Column(db.Integer, primary_key=True)
    room_id     = db.Column(db.Integer, db.ForeignKey('chat_room.id'), nullable=False, index=True)  # :contentReference[oaicite:1]{index=1}
    sender_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)       # :contentReference[oaicite:2]{index=2}
    content     = db.Column(db.Text, nullable=False)
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    room        = db.relationship('ChatRoom', back_populates='messages')
    sender      = db.relationship('User', back_populates='sent_messages')
