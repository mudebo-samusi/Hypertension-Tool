#!/usr/bin/env python3
"""
BP Monitor Microservice Startup Script

This script handles the startup process for the BP Monitor microservice
with proper initialization, health checks, and graceful shutdown.
"""

import os
import sys
import time
import signal
import logging
import argparse
import subprocess
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app import app, socketio, db_manager

class ServiceManager:
    def __init__(self, host='0.0.0.0', port=5001, debug=False):
        self.host = host
        self.port = port
        self.debug = debug
        self.is_running = False
        
        # Setup logging
        log_level = logging.DEBUG if debug else logging.INFO
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger('service_manager')
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.shutdown)
        signal.signal(signal.SIGTERM, self.shutdown)
    
    def pre_startup_checks(self):
        """Run pre-startup health checks"""
        self.logger.info("Running pre-startup checks...")
        
        # Check database initialization
        try:
            db_manager.init_database()
            self.logger.info("✅ Database initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ Database initialization failed: {e}")
            return False
        
        # Check port availability
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((self.host, self.port))
        sock.close()
        
        if result == 0:
            self.logger.error(f"❌ Port {self.port} is already in use")
            return False
        else:
            self.logger.info(f"✅ Port {self.port} is available")
        
        # Check required directories
        data_dir = Path("data")
        if not data_dir.exists():
            data_dir.mkdir(parents=True, exist_ok=True)
            self.logger.info("✅ Created data directory")
        
        return True
    
    def start_service(self):
        """Start the BP Monitor microservice"""
        if not self.pre_startup_checks():
            self.logger.error("Pre-startup checks failed. Exiting.")
            return False
        
        self.logger.info("🩺 Starting BP Monitor Microservice...")
        self.logger.info(f"   Host: {self.host}")
        self.logger.info(f"   Port: {self.port}")
        self.logger.info(f"   Debug: {self.debug}")
        
        try:
            self.is_running = True
            
            # Start the Flask-SocketIO server
            socketio.run(
                app,
                host=self.host,
                port=self.port,
                debug=self.debug,
                allow_unsafe_werkzeug=True,
                use_reloader=False  # Disable reloader to avoid duplicate processes
            )
            
        except Exception as e:
            self.logger.error(f"Failed to start service: {e}")
            return False
        
        return True
    
    def shutdown(self, signum=None, frame=None):
        """Gracefully shutdown the service"""
        if signum:
            self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        else:
            self.logger.info("Initiating graceful shutdown...")
        
        self.is_running = False
        
        # Add any cleanup logic here
        self.logger.info("🛑 BP Monitor Microservice stopped")
        sys.exit(0)
    
    def run_tests(self):
        """Run service tests"""
        self.logger.info("🧪 Running service tests...")
        
        try:
            # Import and run test suite
            from test_service import BPMonitorTester
            
            tester = BPMonitorTester(f"http://{self.host}:{self.port}")
            success = tester.run_comprehensive_test()
            
            if success:
                self.logger.info("✅ All tests passed!")
                return True
            else:
                self.logger.error("❌ Some tests failed!")
                return False
                
        except Exception as e:
            self.logger.error(f"Test execution failed: {e}")
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='BP Monitor Microservice Manager')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5001, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--test', action='store_true', help='Run tests instead of starting service')
    
    args = parser.parse_args()
    
    # Override with environment variables if present
    host = os.getenv('SERVICE_HOST', args.host)
    port = int(os.getenv('SERVICE_PORT', args.port))
    debug = os.getenv('DEBUG', '').lower() in ('true', '1', 'yes') or args.debug
    
    service_manager = ServiceManager(host=host, port=port, debug=debug)
    
    if args.test:
        # Run tests
        success = service_manager.run_tests()
        sys.exit(0 if success else 1)
    else:
        # Start service
        success = service_manager.start_service()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()