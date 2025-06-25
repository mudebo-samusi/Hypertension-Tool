# app/routes/profiles.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import db
from models.user import User
from models.profile import (
    DoctorProfile, OrganizationProfile,
    OrgSpecialty, OrgFeature
)

profiles_bp = Blueprint('profiles_bp', __name__, url_prefix='/api')

@profiles_bp.route('/profiles', methods=['POST'])
@jwt_required()
def create_profile():
    data = request.get_json()
    user_id = get_jwt_identity()

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user_type = getattr(user, 'profile_type', None)  # expected: 'doctor' or 'organization'

    if user_type == 'doctor':
        doctor = DoctorProfile(
            user_id        = user.id,
            name           = data['name'],
            specialty      = data['specialty'],
            rating         = data.get('rating', 4.5),
            patient_count  = data.get('patientCount', 0),
            experience     = data['experience'],
            organization_id= data['organization']['id'],
            availability   = data.get('availability', 'Available today'),
            image_url      = data.get('image'),
            phone          = data['contact']['phone'],
            email          = data['contact']['email'],
            address        = data['address']
        )
        db.session.add(doctor)
        db.session.commit()
        return jsonify({'id': doctor.id}), 201

    elif user_type == 'organization':
        org = OrganizationProfile(
            user_id      = user.id,
            name         = data['name'],
            type         = data['type'],
            rating       = data.get('rating', 4.5),
            doctor_count = data.get('doctorCount', 0),
            image_url    = data.get('image'),
            phone        = data['contact']['phone'],
            email        = data['contact']['email'],
            address      = data['address']
        )
        db.session.add(org)
        db.session.flush()

        for spec in data.get('specialties', []):
            db.session.add(OrgSpecialty(organization_id=org.id, specialty=spec))
        for feat in data.get('features', []):
            db.session.add(OrgFeature(organization_id=org.id, feature=feat))

        db.session.commit()
        return jsonify({'id': org.id}), 201

    return jsonify({'error': 'User type not recognized or unauthorized.'}), 403


# GET endpoints remain, wrapped with JWT
@profiles_bp.route('/doctors', methods=['GET'])
@jwt_required()
def list_doctors():
    docs = DoctorProfile.query.all()
    return jsonify([{'id': d.id, 'name': d.name} for d in docs]), 200

@profiles_bp.route('/organizations', methods=['GET'])
@jwt_required()
def list_organizations():
    orgs = OrganizationProfile.query.all()
    return jsonify([{'id': o.id, 'name': o.name} for o in orgs]), 200
