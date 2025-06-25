from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import exists, func, or_
from db import db
import logging
from models.subscription import Subscription
from models.user import User
from models.payments import Payment

payments_bp = Blueprint('payments', __name__, url_prefix='/api')

@payments_bp.route("/payments", methods=["POST"])
@jwt_required()
def create_payment():
    try:
        data = request.get_json() or {}
        # Required top-level fields
        required = ["client_id", "amount", "currency", "payment_method", "timestamp"]
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        # Build base Payment
        payer_id = int(get_jwt_identity())
        payment = Payment(
            client_id              = data["client_id"],
            user_id                = payer_id,
            amount                 = float(data["amount"]),
            currency               = data["currency"],
            payment_method         = data["payment_method"],
            payment_date           = data.get("timestamp"),   # will be parsed by SQLAlchemy if string
            status                 = data.get("status", "completed"),
            patient_id             = data.get("patientId"),
            patient_name           = data.get("patientName"),
            provider_id            = data.get("providerId"),
            provider_name          = data.get("providerName"),
            is_subscription_payment= bool(data.get("is_subscription_payment", False)),
        )

        # If this is linked to an existing subscription record
        if data.get("subscription_id"):
            sub = Subscription.query.get(data["subscription_id"])
            if not sub:
                return jsonify({"error": "Invalid subscription_id"}), 400
            payment.subscription_id = sub.id

        # Everything else goes into the JSON column
        # Strip out our scalar columns first
        for key in [
            "client_id","amount","currency","payment_method","timestamp","status",
            "patientId","patientName","providerId","providerName","is_subscription_payment",
            "subscription_id"
        ]:
            data.pop(key, None)

        payment.payment_details = data

        # Persist
        db.session.add(payment)
        db.session.commit()

        return jsonify(payment.to_dict()), 201

    except Exception as e:
        logging.exception("Error creating payment")
        return jsonify({"error": str(e)}), 500


@payments_bp.route("/payment-info", methods=["GET"])
@jwt_required()
def get_payment_profile():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if user has any payments at all
        has_payments = (
            db.session.query(Payment)
            .filter(
                db.or_(
                    Payment.user_id == user_id,
                    Payment.patient_id == user_id,
                    Payment.provider_id == user_id,
                    Payment.patient_name == user.username,
                    Payment.provider_name == user.username,
                )
            )
            .limit(1)
            .count() > 0
        )

        # Initialize stats
        total_payments = completed_payments = pending_payments = subscription_payments = 0

        if has_payments:
            pq = Payment.query.filter(
                db.or_(
                    Payment.user_id == user_id,
                    Payment.patient_id == user_id,
                    Payment.provider_id == user_id,
                    Payment.patient_name == user.username,
                    Payment.provider_name == user.username,
                )
            )
            total_payments = pq.count()
            completed_payments = pq.filter_by(status="completed").count()
            pending_payments   = pq.filter_by(status="pending").count()
            subscription_payments = pq.filter_by(is_subscription_payment=True).count()

        # Active subscription
        active_subscription = None
        sub = Subscription.query.filter_by(user_id=user_id, status="active").first()
        if sub:
            active_subscription = sub.to_dict()

        return jsonify({
            "has_payments": has_payments,
            "payment_stats": {
                "total_payments": total_payments,
                "completed_payments": completed_payments,
                "pending_payments": pending_payments,
                "subscription_payments": subscription_payments
            },
            "active_subscription": active_subscription,
            "username": user.username
        }), 200

    except Exception as e:
        logging.error(f"Error fetching payment profile: {e}")
        return jsonify({
            "error": f"Failed to fetch payment profile: {str(e)}"
        }), 500

@payments_bp.route("/payments/has", methods=["GET"])
@jwt_required()
def has_payments():
    user_id = int(get_jwt_identity())
    exists_q = db.session.query(
        exists().where(
            or_(
                Payment.user_id == user_id,
                Payment.patient_id == user_id
            )
        )
    ).scalar()
    return jsonify({"has_payments": bool(exists_q)}), 200


# 2) Analytics endpoint
@payments_bp.route("/payments/analytics", methods=["GET"])
@jwt_required()
def payment_analytics():
    user_id         = int(get_jwt_identity())
    include_subs    = request.args.get("includeSubscriptions", "false").lower() in ("1","true","yes")
    # Base filter
    base_q = Payment.query.filter(
        or_(
            Payment.user_id == user_id,
            Payment.patient_id == user_id
        )
    )
    if not include_subs:
        base_q = base_q.filter_by(is_subscription_payment=False)

    total_txns = base_q.count()
    total_rev  = base_q.with_entities(func.coalesce(func.sum(Payment.amount), 0.0)).scalar()
    avg_txn    = (total_rev / total_txns) if total_txns else 0.0

    # Group by month: YYYY-MM
    monthly_rows = (
        db.session.query(
            func.to_char(Payment.payment_date, 'YYYY-MM').label('period'),
            func.sum(Payment.amount).label('revenue')
        )
        .filter(base_q.whereclause)
        .group_by('period')
        .order_by('period')
        .all()
    )
    monthly = [{'period': r.period, 'revenue': float(r.revenue)} for r in monthly_rows]

    # Group by ISO week: IYYY-IW
    weekly_rows = (
        db.session.query(
            func.to_char(Payment.payment_date, 'IYYY-IW').label('period'),
            func.sum(Payment.amount).label('revenue')
        )
        .filter(base_q.whereclause)
        .group_by('period')
        .order_by('period')
        .all()
    )
    weekly = [{'period': r.period, 'revenue': float(r.revenue)} for r in weekly_rows]

    # Distribution by payment_method
    dist_rows = (
        db.session.query(
            Payment.payment_method.label('name'),
            func.count().label('count')
        )
        .filter(base_q.whereclause)
        .group_by('name')
        .all()
    )
    distribution = [{'name': r.name, 'count': r.count} for r in dist_rows]

    return jsonify({
        "has_payments":   total_txns > 0,
        "total_revenue":  float(total_rev),
        "avg_transaction_value": float(avg_txn),
        "total_transactions":    total_txns,
        "monthly_revenue":       monthly,
        "weekly_revenue":        weekly,
        "payment_method_distribution": distribution
    }), 200