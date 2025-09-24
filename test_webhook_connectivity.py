#!/usr/bin/env python3
"""
Test webhook connectivity between BP monitor microservice and webhook server
"""
import requests
import json

def test_webhook_server():
    """Test if webhook server is running and accessible"""
    print("Testing webhook server connectivity...")
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:5174/health", timeout=5)
        if response.status_code == 200:
            print("✅ Webhook server is running on port 5174")
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
            print(f"   Notifications: {health_data.get('notifications')}")
        else:
            print(f"❌ Webhook server health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to webhook server on port 5174")
        return False
    except Exception as e:
        print(f"❌ Error testing webhook server: {e}")
        return False
    
    return True

def test_bp_microservice():
    """Test if BP microservice is running"""
    print("\nTesting BP microservice connectivity...")
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:5001/health", timeout=5)
        if response.status_code == 200:
            print("✅ BP microservice is running on port 5001")
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
        else:
            print(f"❌ BP microservice health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to BP microservice on port 5001")
        return False
    except Exception as e:
        print(f"❌ Error testing BP microservice: {e}")
        return False
    
    return True

def test_webhook_endpoints():
    """Test webhook endpoints on webhook server"""
    print("\nTesting webhook endpoints...")
    
    test_data = {
        "systolic": 130,
        "diastolic": 85,
        "heart_rate": 75,
        "timestamp": "2025-09-23T10:30:00.000Z"
    }
    
    endpoints = [
        ("bp-reading", test_data),
        ("prediction", {"prediction": "elevated", "confidence": 0.8, "timestamp": "2025-09-23T10:30:00.000Z"}),
        ("alert", {"alert_type": "High BP", "message": "Blood pressure reading is high", "severity": "high", "timestamp": "2025-09-23T10:30:00.000Z"}),
        ("status", {"status": "active", "service": "BP Monitor", "message": "Service is running", "timestamp": "2025-09-23T10:30:00.000Z"})
    ]
    
    for endpoint, data in endpoints:
        try:
            url = f"http://localhost:5174/api/webhooks/{endpoint}"
            response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ {endpoint} webhook endpoint working")
            else:
                print(f"❌ {endpoint} webhook endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Error testing {endpoint} webhook: {e}")

def check_webhook_notifications():
    """Check if notifications are being created in webhook server"""
    print("\nChecking webhook notifications...")
    
    try:
        response = requests.get("http://localhost:5174/api/notifications", timeout=5)
        if response.status_code == 200:
            data = response.json()
            notifications = data.get('notifications', [])
            print(f"✅ Found {len(notifications)} notifications in webhook server")
            
            for i, notification in enumerate(notifications[:3]):  # Show first 3
                print(f"   {i+1}. {notification.get('title')} - {notification.get('message')}")
        else:
            print(f"❌ Failed to get notifications: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking notifications: {e}")

def check_bp_microservice_webhooks():
    """Check BP microservice webhook configuration"""
    print("\nChecking BP microservice webhook configuration...")
    
    try:
        response = requests.get("http://localhost:5001/api/webhooks", timeout=5)
        if response.status_code == 200:
            data = response.json()
            endpoints = data.get('endpoints', [])
            print(f"✅ BP microservice has {len(endpoints)} webhook endpoints configured")
            
            for endpoint in endpoints:
                status = "✅ Enabled" if endpoint.get('enabled') else "❌ Disabled"
                print(f"   {endpoint.get('id')}: {endpoint.get('url')} - {status}")
                print(f"      Event types: {endpoint.get('event_types')}")
        else:
            print(f"❌ Failed to get webhook config: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking BP microservice webhooks: {e}")

if __name__ == "__main__":
    print("🔍 Testing webhook connectivity and configuration\n")
    print("=" * 60)
    
    # Test all components
    webhook_ok = test_webhook_server()
    bp_ok = test_bp_microservice()
    
    if webhook_ok and bp_ok:
        test_webhook_endpoints()
        check_webhook_notifications()
        check_bp_microservice_webhooks()
        
        print("\n" + "=" * 60)
        print("🎉 All tests completed! Check the results above.")
    else:
        print("\n" + "=" * 60)
        print("⚠️  Some services are not running. Please start them first.")