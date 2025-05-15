
from flask_sqlalchemy import SQLAlchemy
from models.user import db

# BP Reading model
class BPReading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    systolic = db.Column(db.Float, nullable=False)
    diastolic = db.Column(db.Float, nullable=False)
    heart_rate = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)