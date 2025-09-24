#!/usr/bin/env python3
"""
Blood Pressure Monitor Microservice

This microservice provides:
1. Changing dummy blood pressure data
2. BP predictions using a simplified prediction model
3. WebSocket connectivity for real-time monitoring
4. REST API endpoints for data access
5. MQTT client simulation for hardware device integration

The service is designed to replicate the monitor workspace functionality
and connect seamlessly with the existing frontend monitor namespace.
"""

import time
import json
import threading
import logging
import random
import uuid
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, Namespace, emit
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, verify_jwt_in_request
import numpy as np
from typing import Dict, List, Optional, Tuple
import schedule
import sqlite3
from dataclasses import dataclass, asdict
from contextlib import contextmanager
import requests
from urllib.parse import urlparse
import hashlib
import hmac

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('bp_monitor_service')

# Configuration
class Config:
    SECRET_KEY = secrets.token_hex(32)
    JWT_SECRET_KEY = "4e8b352387ca940a69deafb95a8b62661366473606e4ae6e67ac5f4bde944b99"
    DATABASE_URL = "sqlite:///bp_monitor.db"
    CORS_ORIGINS = [
        "http://localhost:5173", 
        "http://192.168.66.235:5173",
        "http://localhost:3000"
    ]
    SOCKETIO_ASYNC_MODE = 'threading'
    DATA_GENERATION_INTERVAL = 5  # seconds
    PREDICTION_CONFIDENCE_THRESHOLD = 0.7
    
    # Webhook Configuration
    WEBHOOK_ENABLED = True
    WEBHOOK_SECRET = "bp_monitor_webhook_secret_2025"
    WEBHOOK_TIMEOUT = 10  # seconds
    WEBHOOK_MAX_RETRIES = 3
    WEBHOOK_RETRY_DELAY = 2  # seconds
    
    # Default webhook endpoints - can be configured via environment
    DEFAULT_WEBHOOKS = {
        "bp_reading": ["http://localhost:5174/api/webhooks/bp-reading"],  # Frontend webhook endpoint for BP readings
        "prediction": ["http://localhost:5174/api/webhooks/prediction"],  # Frontend webhook endpoint for predictions
        "alert": ["http://localhost:5174/api/webhooks/alert"],       # Frontend webhook endpoint for critical alerts
        "status": ["http://localhost:5174/api/webhooks/status"]       # Frontend webhook endpoint for status changes
    }

# Data Models
@dataclass
class BPReading:
    """Blood Pressure Reading Data Model"""
    id: str
    user_id: Optional[int]
    systolic: int
    diastolic: int
    heart_rate: int
    timestamp: str
    device_id: str = "BP_MONITOR_001"
    
    def to_dict(self):
        return asdict(self)

@dataclass
class PredictionResult:
    """BP Prediction Result Data Model"""
    reading_id: str
    prediction: str
    probability: float
    risk_level: str
    recommendation: str
    confidence: str
    bp_category: str
    timestamp: str
    
    def to_dict(self):
        return asdict(self)

@dataclass
class WebhookEvent:
    """Webhook Event Data Model"""
    event_id: str
    event_type: str  # 'bp_reading', 'prediction', 'alert', 'status'
    timestamp: str
    data: Dict
    source: str = "bp-monitor-microservice"
    version: str = "1.0"
    
    def to_dict(self):
        return asdict(self)

@dataclass
class WebhookEndpoint:
    """Webhook Endpoint Configuration"""
    id: str
    url: str
    event_types: List[str]
    secret: Optional[str] = None
    enabled: bool = True
    max_retries: int = 3
    timeout: int = 10
    headers: Optional[Dict] = None
    
    def to_dict(self):
        return asdict(self)

# BP Data Generator Class
class BPDataGenerator:
    """Generates realistic dummy blood pressure data with various patterns"""
    
    def __init__(self):
        self.current_trend = "normal"
        self.trend_duration = 0
        self.base_systolic = 120
        self.base_diastolic = 80
        self.base_heart_rate = 75
        
        # Predefined user profiles for realistic data
        self.user_profiles = {
            1: {"age": 35, "condition": "healthy", "base_sys": 115, "base_dia": 75, "base_hr": 70},
            2: {"age": 45, "condition": "pre_hypertension", "base_sys": 135, "base_dia": 85, "base_hr": 80},
            3: {"age": 60, "condition": "hypertension_stage1", "base_sys": 145, "base_dia": 95, "base_hr": 85},
            4: {"age": 55, "condition": "hypertension_stage2", "base_sys": 165, "base_dia": 105, "base_hr": 90},
            5: {"age": 25, "condition": "athletic", "base_sys": 110, "base_dia": 70, "base_hr": 55},
        }
        
    def generate_realistic_reading(self, user_id: Optional[int] = None) -> BPReading:
        """Generate a realistic BP reading based on user profile"""
        
        # Select user profile or use random
        if user_id and user_id in self.user_profiles:
            profile = self.user_profiles[user_id]
        else:
            user_id = random.choice(list(self.user_profiles.keys()))
            profile = self.user_profiles[user_id]
            
        # Base values from profile
        base_sys = profile["base_sys"]
        base_dia = profile["base_dia"] 
        base_hr = profile["base_hr"]
        
        # Add realistic variations
        time_of_day_factor = self._get_time_of_day_factor()
        activity_factor = self._get_activity_factor()
        stress_factor = self._get_stress_factor()
        
        # Calculate final values
        systolic = int(base_sys + 
                      random.randint(-10, 15) + 
                      time_of_day_factor + 
                      activity_factor + 
                      stress_factor)
        
        diastolic = int(base_dia + 
                       random.randint(-8, 12) + 
                       time_of_day_factor * 0.6 + 
                       activity_factor * 0.7 + 
                       stress_factor * 0.8)
        
        heart_rate = int(base_hr + 
                        random.randint(-10, 20) + 
                        activity_factor * 1.5 + 
                        stress_factor * 1.2)
        
        # Ensure realistic bounds
        systolic = max(90, min(200, systolic))
        diastolic = max(50, min(130, diastolic))
        heart_rate = max(50, min(150, heart_rate))
        
        # Ensure diastolic is not higher than systolic
        if diastolic >= systolic:
            diastolic = systolic - random.randint(10, 30)
            
        return BPReading(
            id=str(uuid.uuid4()),
            user_id=user_id,
            systolic=systolic,
            diastolic=diastolic,
            heart_rate=heart_rate,
            timestamp=datetime.now().isoformat(),
            device_id=f"BP_MONITOR_{random.randint(1, 5):03d}"
        )
    
    def _get_time_of_day_factor(self) -> int:
        """BP tends to be higher in morning and evening"""
        hour = datetime.now().hour
        if 6 <= hour <= 10:  # Morning peak
            return random.randint(5, 15)
        elif 17 <= hour <= 20:  # Evening peak  
            return random.randint(3, 10)
        else:
            return random.randint(-5, 5)
    
    def _get_activity_factor(self) -> int:
        """Simulate activity-based BP changes"""
        activities = {
            "resting": random.randint(-5, 0),
            "light_activity": random.randint(0, 8),
            "moderate_activity": random.randint(5, 15),
            "high_activity": random.randint(10, 25)
        }
        return random.choice(list(activities.values()))
    
    def _get_stress_factor(self) -> int:
        """Simulate stress-related BP changes"""
        stress_levels = {
            "calm": random.randint(-3, 2),
            "normal": random.randint(-1, 5),
            "stressed": random.randint(5, 15),
            "very_stressed": random.randint(10, 25)
        }
        return random.choice(list(stress_levels.values()))

# BP Prediction Engine
class BPPredictionEngine:
    """Simplified BP prediction engine for demonstration purposes"""
    
    def __init__(self):
        self.prediction_rules = self._initialize_prediction_rules()
        
    def _initialize_prediction_rules(self) -> Dict:
        """Initialize prediction rules based on medical guidelines"""
        return {
            "normal": {
                "systolic_range": (90, 119),
                "diastolic_range": (60, 79),
                "prediction": "Normal Blood Pressure",
                "risk_level": "Low",
                "recommendation": "Maintain a healthy lifestyle with regular exercise and a balanced diet.",
                "confidence": "High"
            },
            "elevated": {
                "systolic_range": (120, 129),
                "diastolic_range": (60, 79),
                "prediction": "Elevated Blood Pressure", 
                "risk_level": "Low-Medium",
                "recommendation": "Monitor your blood pressure regularly. Consider reducing salt intake and increasing physical activity.",
                "confidence": "High"
            },
            "hypertension_stage1": {
                "systolic_range": (130, 139),
                "diastolic_range": (80, 89),
                "prediction": "Hypertension Stage 1",
                "risk_level": "Medium",
                "recommendation": "Consult a doctor. You may need lifestyle changes and possibly medication.",
                "confidence": "High"
            },
            "hypertension_stage2": {
                "systolic_range": (140, 300),
                "diastolic_range": (90, 200),
                "prediction": "Hypertension Stage 2",
                "risk_level": "High",
                "recommendation": "Seek immediate medical attention. Medication and lifestyle changes are essential.",
                "confidence": "High"
            }
        }
    
    def predict(self, reading: BPReading) -> PredictionResult:
        """Generate prediction based on BP reading"""
        
        systolic = reading.systolic
        diastolic = reading.diastolic
        heart_rate = reading.heart_rate
        
        # Determine category based on highest classification
        category = "normal"
        for cat_name, rules in self.prediction_rules.items():
            sys_min, sys_max = rules["systolic_range"]
            dia_min, dia_max = rules["diastolic_range"]
            
            if (sys_min <= systolic <= sys_max) or (dia_min <= diastolic <= dia_max):
                if cat_name != "normal" or category == "normal":
                    category = cat_name
        
        # Handle edge cases
        if systolic < 90 or diastolic < 60:
            category = "hypotension"
            rules = {
                "prediction": "Low Blood Pressure (Hypotension)",
                "risk_level": "Medium",
                "recommendation": "Consult a healthcare provider if you experience symptoms like dizziness or fainting.",
                "confidence": "Medium"
            }
        elif category in self.prediction_rules:
            rules = self.prediction_rules[category]
        else:
            rules = self.prediction_rules["normal"]
        
        # Calculate probability based on how well reading fits category
        probability = self._calculate_confidence_probability(reading, category)
        
        # Add heart rate considerations
        hr_factor = self._evaluate_heart_rate(heart_rate)
        
        return PredictionResult(
            reading_id=reading.id,
            prediction=rules["prediction"],
            probability=probability,
            risk_level=rules["risk_level"],
            recommendation=rules["recommendation"] + hr_factor["recommendation"],
            confidence=rules["confidence"],
            bp_category=category.replace("_", " ").title(),
            timestamp=datetime.now().isoformat()
        )
    
    def _calculate_confidence_probability(self, reading: BPReading, category: str) -> float:
        """Calculate prediction probability based on reading values"""
        if category == "hypotension":
            return random.uniform(0.7, 0.9)
            
        if category not in self.prediction_rules:
            return random.uniform(0.6, 0.8)
            
        rules = self.prediction_rules[category]
        sys_min, sys_max = rules["systolic_range"]
        dia_min, dia_max = rules["diastolic_range"]
        
        # Calculate how well values fit in range
        sys_fit = 1.0 if sys_min <= reading.systolic <= sys_max else 0.7
        dia_fit = 1.0 if dia_min <= reading.diastolic <= dia_max else 0.7
        
        base_probability = (sys_fit + dia_fit) / 2
        
        # Add some randomness for realism
        return min(0.99, max(0.55, base_probability + random.uniform(-0.1, 0.1)))
    
    def _evaluate_heart_rate(self, heart_rate: int) -> Dict:
        """Evaluate heart rate and provide additional recommendations"""
        if heart_rate < 60:
            return {
                "recommendation": " Note: Heart rate is below normal (bradycardia) - consider consulting a healthcare provider.",
                "hr_category": "low"
            }
        elif heart_rate > 100:
            return {
                "recommendation": " Note: Heart rate is above normal (tachycardia) - monitor and consider medical consultation.",
                "hr_category": "high"  
            }
        else:
            return {
                "recommendation": " Heart rate is within normal range.",
                "hr_category": "normal"
            }

# Webhook Management System
class WebhookManager:
    """Manages webhook endpoints and event delivery"""
    
    def __init__(self):
        self.endpoints: Dict[str, WebhookEndpoint] = {}
        self.event_queue = []
        self.delivery_stats = {
            "total_sent": 0,
            "successful": 0,
            "failed": 0,
            "retries": 0
        }
        
        # Load default webhooks from config
        self._load_default_webhooks()
        
    def _load_default_webhooks(self):
        """Load default webhook configurations from Config.DEFAULT_WEBHOOKS"""
        # Load webhooks from Config.DEFAULT_WEBHOOKS
        for event_type, urls in Config.DEFAULT_WEBHOOKS.items():
            for i, url in enumerate(urls):
                endpoint_id = f"{event_type}_{i+1}"
                self.add_endpoint(
                    endpoint_id=endpoint_id,
                    url=url,
                    event_types=[event_type],  # Each endpoint handles specific event type
                    secret=Config.WEBHOOK_SECRET,
                    enabled=True  # Enable by default since these are our configured endpoints
                )
    
    def add_endpoint(self, endpoint_id: str, url: str, event_types: List[str], 
                    secret: Optional[str] = None, enabled: bool = True,
                    max_retries: int = None, timeout: int = None,
                    headers: Optional[Dict] = None) -> bool:
        """Add a new webhook endpoint"""
        try:
            # Validate URL
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                logger.error(f"Invalid webhook URL: {url}")
                return False
            
            webhook = WebhookEndpoint(
                id=endpoint_id,
                url=url,
                event_types=event_types,
                secret=secret or Config.WEBHOOK_SECRET,
                enabled=enabled,
                max_retries=max_retries or Config.WEBHOOK_MAX_RETRIES,
                timeout=timeout or Config.WEBHOOK_TIMEOUT,
                headers=headers or {}
            )
            
            self.endpoints[endpoint_id] = webhook
            logger.info(f"Added webhook endpoint: {endpoint_id} -> {url}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding webhook endpoint {endpoint_id}: {e}")
            return False
    
    def remove_endpoint(self, endpoint_id: str) -> bool:
        """Remove a webhook endpoint"""
        if endpoint_id in self.endpoints:
            del self.endpoints[endpoint_id]
            logger.info(f"Removed webhook endpoint: {endpoint_id}")
            return True
        return False
    
    def enable_endpoint(self, endpoint_id: str) -> bool:
        """Enable a webhook endpoint"""
        if endpoint_id in self.endpoints:
            self.endpoints[endpoint_id].enabled = True
            logger.info(f"Enabled webhook endpoint: {endpoint_id}")
            return True
        return False
    
    def disable_endpoint(self, endpoint_id: str) -> bool:
        """Disable a webhook endpoint"""
        if endpoint_id in self.endpoints:
            self.endpoints[endpoint_id].enabled = False
            logger.info(f"Disabled webhook endpoint: {endpoint_id}")
            return True
        return False
    
    def create_event(self, event_type: str, data: Dict, 
                    custom_id: Optional[str] = None) -> WebhookEvent:
        """Create a webhook event"""
        event_id = custom_id or f"{event_type}_{uuid.uuid4().hex[:8]}"
        
        return WebhookEvent(
            event_id=event_id,
            event_type=event_type,
            timestamp=datetime.now().isoformat(),
            data=data,
            source="bp-monitor-microservice",
            version="1.0"
        )
    
    def _generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook security"""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def _send_webhook(self, endpoint: WebhookEndpoint, event: WebhookEvent) -> bool:
        """Send webhook event to a specific endpoint"""
        try:
            payload = json.dumps(event.to_dict())
            
            # Prepare headers
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'BP-Monitor-Microservice/1.0',
                'X-Event-Type': event.event_type,
                'X-Event-ID': event.event_id,
                'X-Timestamp': event.timestamp
            }
            
            # Add custom headers
            if endpoint.headers:
                headers.update(endpoint.headers)
            
            # Add signature for security
            if endpoint.secret:
                signature = self._generate_signature(payload, endpoint.secret)
                headers['X-Signature-SHA256'] = f'sha256={signature}'
            
            # Send the webhook
            response = requests.post(
                endpoint.url,
                data=payload,
                headers=headers,
                timeout=endpoint.timeout,
                verify=True  # Verify SSL certificates
            )
            
            self.delivery_stats["total_sent"] += 1
            
            if response.status_code == 200:
                self.delivery_stats["successful"] += 1
                logger.debug(f"Webhook sent successfully to {endpoint.url}")
                return True
            else:
                logger.warning(f"Webhook failed with status {response.status_code}: {endpoint.url}")
                return False
                
        except requests.exceptions.Timeout:
            logger.error(f"Webhook timeout to {endpoint.url}")
            return False
        except requests.exceptions.ConnectionError:
            logger.error(f"Webhook connection error to {endpoint.url}")
            return False
        except Exception as e:
            logger.error(f"Webhook error to {endpoint.url}: {e}")
            return False
    
    def send_event(self, event: WebhookEvent, async_send: bool = True) -> Dict:
        """Send webhook event to all matching endpoints"""
        results = {
            "event_id": event.event_id,
            "event_type": event.event_type,
            "endpoints_matched": 0,
            "endpoints_sent": 0,
            "endpoints_failed": 0,
            "delivery_results": []
        }
        
        # Find matching endpoints
        matching_endpoints = [
            endpoint for endpoint in self.endpoints.values()
            if endpoint.enabled and event.event_type in endpoint.event_types
        ]
        
        results["endpoints_matched"] = len(matching_endpoints)
        
        if not matching_endpoints:
            logger.debug(f"No matching endpoints for event type: {event.event_type}")
            return results
        
        def send_to_endpoint(endpoint: WebhookEndpoint):
            """Send webhook to a single endpoint with retry logic"""
            delivery_result = {
                "endpoint_id": endpoint.id,
                "url": endpoint.url,
                "attempts": 0,
                "success": False,
                "error": None
            }
            
            for attempt in range(endpoint.max_retries + 1):
                delivery_result["attempts"] = attempt + 1
                
                success = self._send_webhook(endpoint, event)
                if success:
                    delivery_result["success"] = True
                    results["endpoints_sent"] += 1
                    break
                else:
                    if attempt < endpoint.max_retries:
                        self.delivery_stats["retries"] += 1
                        time.sleep(Config.WEBHOOK_RETRY_DELAY * (attempt + 1))
                    else:
                        delivery_result["error"] = f"Failed after {endpoint.max_retries + 1} attempts"
                        results["endpoints_failed"] += 1
                        self.delivery_stats["failed"] += 1
            
            results["delivery_results"].append(delivery_result)
        
        if async_send:
            # Send webhooks asynchronously
            threads = []
            for endpoint in matching_endpoints:
                thread = threading.Thread(target=send_to_endpoint, args=(endpoint,))
                thread.start()
                threads.append(thread)
            
            # Wait for all threads to complete (with timeout)
            for thread in threads:
                thread.join(timeout=30)
        else:
            # Send webhooks synchronously
            for endpoint in matching_endpoints:
                send_to_endpoint(endpoint)
        
        logger.info(f"Webhook event {event.event_id} sent to {results['endpoints_sent']}/{results['endpoints_matched']} endpoints")
        return results
    
    def send_bp_reading_event(self, reading: BPReading, async_send: bool = True) -> Dict:
        """Send BP reading webhook event"""
        event_data = {
            "reading": reading.to_dict(),
            "severity": self._assess_reading_severity(reading),
            "timestamp": reading.timestamp
        }
        
        event = self.create_event("bp_reading", event_data, f"bp_{reading.id}")
        return self.send_event(event, async_send)
    
    def send_prediction_event(self, prediction: PredictionResult, reading: BPReading, 
                            async_send: bool = True) -> Dict:
        """Send prediction webhook event"""
        event_data = {
            "prediction": prediction.to_dict(),
            "reading": reading.to_dict(),
            "alert_level": self._get_alert_level(prediction),
            "timestamp": prediction.timestamp
        }
        
        event = self.create_event("prediction", event_data, f"pred_{prediction.reading_id}")
        return self.send_event(event, async_send)
    
    def send_alert_event(self, alert_type: str, message: str, severity: str = "medium",
                        additional_data: Optional[Dict] = None, async_send: bool = True) -> Dict:
        """Send alert webhook event"""
        event_data = {
            "alert_type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }
        
        if additional_data:
            event_data["additional_data"] = additional_data
        
        event = self.create_event("alert", event_data)
        return self.send_event(event, async_send)
    
    def send_status_event(self, status: str, message: str, 
                         additional_data: Optional[Dict] = None, async_send: bool = True) -> Dict:
        """Send status change webhook event"""
        event_data = {
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "service": "bp-monitor-microservice"
        }
        
        if additional_data:
            event_data["additional_data"] = additional_data
        
        event = self.create_event("status", event_data)
        return self.send_event(event, async_send)
    
    def _assess_reading_severity(self, reading: BPReading) -> str:
        """Assess the severity of a BP reading"""
        systolic = reading.systolic
        diastolic = reading.diastolic
        
        # Critical levels
        if systolic >= 180 or diastolic >= 120:
            return "critical"
        elif systolic >= 160 or diastolic >= 100:
            return "high"
        elif systolic >= 140 or diastolic >= 90:
            return "elevated"
        elif systolic >= 120 or diastolic >= 80:
            return "borderline"
        else:
            return "normal"
    
    def _get_alert_level(self, prediction: PredictionResult) -> str:
        """Get alert level based on prediction"""
        risk_level = prediction.risk_level.lower()
        
        if "high" in risk_level or "critical" in risk_level:
            return "high"
        elif "medium" in risk_level:
            return "medium"
        else:
            return "low"
    
    def get_stats(self) -> Dict:
        """Get webhook delivery statistics"""
        return {
            "endpoints": {
                "total": len(self.endpoints),
                "enabled": len([e for e in self.endpoints.values() if e.enabled]),
                "disabled": len([e for e in self.endpoints.values() if not e.enabled])
            },
            "delivery": self.delivery_stats.copy(),
            "success_rate": (
                self.delivery_stats["successful"] / max(1, self.delivery_stats["total_sent"]) * 100
            )
        }
    
    def get_endpoints(self) -> List[Dict]:
        """Get list of configured webhook endpoints"""
        return [endpoint.to_dict() for endpoint in self.endpoints.values()]
    
    def test_endpoint(self, endpoint_id: str) -> Dict:
        """Test a specific webhook endpoint"""
        if endpoint_id not in self.endpoints:
            return {"error": "Endpoint not found", "success": False}
        
        endpoint = self.endpoints[endpoint_id]
        
        # Create test event
        test_event = self.create_event("status", {
            "test": True,
            "message": "Webhook endpoint test",
            "timestamp": datetime.now().isoformat()
        }, f"test_{uuid.uuid4().hex[:8]}")
        
        # Send test webhook
        success = self._send_webhook(endpoint, test_event)
        
        return {
            "endpoint_id": endpoint_id,
            "url": endpoint.url,
            "success": success,
            "test_event_id": test_event.event_id,
            "timestamp": datetime.now().isoformat()
        }

# Database Manager
class DatabaseManager:
    """Handles database operations for BP readings and predictions"""
    
    def __init__(self, db_path: str = "bp_monitor.db"):
        self.db_path = db_path
        self.init_database()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def init_database(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            # BP Readings table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS bp_readings (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    systolic INTEGER NOT NULL,
                    diastolic INTEGER NOT NULL,
                    heart_rate INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    device_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Predictions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    reading_id TEXT PRIMARY KEY,
                    prediction TEXT NOT NULL,
                    probability REAL NOT NULL,
                    risk_level TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    confidence TEXT NOT NULL,
                    bp_category TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (reading_id) REFERENCES bp_readings (id)
                )
            """)
            
            conn.commit()
            
    def save_reading(self, reading: BPReading) -> bool:
        """Save BP reading to database"""
        try:
            with self.get_connection() as conn:
                conn.execute("""
                    INSERT INTO bp_readings 
                    (id, user_id, systolic, diastolic, heart_rate, timestamp, device_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    reading.id, reading.user_id, reading.systolic, 
                    reading.diastolic, reading.heart_rate, 
                    reading.timestamp, reading.device_id
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error saving reading: {e}")
            return False
    
    def save_prediction(self, prediction: PredictionResult) -> bool:
        """Save prediction result to database"""
        try:
            with self.get_connection() as conn:
                conn.execute("""
                    INSERT INTO predictions 
                    (reading_id, prediction, probability, risk_level, 
                     recommendation, confidence, bp_category, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    prediction.reading_id, prediction.prediction,
                    prediction.probability, prediction.risk_level,
                    prediction.recommendation, prediction.confidence,
                    prediction.bp_category, prediction.timestamp
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error saving prediction: {e}")
            return False
    
    def get_recent_readings(self, limit: int = 100, user_id: Optional[int] = None) -> List[Dict]:
        """Get recent BP readings"""
        try:
            with self.get_connection() as conn:
                if user_id:
                    cursor = conn.execute("""
                        SELECT * FROM bp_readings 
                        WHERE user_id = ?
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """, (user_id, limit))
                else:
                    cursor = conn.execute("""
                        SELECT * FROM bp_readings 
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """, (limit,))
                
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error getting readings: {e}")
            return []
    
    def get_reading_with_prediction(self, reading_id: str) -> Optional[Dict]:
        """Get reading with its prediction"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute("""
                    SELECT r.*, p.prediction, p.probability, p.risk_level,
                           p.recommendation, p.confidence, p.bp_category
                    FROM bp_readings r
                    LEFT JOIN predictions p ON r.id = p.reading_id
                    WHERE r.id = ?
                """, (reading_id,))
                
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting reading with prediction: {e}")
            return None

# Flask App Setup
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)
jwt = JWTManager(app)
socketio = SocketIO(
    app, 
    cors_allowed_origins=Config.CORS_ORIGINS,
    async_mode=Config.SOCKETIO_ASYNC_MODE,
    logger=True,
    engineio_logger=True
)

# Initialize components
data_generator = BPDataGenerator()
prediction_engine = BPPredictionEngine()
db_manager = DatabaseManager()
webhook_manager = WebhookManager()

# Global state for monitoring
active_connections = set()
is_monitoring_active = False
monitoring_thread = None

# Monitor Namespace for Socket.IO
class MonitorNamespace(Namespace):
    """Socket.IO namespace for real-time BP monitoring"""
    
    def on_connect(self, auth):
        """Handle client connection"""
        logger.info(f"Client connected to monitor namespace: {request.sid}")
        logger.info(f"Auth data received: {auth}")
        active_connections.add(request.sid)
        
        # Send connection confirmation
        self.emit('status', {
            'message': 'Connected to BP Monitor Service',
            'timestamp': datetime.now().isoformat(),
            'service': 'bp-monitor-microservice',
            'connection_id': request.sid
        })
        
        # Send latest reading if available
        recent_readings = db_manager.get_recent_readings(limit=1)
        if recent_readings:
            latest_reading = recent_readings[0]
            self.emit('new_bp_reading', {
                'systolic': latest_reading['systolic'],
                'diastolic': latest_reading['diastolic'],
                'heart_rate': latest_reading['heart_rate'],
                'timestamp': latest_reading['timestamp'],
                'device_id': latest_reading['device_id']
            })
    
    def on_disconnect(self):
        """Handle client disconnection"""
        logger.info(f"Client disconnected from monitor namespace: {request.sid}")
        active_connections.discard(request.sid)
    
    def on_start_monitoring(self, data):
        """Start monitoring for a specific client"""
        logger.info(f"Starting monitoring for client: {request.sid}")
        self.emit('monitoring_started', {
            'status': 'active',
            'timestamp': datetime.now().isoformat()
        })
    
    def on_stop_monitoring(self, data):
        """Stop monitoring for a specific client"""
        logger.info(f"Stopping monitoring for client: {request.sid}")
        self.emit('monitoring_stopped', {
            'status': 'inactive',
            'timestamp': datetime.now().isoformat()
        })

# Register namespace
socketio.on_namespace(MonitorNamespace('/monitor'))

# REST API Endpoints

# Webhook Management Endpoints

@app.route('/api/webhooks', methods=['GET'])
def get_webhooks():
    """Get all configured webhook endpoints"""
    try:
        endpoints = webhook_manager.get_endpoints()
        stats = webhook_manager.get_stats()
        
        return jsonify({
            'endpoints': endpoints,
            'stats': stats,
            'count': len(endpoints)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting webhooks: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks', methods=['POST'])
def add_webhook():
    """Add a new webhook endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['endpoint_id', 'url', 'event_types']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        success = webhook_manager.add_endpoint(
            endpoint_id=data['endpoint_id'],
            url=data['url'],
            event_types=data['event_types'],
            secret=data.get('secret'),
            enabled=data.get('enabled', True),
            max_retries=data.get('max_retries'),
            timeout=data.get('timeout'),
            headers=data.get('headers')
        )
        
        if success:
            return jsonify({
                'message': 'Webhook endpoint added successfully',
                'endpoint_id': data['endpoint_id']
            }), 201
        else:
            return jsonify({'error': 'Failed to add webhook endpoint'}), 400
            
    except Exception as e:
        logger.error(f"Error adding webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/<endpoint_id>', methods=['DELETE'])
def remove_webhook(endpoint_id):
    """Remove a webhook endpoint"""
    try:
        success = webhook_manager.remove_endpoint(endpoint_id)
        
        if success:
            return jsonify({
                'message': 'Webhook endpoint removed successfully',
                'endpoint_id': endpoint_id
            }), 200
        else:
            return jsonify({'error': 'Webhook endpoint not found'}), 404
            
    except Exception as e:
        logger.error(f"Error removing webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/<endpoint_id>/enable', methods=['POST'])
def enable_webhook(endpoint_id):
    """Enable a webhook endpoint"""
    try:
        success = webhook_manager.enable_endpoint(endpoint_id)
        
        if success:
            return jsonify({
                'message': 'Webhook endpoint enabled',
                'endpoint_id': endpoint_id
            }), 200
        else:
            return jsonify({'error': 'Webhook endpoint not found'}), 404
            
    except Exception as e:
        logger.error(f"Error enabling webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/<endpoint_id>/disable', methods=['POST'])
def disable_webhook(endpoint_id):
    """Disable a webhook endpoint"""
    try:
        success = webhook_manager.disable_endpoint(endpoint_id)
        
        if success:
            return jsonify({
                'message': 'Webhook endpoint disabled',
                'endpoint_id': endpoint_id
            }), 200
        else:
            return jsonify({'error': 'Webhook endpoint not found'}), 404
            
    except Exception as e:
        logger.error(f"Error disabling webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/<endpoint_id>/test', methods=['POST'])
def test_webhook(endpoint_id):
    """Test a webhook endpoint"""
    try:
        result = webhook_manager.test_endpoint(endpoint_id)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error testing webhook: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/stats', methods=['GET'])
def webhook_stats():
    """Get webhook delivery statistics"""
    try:
        stats = webhook_manager.get_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error getting webhook stats: {e}")
        return jsonify({'error': str(e)}), 500

# Main API Endpoints

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'bp-monitor-microservice',
        'timestamp': datetime.now().isoformat(),
        'active_connections': len(active_connections),
        'monitoring_active': is_monitoring_active
    }), 200

@app.route('/api/generate-reading', methods=['POST'])
def generate_reading():
    """Generate a new BP reading"""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        
        # Generate reading
        reading = data_generator.generate_realistic_reading(user_id)
        
        # Generate prediction
        prediction = prediction_engine.predict(reading)
        
        # Save to database
        db_manager.save_reading(reading)
        db_manager.save_prediction(prediction)
        
        # Send webhook notifications
        try:
            webhook_manager.send_bp_reading_event(reading, async_send=True)
            webhook_manager.send_prediction_event(prediction, reading, async_send=True)
            
            # Send alert if critical reading
            severity = webhook_manager._assess_reading_severity(reading)
            if severity in ['critical', 'high']:
                webhook_manager.send_alert_event(
                    alert_type="critical_bp_reading",
                    message=f"Critical BP reading detected: {reading.systolic}/{reading.diastolic} mmHg",
                    severity=severity,
                    additional_data={
                        "reading_id": reading.id,
                        "user_id": reading.user_id,
                        "prediction": prediction.prediction
                    },
                    async_send=True
                )
        except Exception as webhook_error:
            logger.error(f"Webhook notification failed: {webhook_error}")
            # Continue processing even if webhooks fail
        
        # Broadcast to connected clients
        socketio.emit('new_bp_reading', {
            'systolic': reading.systolic,
            'diastolic': reading.diastolic,
            'heart_rate': reading.heart_rate,
            'timestamp': reading.timestamp,
            'device_id': reading.device_id,
            'user_id': reading.user_id
        }, namespace='/monitor')
        
        socketio.emit('prediction_result', prediction.to_dict(), namespace='/monitor')
        
        return jsonify({
            'reading': reading.to_dict(),
            'prediction': prediction.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating reading: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/readings', methods=['GET'])
def get_readings():
    """Get recent BP readings"""
    try:
        limit = request.args.get('limit', 50, type=int)
        user_id = request.args.get('user_id', type=int)
        
        readings = db_manager.get_recent_readings(limit=limit, user_id=user_id)
        
        return jsonify({
            'readings': readings,
            'count': len(readings)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting readings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/readings/<reading_id>', methods=['GET'])  
def get_reading_detail(reading_id):
    """Get detailed reading with prediction"""
    try:
        reading_data = db_manager.get_reading_with_prediction(reading_id)
        
        if not reading_data:
            return jsonify({'error': 'Reading not found'}), 404
        
        return jsonify(reading_data), 200
        
    except Exception as e:
        logger.error(f"Error getting reading detail: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-monitoring', methods=['POST'])
def start_monitoring():
    """Start continuous monitoring"""
    global is_monitoring_active, monitoring_thread
    
    if is_monitoring_active:
        return jsonify({'message': 'Monitoring already active'}), 200
    
    is_monitoring_active = True
    
    # Send status webhook
    try:
        webhook_manager.send_status_event(
            status="monitoring_started",
            message="Continuous BP monitoring has been started",
            additional_data={
                "interval": Config.DATA_GENERATION_INTERVAL,
                "timestamp": datetime.now().isoformat()
            },
            async_send=True
        )
    except Exception as webhook_error:
        logger.error(f"Status webhook failed: {webhook_error}")
    
    def monitoring_loop():
        """Continuous monitoring loop"""
        with app.app_context():  # Ensure we have application context
            while is_monitoring_active:
                try:
                    # Generate new reading
                    reading = data_generator.generate_realistic_reading()
                    prediction = prediction_engine.predict(reading)
                    
                    # Save to database
                    db_manager.save_reading(reading)
                    db_manager.save_prediction(prediction)
                    
                    # Send webhook notifications
                    try:
                        webhook_manager.send_bp_reading_event(reading, async_send=True)
                        webhook_manager.send_prediction_event(prediction, reading, async_send=True)
                        
                        # Send alert if critical reading
                        severity = webhook_manager._assess_reading_severity(reading)
                        if severity in ['critical', 'high']:
                            webhook_manager.send_alert_event(
                                alert_type="continuous_monitoring_alert",
                                message=f"Alert during monitoring: {reading.systolic}/{reading.diastolic} mmHg",
                                severity=severity,
                                additional_data={
                                    "reading_id": reading.id,
                                    "monitoring_active": True,
                                    "prediction": prediction.prediction
                                },
                                async_send=True
                            )
                    except Exception as webhook_error:
                        logger.error(f"Webhook notification failed: {webhook_error}")
                    
                    # Broadcast to all connected clients - ALWAYS emit for debugging  
                    # Changed: Always emit data even if no connections for debugging
                    logger.info(f"Broadcasting data (manual monitoring). Active connections: {len(active_connections)}")
                    socketio.emit('new_bp_reading', {
                        'systolic': reading.systolic,
                        'diastolic': reading.diastolic, 
                        'heart_rate': reading.heart_rate,
                        'timestamp': reading.timestamp,
                        'device_id': reading.device_id,
                        'user_id': reading.user_id
                    }, namespace='/monitor')
                    
                    socketio.emit('prediction_result', prediction.to_dict(), namespace='/monitor')
                    
                    time.sleep(Config.DATA_GENERATION_INTERVAL)
                    
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(1)
    
    monitoring_thread = threading.Thread(target=monitoring_loop, daemon=True)
    monitoring_thread.start()
    
    return jsonify({
        'message': 'Monitoring started',
        'interval': Config.DATA_GENERATION_INTERVAL
    }), 200

@app.route('/api/stop-monitoring', methods=['POST'])
def stop_monitoring():
    """Stop continuous monitoring"""
    global is_monitoring_active
    
    was_active = is_monitoring_active
    is_monitoring_active = False
    
    # Send status webhook
    if was_active:
        try:
            webhook_manager.send_status_event(
                status="monitoring_stopped",
                message="Continuous BP monitoring has been stopped",
                additional_data={
                    "timestamp": datetime.now().isoformat()
                },
                async_send=True
            )
        except Exception as webhook_error:
            logger.error(f"Status webhook failed: {webhook_error}")
    
    return jsonify({'message': 'Monitoring stopped'}), 200

@app.route('/api/monitoring/status', methods=['GET'])
def monitoring_status():
    """Get monitoring status"""
    return jsonify({
        'active': is_monitoring_active,
        'active_connections': len(active_connections),
        'last_update': datetime.now().isoformat()
    }), 200

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@jwt.invalid_token_loader
def invalid_token_callback(error_string):
    return jsonify({'error': 'Invalid token'}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error_string):
    return jsonify({'error': 'Authorization required'}), 401

def start_monitoring_background():
    """Start monitoring in background without returning HTTP response"""
    global is_monitoring_active, monitoring_thread
    
    if is_monitoring_active:
        logger.info("Monitoring already active")
        return
    
    logger.info("Starting background monitoring...")
    is_monitoring_active = True
    
    # Send status webhook
    try:
        with app.app_context():
            webhook_manager.send_status_event(
                status="monitoring_started",
                message="Continuous BP monitoring has been started automatically",
                additional_data={
                    "interval": Config.DATA_GENERATION_INTERVAL,
                    "timestamp": datetime.now().isoformat(),
                    "auto_start": True
                },
                async_send=True
            )
    except Exception as webhook_error:
        logger.error(f"Status webhook failed: {webhook_error}")
    
    def monitoring_loop():
        """Continuous monitoring loop"""
        with app.app_context():  # Ensure we have application context
            while is_monitoring_active:
                try:
                    # Generate new reading
                    reading = data_generator.generate_realistic_reading()
                    prediction = prediction_engine.predict(reading)
                    
                    # Save to database
                    db_manager.save_reading(reading)
                    db_manager.save_prediction(prediction)
                    
                    # Send webhook notifications
                    try:
                        webhook_manager.send_bp_reading_event(reading, async_send=True)
                        webhook_manager.send_prediction_event(prediction, reading, async_send=True)
                        
                        # Send alert if critical reading
                        severity = webhook_manager._assess_reading_severity(reading)
                        if severity in ['critical', 'high']:
                            webhook_manager.send_alert_event(
                                alert_type="auto_monitoring_alert",
                                message=f"Alert during auto-monitoring: {reading.systolic}/{reading.diastolic} mmHg",
                                severity=severity,
                                additional_data={
                                    "reading_id": reading.id,
                                    "monitoring_active": True,
                                    "prediction": prediction.prediction,
                                    "auto_start": True
                                },
                                async_send=True
                            )
                    except Exception as webhook_error:
                        logger.error(f"Webhook notification failed: {webhook_error}")
                    
                    # Broadcast to all connected clients - ALWAYS emit for debugging
                    # Changed: Always emit data even if no connections for debugging
                    logger.info(f"Broadcasting data. Active connections: {len(active_connections)}")
                    socketio.emit('new_bp_reading', {
                        'systolic': reading.systolic,
                        'diastolic': reading.diastolic, 
                        'heart_rate': reading.heart_rate,
                        'timestamp': reading.timestamp,
                        'device_id': reading.device_id,
                        'user_id': reading.user_id
                    }, namespace='/monitor')
                    
                    socketio.emit('prediction_result', prediction.to_dict(), namespace='/monitor')
                    
                    time.sleep(Config.DATA_GENERATION_INTERVAL)
                    
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(1)
    
    monitoring_thread = threading.Thread(target=monitoring_loop, daemon=True)
    monitoring_thread.start()
    logger.info("Background monitoring started successfully")

if __name__ == '__main__':
    logger.info("Starting BP Monitor Microservice...")
    logger.info(f"CORS Origins: {Config.CORS_ORIGINS}")
    logger.info(f"Data Generation Interval: {Config.DATA_GENERATION_INTERVAL}s")
    
    # Auto-start monitoring on service startup
    threading.Thread(target=lambda: time.sleep(2) or start_monitoring_background(), daemon=True).start()
    
    socketio.run(
        app,
        debug=True,
        host='0.0.0.0',
        port=5001,
        allow_unsafe_werkzeug=True
    )