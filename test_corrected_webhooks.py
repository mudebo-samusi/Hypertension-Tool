#!/usr/bin/env python3
"""
Test the corrected webhook payload structure
"""
import requests
import json

def test_correct_webhook_structure():
    """Test webhook with the actual WebhookEvent structure"""
    print("Testing corrected webhook structure...")
    
    # Test BP Reading webhook with correct structure
    bp_reading_payload = {
        "event_id": "bp_reading_test_001",
        "event_type": "bp_reading",
        "timestamp": "2025-09-23T15:30:00.000Z",
        "data": {
            "reading": {
                "id": "test_001",
                "user_id": 1,
                "systolic": 135,
                "diastolic": 88,
                "heart_rate": 78,
                "timestamp": "2025-09-23T15:30:00.000Z",
                "device_id": "BP_MONITOR_001"
            },
            "severity": "elevated",
            "timestamp": "2025-09-23T15:30:00.000Z"
        },
        "source": "bp-monitor-microservice",
        "version": "1.0"
    }
    
    # Test Prediction webhook with correct structure
    prediction_payload = {
        "event_id": "prediction_test_001",
        "event_type": "prediction",
        "timestamp": "2025-09-23T15:30:05.000Z",
        "data": {
            "prediction": {
                "reading_id": "test_001",
                "prediction": "Elevated Blood Pressure",
                "probability": 0.85,
                "risk_level": "Medium",
                "recommendation": "Monitor regularly and consider lifestyle changes.",
                "confidence": "High",
                "bp_category": "Elevated",
                "timestamp": "2025-09-23T15:30:05.000Z"
            },
            "reading": {
                "id": "test_001",
                "systolic": 135,
                "diastolic": 88,
                "heart_rate": 78
            },
            "alert_level": "medium",
            "timestamp": "2025-09-23T15:30:05.000Z"
        },
        "source": "bp-monitor-microservice",
        "version": "1.0"
    }
    
    webhooks = [
        ("bp-reading", bp_reading_payload),
        ("prediction", prediction_payload)
    ]
    
    for endpoint, payload in webhooks:
        try:
            url = f"http://localhost:5174/api/webhooks/{endpoint}"
            response = requests.post(url, json=payload, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {endpoint} webhook processed successfully")
                print(f"   Response: {result.get('message')}")
            else:
                print(f"❌ {endpoint} webhook failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Error testing {endpoint} webhook: {e}")

    # Check if notifications were created
    try:
        response = requests.get("http://localhost:5174/api/notifications", timeout=5)
        if response.status_code == 200:
            data = response.json()
            notifications = data.get('notifications', [])
            print(f"\n✅ Total notifications in server: {len(notifications)}")
            
            # Show the latest notifications
            for i, notification in enumerate(notifications[:2]):
                print(f"   Latest {i+1}: {notification.get('title')} - {notification.get('message')}")
        else:
            print(f"\n❌ Failed to get notifications: {response.status_code}")
    except Exception as e:
        print(f"\n❌ Error checking notifications: {e}")

if __name__ == "__main__":
    print("🔍 Testing corrected webhook payload structure\n")
    print("=" * 60)
    test_correct_webhook_structure()
    print("=" * 60)
    print("🎉 Test completed!")