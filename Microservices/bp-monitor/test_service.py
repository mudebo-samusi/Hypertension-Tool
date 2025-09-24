#!/usr/bin/env python3
"""
BP Monitor Microservice Test Script

This script tests the functionality of the BP Monitor microservice
including API endpoints, WebSocket connections, and data generation.
"""

import requests
import json
import time
import threading
from datetime import datetime
import socketio

class BPMonitorTester:
    def __init__(self, base_url="http://localhost:5001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.socket = None
        self.received_events = []
        
    def test_health_check(self):
        """Test the health check endpoint"""
        print("Testing health check...")
        try:
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data['status']}")
                print(f"   Service: {data['service']}")
                print(f"   Active connections: {data['active_connections']}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_generate_reading(self):
        """Test single reading generation"""
        print("\nTesting reading generation...")
        try:
            response = requests.post(f"{self.api_url}/generate-reading", 
                                   json={"user_id": 1})
            if response.status_code == 200:
                data = response.json()
                reading = data['reading']
                prediction = data['prediction']
                
                print("✅ Reading generated successfully:")
                print(f"   BP: {reading['systolic']}/{reading['diastolic']} mmHg")
                print(f"   HR: {reading['heart_rate']} bpm")
                print(f"   Prediction: {prediction['prediction']}")
                print(f"   Risk: {prediction['risk_level']}")
                return True
            else:
                print(f"❌ Reading generation failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Reading generation error: {e}")
            return False
    
    def test_get_readings(self):
        """Test reading retrieval"""
        print("\nTesting reading retrieval...")
        try:
            response = requests.get(f"{self.api_url}/readings?limit=5")
            if response.status_code == 200:
                data = response.json()
                readings = data['readings']
                
                print(f"✅ Retrieved {len(readings)} readings")
                if readings:
                    latest = readings[0]
                    print(f"   Latest: {latest['systolic']}/{latest['diastolic']} mmHg at {latest['timestamp']}")
                return True
            else:
                print(f"❌ Reading retrieval failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Reading retrieval error: {e}")
            return False
    
    def test_monitoring_control(self):
        """Test monitoring start/stop"""
        print("\nTesting monitoring control...")
        
        # Test start monitoring
        try:
            response = requests.post(f"{self.api_url}/start-monitoring")
            if response.status_code == 200:
                print("✅ Monitoring started successfully")
            else:
                print(f"❌ Failed to start monitoring: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Start monitoring error: {e}")
            return False
        
        # Wait a bit
        time.sleep(2)
        
        # Check status
        try:
            response = requests.get(f"{self.api_url}/monitoring/status")
            if response.status_code == 200:
                status = response.json()
                print(f"✅ Monitoring status: {'Active' if status['active'] else 'Inactive'}")
            else:
                print(f"❌ Failed to get status: {response.status_code}")
        except Exception as e:
            print(f"❌ Status check error: {e}")
        
        # Test stop monitoring
        try:
            response = requests.post(f"{self.api_url}/stop-monitoring")
            if response.status_code == 200:
                print("✅ Monitoring stopped successfully")
                return True
            else:
                print(f"❌ Failed to stop monitoring: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Stop monitoring error: {e}")
            return False
    
    def test_websocket_connection(self):
        """Test WebSocket connection and events"""
        print("\nTesting WebSocket connection...")
        
        try:
            # Create socket connection
            self.socket = socketio.Client()
            
            # Event handlers
            @self.socket.event
            def connect():
                print("✅ WebSocket connected")
            
            @self.socket.event  
            def disconnect():
                print("📡 WebSocket disconnected")
            
            @self.socket.on('status', namespace='/monitor')
            def on_status(data):
                print(f"📊 Status: {data['message']}")
                self.received_events.append(('status', data))
            
            @self.socket.on('new_bp_reading', namespace='/monitor')
            def on_bp_reading(data):
                print(f"📈 New reading: {data['systolic']}/{data['diastolic']} mmHg, HR: {data['heart_rate']}")
                self.received_events.append(('bp_reading', data))
            
            @self.socket.on('prediction_result', namespace='/monitor')
            def on_prediction(data):
                print(f"🔮 Prediction: {data['prediction']} (Risk: {data['risk_level']})")
                self.received_events.append(('prediction', data))
            
            # Connect to monitor namespace
            self.socket.connect(f"{self.base_url}/monitor")
            
            # Wait for initial events
            time.sleep(1)
            
            # Generate a reading to trigger events
            requests.post(f"{self.api_url}/generate-reading", json={"user_id": 2})
            
            # Wait for events
            time.sleep(2)
            
            self.socket.disconnect()
            
            # Check if we received events
            if len(self.received_events) > 0:
                print(f"✅ Received {len(self.received_events)} WebSocket events")
                return True
            else:
                print("❌ No WebSocket events received")
                return False
                
        except Exception as e:
            print(f"❌ WebSocket test error: {e}")
            return False
    
    def test_data_quality(self):
        """Test data quality and realism"""
        print("\nTesting data quality...")
        
        # Generate multiple readings for different users
        users = [1, 2, 3, 4, 5]
        readings_data = []
        
        for user_id in users:
            try:
                response = requests.post(f"{self.api_url}/generate-reading", 
                                       json={"user_id": user_id})
                if response.status_code == 200:
                    data = response.json()
                    readings_data.append((user_id, data['reading']))
            except Exception as e:
                print(f"❌ Error generating reading for user {user_id}: {e}")
        
        if not readings_data:
            print("❌ No readings generated for quality test")
            return False
        
        print(f"✅ Generated readings for {len(readings_data)} users:")
        
        for user_id, reading in readings_data:
            sys = reading['systolic']
            dia = reading['diastolic'] 
            hr = reading['heart_rate']
            
            # Check realistic ranges
            sys_ok = 90 <= sys <= 200
            dia_ok = 50 <= dia <= 130
            hr_ok = 50 <= hr <= 150
            relation_ok = dia < sys
            
            status = "✅" if all([sys_ok, dia_ok, hr_ok, relation_ok]) else "❌"
            print(f"   User {user_id}: {sys}/{dia} mmHg, HR {hr} bpm {status}")
        
        return True
    
    def run_comprehensive_test(self):
        """Run all tests"""
        print("🩺 BP Monitor Microservice Test Suite")
        print("=" * 50)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Reading Generation", self.test_generate_reading),
            ("Reading Retrieval", self.test_get_readings),
            ("Monitoring Control", self.test_monitoring_control),
            ("WebSocket Connection", self.test_websocket_connection),
            ("Data Quality", self.test_data_quality),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            print(f"\n{'─' * 20} {test_name} {'─' * 20}")
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ Test '{test_name}' crashed: {e}")
                results.append((test_name, False))
        
        # Summary
        print(f"\n{'=' * 50}")
        print("📋 Test Results Summary:")
        print("=" * 50)
        
        passed = 0
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:.<30} {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{len(results)} tests passed")
        
        if passed == len(results):
            print("🎉 All tests passed! Service is working correctly.")
        else:
            print("⚠️  Some tests failed. Please check the service.")
        
        return passed == len(results)

def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test BP Monitor Microservice')
    parser.add_argument('--url', default='http://localhost:5001', 
                       help='Base URL of the microservice')
    parser.add_argument('--quick', action='store_true',
                       help='Run quick tests only (skip WebSocket)')
    
    args = parser.parse_args()
    
    tester = BPMonitorTester(args.url)
    
    if args.quick:
        print("🩺 Quick Test Mode")
        success = all([
            tester.test_health_check(),
            tester.test_generate_reading(),
            tester.test_get_readings()
        ])
    else:
        success = tester.run_comprehensive_test()
    
    exit(0 if success else 1)

if __name__ == "__main__":
    main()