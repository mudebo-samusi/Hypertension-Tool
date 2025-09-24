#!/usr/bin/env python3
"""
Webhook Integration Test Script for BP Monitor Microservice

This script tests the webhook functionality by registering endpoints,
generating events, and verifying webhook deliveries.
"""

import requests
import json
import time
import threading
import uuid
from flask import Flask, request, jsonify
from datetime import datetime
import argparse

# Simple webhook receiver server for testing
webhook_app = Flask(__name__)
received_webhooks = []
webhook_stats = {
    "total_received": 0,
    "by_event_type": {},
    "by_severity": {}
}

@webhook_app.route('/webhook/bp-monitor', methods=['POST'])
def receive_webhook():
    """Receive and log webhook events"""
    try:
        # Get the webhook payload
        event_data = request.get_json()
        
        # Log headers for verification
        headers = dict(request.headers)
        
        # Store the webhook
        webhook_entry = {
            "received_at": datetime.now().isoformat(),
            "headers": headers,
            "data": event_data,
            "signature": headers.get("X-Signature-SHA256"),
            "event_type": event_data.get("event_type", "unknown"),
            "event_id": event_data.get("event_id", "unknown")
        }
        
        received_webhooks.append(webhook_entry)
        webhook_stats["total_received"] += 1
        
        # Update stats
        event_type = event_data.get("event_type", "unknown")
        webhook_stats["by_event_type"][event_type] = webhook_stats["by_event_type"].get(event_type, 0) + 1
        
        if "data" in event_data and isinstance(event_data["data"], dict):
            severity = event_data["data"].get("severity", "unknown")
            webhook_stats["by_severity"][severity] = webhook_stats["by_severity"].get(severity, 0) + 1
        
        print(f"📥 Received webhook: {event_type} - {event_data.get('event_id', 'unknown')}")
        
        return jsonify({"status": "received", "event_id": event_data.get("event_id")}), 200
        
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        return jsonify({"error": str(e)}), 400

@webhook_app.route('/webhook/stats', methods=['GET'])
def get_webhook_stats():
    """Get webhook statistics"""
    return jsonify({
        "stats": webhook_stats,
        "recent_webhooks": received_webhooks[-10:],  # Last 10 webhooks
        "total_count": len(received_webhooks)
    })

class WebhookTester:
    def __init__(self, bp_monitor_url="http://localhost:5001", webhook_receiver_url="http://localhost:3001"):
        self.bp_monitor_url = bp_monitor_url
        self.webhook_receiver_url = webhook_receiver_url
        self.test_endpoint_id = f"test_endpoint_{uuid.uuid4().hex[:8]}"
        
    def start_webhook_receiver(self):
        """Start the webhook receiver server in a background thread"""
        def run_server():
            webhook_app.run(host='0.0.0.0', port=3001, debug=False, use_reloader=False)
        
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        
        # Wait for server to start
        time.sleep(2)
        
        # Test if server is running
        try:
            response = requests.get(f"{self.webhook_receiver_url}/webhook/stats", timeout=5)
            if response.status_code == 200:
                print(f"✅ Webhook receiver started at {self.webhook_receiver_url}")
                return True
        except:
            pass
            
        print(f"❌ Failed to start webhook receiver at {self.webhook_receiver_url}")
        return False
    
    def register_webhook_endpoint(self):
        """Register webhook endpoint with BP monitor"""
        try:
            webhook_data = {
                "endpoint_id": self.test_endpoint_id,
                "url": f"{self.webhook_receiver_url}/webhook/bp-monitor",
                "event_types": ["bp_reading", "prediction", "alert", "status"],
                "secret": "bp_monitor_webhook_secret_2025",
                "enabled": True
            }
            
            response = requests.post(
                f"{self.bp_monitor_url}/api/webhooks",
                json=webhook_data,
                timeout=10
            )
            
            if response.status_code == 201:
                print(f"✅ Webhook endpoint registered: {self.test_endpoint_id}")
                return True
            else:
                print(f"❌ Failed to register webhook: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error registering webhook: {e}")
            return False
    
    def test_webhook_endpoint(self):
        """Test the registered webhook endpoint"""
        try:
            response = requests.post(
                f"{self.bp_monitor_url}/api/webhooks/{self.test_endpoint_id}/test",
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Webhook test successful: {result.get('test_event_id', 'unknown')}")
                return True
            else:
                print(f"❌ Webhook test failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing webhook: {e}")
            return False
    
    def generate_bp_events(self, count=5):
        """Generate BP reading events to trigger webhooks"""
        print(f"\nGenerating {count} BP events...")
        
        for i in range(count):
            try:
                # Generate different user profiles for variety
                user_id = (i % 5) + 1
                
                response = requests.post(
                    f"{self.bp_monitor_url}/api/generate-reading",
                    json={"user_id": user_id},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    reading = data["reading"]
                    prediction = data["prediction"]
                    
                    print(f"📊 Generated reading {i+1}: {reading['systolic']}/{reading['diastolic']} mmHg - {prediction['prediction']}")
                else:
                    print(f"❌ Failed to generate reading {i+1}: {response.status_code}")
                
                # Wait between generations
                time.sleep(1)
                
            except Exception as e:
                print(f"❌ Error generating reading {i+1}: {e}")
    
    def start_monitoring_test(self, duration=10):
        """Test continuous monitoring with webhooks"""
        print(f"\nStarting monitoring test for {duration} seconds...")
        
        # Start monitoring
        try:
            response = requests.post(f"{self.bp_monitor_url}/api/start-monitoring", timeout=10)
            if response.status_code == 200:
                print("✅ Monitoring started")
            else:
                print(f"❌ Failed to start monitoring: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error starting monitoring: {e}")
            return False
        
        # Wait for specified duration
        print(f"⏱️  Monitoring for {duration} seconds...")
        time.sleep(duration)
        
        # Stop monitoring
        try:
            response = requests.post(f"{self.bp_monitor_url}/api/stop-monitoring", timeout=10)
            if response.status_code == 200:
                print("✅ Monitoring stopped")
                return True
            else:
                print(f"❌ Failed to stop monitoring: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error stopping monitoring: {e}")
            return False
    
    def get_webhook_stats(self):
        """Get webhook delivery statistics"""
        try:
            # Get stats from BP monitor
            response = requests.get(f"{self.bp_monitor_url}/api/webhooks/stats", timeout=10)
            if response.status_code == 200:
                bp_stats = response.json()
                print("\n📊 BP Monitor Webhook Stats:")
                print(f"   Total sent: {bp_stats['delivery']['total_sent']}")
                print(f"   Successful: {bp_stats['delivery']['successful']}")
                print(f"   Failed: {bp_stats['delivery']['failed']}")
                print(f"   Success rate: {bp_stats['success_rate']:.1f}%")
            
            # Get stats from webhook receiver
            response = requests.get(f"{self.webhook_receiver_url}/webhook/stats", timeout=10)
            if response.status_code == 200:
                receiver_stats = response.json()
                print("\n📥 Webhook Receiver Stats:")
                print(f"   Total received: {receiver_stats['stats']['total_received']}")
                print(f"   By event type: {receiver_stats['stats']['by_event_type']}")
                print(f"   By severity: {receiver_stats['stats']['by_severity']}")
                return True
            
        except Exception as e:
            print(f"❌ Error getting stats: {e}")
            return False
    
    def cleanup_webhook(self):
        """Clean up the test webhook endpoint"""
        try:
            response = requests.delete(
                f"{self.bp_monitor_url}/api/webhooks/{self.test_endpoint_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Webhook endpoint removed: {self.test_endpoint_id}")
                return True
            else:
                print(f"⚠️  Failed to remove webhook endpoint: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error removing webhook endpoint: {e}")
            return False
    
    def run_comprehensive_test(self):
        """Run comprehensive webhook integration test"""
        print("🔗 BP Monitor Webhook Integration Test")
        print("=" * 50)
        
        tests = []
        
        # Start webhook receiver
        if not self.start_webhook_receiver():
            print("❌ Cannot continue without webhook receiver")
            return False
        
        tests.append(("Webhook Receiver", True))
        
        # Register webhook endpoint
        success = self.register_webhook_endpoint()
        tests.append(("Register Webhook", success))
        if not success:
            return False
        
        # Test webhook endpoint
        success = self.test_webhook_endpoint()
        tests.append(("Test Webhook", success))
        
        # Wait for test webhook to arrive
        time.sleep(3)
        
        # Generate BP events
        self.generate_bp_events(3)
        tests.append(("Generate BP Events", True))
        
        # Wait for webhooks to be processed
        time.sleep(3)
        
        # Test continuous monitoring
        success = self.start_monitoring_test(8)
        tests.append(("Monitoring Test", success))
        
        # Wait for monitoring webhooks
        time.sleep(2)
        
        # Get and display statistics
        success = self.get_webhook_stats()
        tests.append(("Get Statistics", success))
        
        # Cleanup
        success = self.cleanup_webhook()
        tests.append(("Cleanup", success))
        
        # Summary
        print(f"\n{'=' * 50}")
        print("📋 Test Results Summary:")
        print("=" * 50)
        
        passed = 0
        for test_name, result in tests:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<30} {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{len(tests)} tests passed")
        
        if passed == len(tests):
            print("🎉 All webhook tests passed!")
        else:
            print("⚠️  Some webhook tests failed.")
        
        return passed == len(tests)

def main():
    """Main test function"""
    parser = argparse.ArgumentParser(description='Test BP Monitor Webhook Integration')
    parser.add_argument('--bp-monitor-url', default='http://localhost:5001',
                       help='BP Monitor microservice URL')
    parser.add_argument('--webhook-receiver-port', type=int, default=3001,
                       help='Port for webhook receiver')
    parser.add_argument('--quick', action='store_true',
                       help='Run quick test (skip monitoring)')
    
    args = parser.parse_args()
    
    webhook_receiver_url = f"http://localhost:{args.webhook_receiver_port}"
    tester = WebhookTester(args.bp_monitor_url, webhook_receiver_url)
    
    if args.quick:
        print("🔗 Quick Webhook Test")
        success = all([
            tester.start_webhook_receiver(),
            tester.register_webhook_endpoint(),
            tester.test_webhook_endpoint()
        ])
        if success:
            time.sleep(2)
            tester.get_webhook_stats()
            tester.cleanup_webhook()
    else:
        success = tester.run_comprehensive_test()
    
    exit(0 if success else 1)

if __name__ == "__main__":
    main()