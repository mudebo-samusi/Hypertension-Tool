#!/usr/bin/env python3
"""
BP Monitor Service Status Checker

This script monitors the health and status of the BP Monitor microservice.
"""

import requests
import json
import time
import argparse
from datetime import datetime
import sys

class ServiceMonitor:
    def __init__(self, base_url="http://localhost:5001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        
    def check_health(self):
        """Check service health"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, f"HTTP {response.status_code}"
        except Exception as e:
            return False, str(e)
    
    def get_monitoring_status(self):
        """Get monitoring status"""
        try:
            response = requests.get(f"{self.api_url}/monitoring/status", timeout=5)
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, f"HTTP {response.status_code}"
        except Exception as e:
            return False, str(e)
    
    def get_recent_readings(self, limit=5):
        """Get recent readings"""
        try:
            response = requests.get(f"{self.api_url}/readings?limit={limit}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return True, data['readings']
            else:
                return False, f"HTTP {response.status_code}"
        except Exception as e:
            return False, str(e)
    
    def print_status(self):
        """Print comprehensive service status"""
        print("🩺 BP Monitor Microservice Status")
        print("=" * 50)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Service URL: {self.base_url}")
        print()
        
        # Health check
        health_ok, health_data = self.check_health()
        if health_ok:
            print("🟢 Service Health: HEALTHY")
            print(f"   Service: {health_data.get('service', 'N/A')}")
            print(f"   Active Connections: {health_data.get('active_connections', 0)}")
            print(f"   Monitoring Active: {health_data.get('monitoring_active', False)}")
        else:
            print("🔴 Service Health: UNHEALTHY")
            print(f"   Error: {health_data}")
            return
        
        print()
        
        # Monitoring status
        monitor_ok, monitor_data = self.get_monitoring_status()
        if monitor_ok:
            print("📊 Monitoring Status:")
            print(f"   Active: {'🟢 YES' if monitor_data.get('active', False) else '🔴 NO'}")
            print(f"   Active Connections: {monitor_data.get('active_connections', 0)}")
            print(f"   Last Update: {monitor_data.get('last_update', 'N/A')}")
        else:
            print("🔴 Monitoring Status: ERROR")
            print(f"   Error: {monitor_data}")
        
        print()
        
        # Recent readings
        readings_ok, readings_data = self.get_recent_readings()
        if readings_ok and readings_data:
            print("📈 Recent Readings:")
            for i, reading in enumerate(readings_data[:3]):
                timestamp = reading.get('timestamp', 'N/A')
                if 'T' in timestamp:
                    # Parse ISO timestamp
                    try:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        time_str = dt.strftime('%H:%M:%S')
                    except:
                        time_str = timestamp
                else:
                    time_str = timestamp
                    
                print(f"   {i+1}. {reading.get('systolic', '?')}/{reading.get('diastolic', '?')} mmHg, "
                      f"HR: {reading.get('heart_rate', '?')} bpm at {time_str}")
        else:
            print("📈 Recent Readings: No data available")
            if not readings_ok:
                print(f"   Error: {readings_data}")
        
        print()
    
    def continuous_monitor(self, interval=30):
        """Continuously monitor service"""
        print(f"Starting continuous monitoring (interval: {interval}s)")
        print("Press Ctrl+C to stop")
        print()
        
        try:
            while True:
                self.print_status()
                print("-" * 50)
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\nMonitoring stopped.")

def main():
    parser = argparse.ArgumentParser(description='Monitor BP Monitor Microservice')
    parser.add_argument('--url', default='http://localhost:5001', 
                       help='Base URL of the microservice')
    parser.add_argument('--continuous', action='store_true',
                       help='Run continuous monitoring')
    parser.add_argument('--interval', type=int, default=30,
                       help='Monitoring interval in seconds (for continuous mode)')
    
    args = parser.parse_args()
    
    monitor = ServiceMonitor(args.url)
    
    if args.continuous:
        monitor.continuous_monitor(args.interval)
    else:
        monitor.print_status()

if __name__ == "__main__":
    main()