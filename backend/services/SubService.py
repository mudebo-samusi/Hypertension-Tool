from datetime import datetime, timedelta
from models.subscription import Subscription
from models.payments import Payment
from db import db

class SubscriptionService:
    @staticmethod
    def create_subscription(user_id, plan_data, payment_data):
        """Create a new subscription and associated payment"""
        try:
            # Calculate end date based on billing cycle
            start_date = datetime.utcnow()
            if plan_data['billing_cycle'] == 'monthly':
                end_date = start_date + timedelta(days=30)
            else:  # annually
                end_date = start_date + timedelta(days=365)

            # Create subscription
            subscription = Subscription(
                user_id=user_id,
                plan_name=plan_data['planName'],
                billing_cycle=plan_data['billing_cycle'],
                price=plan_data['price'],
                currency=payment_data.get('currency', 'USD'),
                start_date=start_date,
                end_date=end_date
            )
            db.session.add(subscription)
            db.session.flush()  # Get subscription ID without committing

            # Create payment
            payment = Payment(
                user_id=user_id,
                subscription_id=subscription.id,
                amount=plan_data['price'],
                currency=payment_data.get('currency', 'USD'),
                payment_method=payment_data['payment_method'],
                payment_details=payment_data
            )
            db.session.add(payment)
            db.session.commit()

            return subscription.to_dict(), payment.to_dict()

        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_active_subscription(user_id):
        """Get user's active subscription"""
        return Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

    @staticmethod
    def cancel_subscription(subscription_id):
        """Cancel a subscription"""
        subscription = Subscription.query.get(subscription_id)
        if subscription:
            subscription.status = 'cancelled'
            subscription.auto_renew = False
            db.session.commit()
            return subscription.to_dict()
        return None

    @staticmethod
    def process_renewal(subscription_id):
        """Process subscription renewal"""
        subscription = Subscription.query.get(subscription_id)
        if not subscription or not subscription.auto_renew:
            return None

        # Create new payment for renewal
        payment = Payment(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            amount=subscription.price,
            currency=subscription.currency,
            payment_method='auto_renewal',
            status='pending'
        )
        db.session.add(payment)

        # Update subscription dates
        if subscription.billing_cycle == 'monthly':
            subscription.end_date += timedelta(days=30)
        else:
            subscription.end_date += timedelta(days=365)

        db.session.commit()
        return payment.to_dict()
