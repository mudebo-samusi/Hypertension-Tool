#!/usr/bin/env python3
"""
Webhook Test Script - Tests webhook connectivity between BP monitor and frontend
"""
import requests
import json
import time
from datetime import datetime

def test_webhook_server():
    """Test if the webhook server is running"""
    try:
        print("Testing webhook server connectivity...")
        response = requests.get("http://localhost:5174/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Webhook server is running: {data}")
            return True
        else:
            print(f"❌ Webhook server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to webhook server on port 5174")
        return False
    except Exception as e:
        print(f"❌ Error testing webhook server: {e}")
        return False

def test_bp_reading_webhook():
    """Test BP reading webhook endpoint"""
    try:
        print("\nTesting BP reading webhook endpoint...")
        test_data = {
            "systolic": 120,
            "diastolic": 80,
            "heart_rate": 75,
            "timestamp": datetime.now().isoformat(),
            "patient_id": "test_patient",
            "device_id": "TEST_DEVICE_001"
        }
        
        response = requests.post(
            "http://localhost:5174/api/webhooks/bp-reading",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ BP reading webhook successful: {result}")
            return True
        else:
            print(f"❌ BP reading webhook failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing BP reading webhook: {e}")
        return False

def test_prediction_webhook():
    """Test prediction webhook endpoint"""
    try:
        print("\nTesting prediction webhook endpoint...")
        test_data = {
            "prediction": "normal",
            "confidence": 0.85,
            "risk_factors": ["age"],
            "timestamp": datetime.now().isoformat(),
            "patient_id": "test_patient"
        }
        
        response = requests.post(
            "http://localhost:5174/api/webhooks/prediction",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Prediction webhook successful: {result}")
            return True
        else:
            print(f"❌ Prediction webhook failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing prediction webhook: {e}")
        return False

def test_microservice_connectivity():
    """Test if BP monitor microservice is running"""
    try:
        print("\nTesting BP monitor microservice connectivity...")
        response = requests.get("http://localhost:5001/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ BP monitor microservice is running: {data}")
            return True
        else:
            print(f"❌ BP monitor microservice returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to BP monitor microservice on port 5001")
        return False
    except Exception as e:
        print(f"❌ Error testing BP monitor microservice: {e}")
        return False

def test_webhook_endpoints_from_microservice():
    """Test webhook endpoints directly from microservice"""
    try:
        print("\nTesting webhook endpoints from microservice...")
        response = requests.get("http://localhost:5001/api/webhooks", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Microservice webhook endpoints: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Microservice webhook endpoint test failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing microservice webhook endpoints: {e}")
        return False

def test_notifications_endpoint():
    """Test notifications endpoint on webhook server"""
    try:
        print("\nTesting notifications endpoint...")
        response = requests.get("http://localhost:5174/api/notifications", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Notifications endpoint working. Current notifications: {len(data.get('notifications', []))}")
            if data.get('notifications'):
                print("Recent notifications:")
                for notification in data['notifications'][:3]:  # Show first 3
                    print(f"  - {notification.get('title')}: {notification.get('message')}")
            return True
        else:
            print(f"❌ Notifications endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing notifications endpoint: {e}")
        return False

def main():
    """Main test function"""
    print("🔍 Webhook Connectivity Test")
    print("=" * 50)
    
    # Test webhook server
    webhook_server_ok = test_webhook_server()
    
    # Test BP monitor microservice
    microservice_ok = test_microservice_connectivity()
    
    if webhook_server_ok:
        # Test webhook endpoints
        bp_webhook_ok = test_bp_reading_webhook()
        prediction_webhook_ok = test_prediction_webhook()
        notifications_ok = test_notifications_endpoint()
    else:
        print("\n❌ Webhook server is not running, skipping webhook tests")
        bp_webhook_ok = prediction_webhook_ok = notifications_ok = False
    
    if microservice_ok:
        # Test microservice webhook configuration
        microservice_webhooks_ok = test_webhook_endpoints_from_microservice()
    else:
        print("\n❌ BP monitor microservice is not running")
        microservice_webhooks_ok = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print(f"  Webhook Server (port 5174): {'✅' if webhook_server_ok else '❌'}")
    print(f"  BP Monitor Service (port 5001): {'✅' if microservice_ok else '❌'}")
    if webhook_server_ok:
        print(f"  BP Reading Webhook: {'✅' if bp_webhook_ok else '❌'}")
        print(f"  Prediction Webhook: {'✅' if prediction_webhook_ok else '❌'}")
        print(f"  Notifications Endpoint: {'✅' if notifications_ok else '❌'}")
    if microservice_ok:
        print(f"  Microservice Webhook Config: {'✅' if microservice_webhooks_ok else '❌'}")
    
    if webhook_server_ok and microservice_ok and bp_webhook_ok and prediction_webhook_ok:
        print("\n✅ All tests passed! Webhook system should be working.")
    else:
        print("\n❌ Some tests failed. Check the issues above.")
        
        # Provide specific guidance
        if not webhook_server_ok:
            print("\n💡 To fix webhook server issues:")
            print("   cd e:\\Hypertension-Tool\\frontend")
            print("   node webhookServer.mjs")
            
        if not microservice_ok:
            print("\n💡 To fix BP monitor microservice issues:")
            print("   cd e:\\Hypertension-Tool\\Microservices\\bp-monitor")
            print("   python app.py")

if __name__ == "__main__":
    main()