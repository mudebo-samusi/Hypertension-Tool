# app/routes/profiles.py
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from db import db
from models.profile import (
    DoctorProfile, OrganizationProfile,
    OrgSpecialty, OrgFeature
)

profiles_bp = Blueprint('profiles_bp', __name__, url_prefix='/api')

@profiles_bp.route('/doctors', methods=['POST'])
@login_required
def create_doctor():
    data = request.get_json()
    # validate required fields...
    doctor = DoctorProfile(
        user_id       = current_user.id,
        name          = data['name'],
        specialty     = data['specialty'],
        rating        = data.get('rating', 4.5),
        patient_count = data.get('patientCount', 0),
        experience    = data['experience'],
        organization_id = data['organization']['id'],
        availability  = data.get('availability', 'Available today'),
        image_url     = data.get('image'),
        phone         = data['contact']['phone'],
        email         = data['contact']['email'],
        address       = data['address']
    )
    db.session.add(doctor)
    db.session.commit()
    return jsonify({'id': doctor.id}), 201

@profiles_bp.route('/organizations', methods=['POST'])
@login_required
def create_organization():
    data = request.get_json()
    org = OrganizationProfile(
        user_id      = current_user.id,
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
    db.session.flush()  # get org.id

    # add specialties
    for spec in data.get('specialties', []):
        db.session.add(OrgSpecialty(organization_id=org.id, specialty=spec))
    # add features
    for feat in data.get('features', []):
        db.session.add(OrgFeature(organization_id=org.id, feature=feat))

    db.session.commit()
    return jsonify({'id': org.id}), 201

# Optional: endpoints to list existing profiles
@profiles_bp.route('/doctors', methods=['GET'])
@login_required
def list_doctors():
    docs = DoctorProfile.query.all()
    return jsonify([{'id': d.id, 'name': d.name} for d in docs]), 200

@profiles_bp.route('/organizations', methods=['GET'])
@login_required
def list_organizations():
    orgs = OrganizationProfile.query.all()
    return jsonify([{'id': o.id, 'name': o.name} for o in orgs]), 200
