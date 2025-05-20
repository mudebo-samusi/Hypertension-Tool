# app/models/profile.py
from datetime import datetime
from db import db

class DoctorProfile(db.Model):
    __tablename__ = 'doctor_profiles'
    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    name           = db.Column(db.String(120), nullable=False)
    specialty      = db.Column(db.String(100), nullable=False)
    rating         = db.Column(db.Float, default=4.5, nullable=False)
    patient_count  = db.Column(db.Integer, default=0, nullable=False)
    experience     = db.Column(db.String(100), nullable=False)
    organization_id= db.Column(db.Integer, db.ForeignKey('organization_profiles.id'), nullable=False)
    availability   = db.Column(db.String(50), nullable=False, default='Available today')
    image_url      = db.Column(db.String(255), nullable=True)
    phone          = db.Column(db.String(30), nullable=False)
    email          = db.Column(db.String(120), nullable=False)
    address        = db.Column(db.String(255), nullable=False)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    user           = db.relationship('User', back_populates='doctor_profile')
    organization   = db.relationship('OrganizationProfile', back_populates='doctors')

class OrganizationProfile(db.Model):
    __tablename__ = 'organization_profiles'
    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    name           = db.Column(db.String(120), nullable=False)
    type           = db.Column(db.String(50), nullable=False)
    rating         = db.Column(db.Float, default=4.5, nullable=False)
    doctor_count   = db.Column(db.Integer, default=0, nullable=False)
    image_url      = db.Column(db.String(255), nullable=True)
    phone          = db.Column(db.String(30), nullable=False)
    email          = db.Column(db.String(120), nullable=False)
    address        = db.Column(db.String(255), nullable=False)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    user           = db.relationship('User', back_populates='organization_profile')
    doctors        = db.relationship('DoctorProfile', back_populates='organization', lazy='dynamic')
    specialties    = db.relationship('OrgSpecialty', back_populates='organization', lazy='dynamic')
    features       = db.relationship('OrgFeature',   back_populates='organization', lazy='dynamic')

class OrgSpecialty(db.Model):
    __tablename__ = 'org_specialties'
    id             = db.Column(db.Integer, primary_key=True)
    organization_id= db.Column(db.Integer, db.ForeignKey('organization_profiles.id'), nullable=False)
    specialty      = db.Column(db.String(100), nullable=False)
    organization   = db.relationship('OrganizationProfile', back_populates='specialties')

class OrgFeature(db.Model):
    __tablename__ = 'org_features'
    id             = db.Column(db.Integer, primary_key=True)
    organization_id= db.Column(db.Integer, db.ForeignKey('organization_profiles.id'), nullable=False)
    feature        = db.Column(db.String(100), nullable=False)
    organization   = db.relationship('OrganizationProfile', back_populates='features')
