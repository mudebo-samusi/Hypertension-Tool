from datetime import datetime
from db import db

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='USD')
    payment_method = db.Column(db.String(50), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='completed')
    payment_details = db.Column(db.JSON, nullable=True)
    
    # Store names for easier frontend display
    patient_name = db.Column(db.String(100), nullable=True)
    provider_name = db.Column(db.String(100), nullable=True)
    
    # Optional fields for direct payments
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # Track if this is a subscription payment
    is_subscription_payment = db.Column(db.Boolean, default=False)
    
    # Client-side generated ID for tracking
    client_id = db.Column(db.String(100), nullable=True, unique=True)
    
    # List of supported payment methods
    SUPPORTED_METHODS = [
        'credit_card',
        'debit_card',
        'mobile_money',
        'bank_transfer',
        'insurance',
        'cash'
    ]
    
    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'user_id': self.user_id,
            'subscription_id': self.subscription_id,
            'amount': self.amount,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
            'payment_details': self.payment_details,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'patient_name': self.patient_name,
            'provider_name': self.provider_name,
            'is_subscription_payment': self.is_subscription_payment
        }
