from db import db
from flask_login import UserMixin

# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="patient")
    
    # Add is_active field with default=True
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Additional fields for role-specific information
    patient_id = db.Column(db.Integer, nullable=True)  # For Care Taker role
    caretaker_id = db.Column(db.Integer, nullable=True)  # For Patient role
    doctor_type = db.Column(db.String(50), nullable=True)  # For Doctor role
    hospital_name = db.Column(db.String(100), nullable=True)  # For Organizational Doctor
    organization_type = db.Column(db.String(50), nullable=True)  # For Organization role
    profile_image = db.Column(db.String(255), nullable=True)  # Store profile image path/filename
    # Relationships for posts and ads
    posts = db.relationship('Post', back_populates='author', lazy='dynamic')
    ads   = db.relationship('Ad', back_populates='sponsor', lazy='dynamic')
    #relationship for comments
    comments = db.relationship('Comment', back_populates='author', lazy='dynamic')
    likes     = db.relationship('Like', back_populates='user', lazy='dynamic')