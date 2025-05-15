from datetime import datetime
from db import db

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_name = db.Column(db.String(100), nullable=False)
    billing_cycle = db.Column(db.String(20), nullable=False)  # 'monthly' or 'annually'
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='USD')
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')  # 'active', 'cancelled', 'expired'
    auto_renew = db.Column(db.Boolean, default=True)
    
    # Relationships
    payments = db.relationship('Payment', backref='subscription', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan_name': self.plan_name,
            'billing_cycle': self.billing_cycle,
            'price': self.price,
            'currency': self.currency,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'auto_renew': self.auto_renew
        }
