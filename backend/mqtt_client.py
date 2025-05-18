import time
import json
import threading
import logging
import paho.mqtt.client as paho
import uuid
import socket

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('mqtt_client')

class MqttClient:
    def __init__(self, server, port, username, password, client_id, topics, keepalive=60):
        self.server = server
        self.port = port
        self.username = username
        self.password = password
        # Generate a unique client ID using the base ID + hostname + uuid
        self.client_id = f"{client_id}_{socket.gethostname()}_{uuid.uuid4().hex[:8]}"
        self.topics = topics
        self.keepalive = keepalive
        self.client = None
        self.last_message_received_time = time.time()
        self.health_data_handler = None
        self.prediction_handler = None
        self.connected = False
        self.reconnect_count = 0
        self.max_reconnect = 10

    def initialize_client(self):
        # Use clean_start=True instead of clean_session for MQTT v5
        self.client = paho.Client(client_id=self.client_id, protocol=paho.MQTTv5)
        # Set clean start property for MQTT v5
        self.client.clean_start = True
        self.client.username_pw_set(self.username, self.password)
        
        # Configure client with additional settings
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        self.client.on_publish = self.on_publish
        self.client.on_subscribe = self.on_subscribe
        
        # Set up a will message to notify if client disconnects unexpectedly
        will_msg = json.dumps({"status": "offline", "client_id": self.client_id})
        self.client.will_set(f"{self.topics['status']}/lwt", will_msg, qos=1, retain=True)
        
        # Configure reconnection parameters
        self.client.reconnect_delay_set(min_delay=5, max_delay=120)

    def on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            logger.info(f"Connected to MQTT broker with client ID: {self.client_id}")
            self.connected = True
            self.reconnect_count = 0
            
            # Publish online status
            try:
                status_msg = json.dumps({"status": "online", "client_id": self.client_id})
                client.publish(f"{self.topics['status']}/presence", status_msg, qos=1, retain=True)
            except Exception as e:
                logger.error(f"Failed to publish status message: {e}")
            
            # Subscribe to topics
            for topic_name, topic_path in self.topics.items():
                client.subscribe(topic_path, qos=1)
                logger.info(f"Subscribed to topic: {topic_path}")
        else:
            error_message = {
                1: "Connection refused - incorrect protocol version",
                2: "Connection refused - invalid client identifier",
                3: "Connection refused - server unavailable",
                4: "Connection refused - bad username or password",
                5: "Connection refused - not authorised",
                6: "Connection refused - not yet available",
                7: "Connection refused - server unavailable"
            }.get(rc, f"Unknown error code: {rc}")
            
            logger.error(f"Failed to connect to MQTT broker. {error_message}")
            self.connected = False

    def on_disconnect(self, client, userdata, rc, properties=None):
        self.connected = False
        if rc != 0:
            logger.warning(f"Unexpected disconnection. Return code: {rc}")
            if rc == 7:
                logger.warning("Not authorized. This could be due to multiple clients using same ID.")
                # Regenerate client ID
                self.client_id = f"{self.client_id.split('_')[0]}_{socket.gethostname()}_{uuid.uuid4().hex[:8]}"
                logger.info(f"Generated new client ID: {self.client_id}")
                # Reinitialize client with new ID
                self.initialize_client()
            elif rc == paho.MQTT_ERR_CONN_LOST:
                logger.warning("Connection lost. Attempting to reconnect...")
            elif rc == paho.MQTT_ERR_NO_CONN:
                logger.warning("No connection. Retrying...")
        else:
            logger.info("Disconnected gracefully.")
        
        # Attempt to reconnect - only if unexpected disconnection
        if rc != 0 and self.reconnect_count < self.max_reconnect:
            self.reconnect_count += 1
            try:
                logger.info(f"Attempting to reconnect (attempt {self.reconnect_count} of {self.max_reconnect})...")
                time.sleep(min(self.reconnect_count * 2, 30))  # Exponential backoff
                client.reconnect()
            except Exception as e:
                logger.error(f"Reconnection failed: {e}")

    def on_message(self, client, userdata, msg):
        self.last_message_received_time = time.time()
        payload_text = msg.payload.decode()
        logger.info(f"Message received on {msg.topic}: {payload_text}")
        try:
            if msg.topic == self.topics['health'] and self.health_data_handler:
                self.health_data_handler(json.loads(payload_text))
            elif msg.topic == self.topics['status']:
                self.process_status_update(payload_text)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON payload: {payload_text}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")

    def on_publish(self, client, userdata, mid, properties=None):
        logger.info(f"Message published. ID: {mid}")

    def on_subscribe(self, client, userdata, mid, granted_qos, properties=None):
        logger.info(f"Subscription confirmed. ID: {mid}, QoS: {granted_qos}")

    def process_status_update(self, status):
        logger.info(f"Processing status update: {status}")

    def send_message(self, topic, message):
        try:
            if not self.client:
                logger.error("MQTT client not initialized")
                return False
                
            if not self.connected:
                logger.warning("MQTT client not connected, attempting to initialize")
                self.initialize_client()
                return False
                
            if isinstance(message, dict):
                message = json.dumps(message)
            result = self.client.publish(topic, message, qos=1)
            if result.rc == 0:
                logger.info(f"Message sent to {topic}: {message}")
                return True
            else:
                logger.error(f"Failed to send message. Error code: {result.rc}")
                return False
        except Exception as e:
            logger.error(f"Exception while sending message: {e}")
            return False

    def send_notification(self, data):
        """Send a notification to the notifications topic"""
        if isinstance(data, dict):
            data["timestamp"] = time.time()
            data["type"] = "notification"
        return self.send_message(self.topics.get('notifications', 'healthmon/notifications'), data)
    
    def send_prediction_result(self, prediction_data):
        """Send prediction results to the notifications topic"""
        if isinstance(prediction_data, dict):
            prediction_data["timestamp"] = time.time()
            prediction_data["type"] = "prediction"
        return self.send_message(self.topics.get('notifications', 'healthmon/notifications'), prediction_data)

    def monitor_connection(self, interval=30):
        def monitor():
            while True:
                time_since_last = time.time() - self.last_message_received_time
                if time_since_last > interval:
                    logger.warning(f"No messages received in the last {interval} seconds.")
                time.sleep(interval)
        threading.Thread(target=monitor, daemon=True).start()

    def start(self, health_callback=None, prediction_callback=None):
        self.health_data_handler = health_callback
        self.prediction_handler = prediction_callback
        self.initialize_client()

        def mqtt_loop():
            try:
                logger.info(f"Connecting to {self.server}:{self.port} with keepalive={self.keepalive}...")
                self.client.connect(self.server, self.port, keepalive=self.keepalive)
                self.client.loop_forever(retry_first_connection=True)
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
                time.sleep(5)  # Wait before retrying
                self.start(health_callback, prediction_callback)  # Retry connection

        threading.Thread(target=mqtt_loop, daemon=True).start()
        self.monitor_connection()

# Fix the start_mqtt_client function to ensure proper registration of callbacks
def start_mqtt_client(health_callback=None, prediction_callback=None):
    """Initialize and start the MQTT client with the given callbacks"""
    global mqtt_client_instance
    
    # Create a singleton instance
    if 'mqtt_client_instance' not in globals() or mqtt_client_instance is None:
        # Log to show this is being called
        logger.info("Initializing MQTT client singleton instance")
        
        mqtt_client_instance = MqttClient(
            server="mqtt.koinsightug.com",
            port=1883,
            username="gkfiqxkh",
            password="wtc48z8dSovj",
            client_id="HealthMonitor",
            topics={
                "health": "healthmon/data",
                "status": "healthmon/status",
                "notifications": "healthmon/notifications"
            },
            keepalive=120  # Increased keepalive to 120 seconds
        )
        
        # Test publish to verify connectivity when initializing
        mqtt_client_instance.initialize_client()
        test_health_data = {
            "systolic": 120,
            "diastolic": 80,
            "heart_rate": 70,
            "timestamp": time.time(),
            "source": "system_test"
        }
        
        # Start the client with callbacks
        logger.info(f"Starting MQTT client with registered callback: {'Yes' if health_callback else 'No'}")
        mqtt_client_instance.start(health_callback=health_callback, prediction_callback=prediction_callback)
        
        # Publish test message after delay to allow connection to establish
        def publish_test():
            time.sleep(5)  # Wait for connection to establish
            if mqtt_client_instance.connected:
                logger.info("Publishing test health data message")
                mqtt_client_instance.send_message("healthmon/data", test_health_data)
        
        # Start the test publisher in a separate thread
        threading.Thread(target=publish_test, daemon=True).start()
    
    return mqtt_client_instance

# Module-level functions to access the singleton instance
def send_notification(data):
    """Send notification via the MQTT client singleton instance"""
    if 'mqtt_client_instance' not in globals() or mqtt_client_instance is None:
        logger.error("MQTT client is not initialized. Call start_mqtt_client first.")
        return False
    return mqtt_client_instance.send_notification(data)

def send_prediction_result(prediction_data):
    """Send prediction results via the MQTT client singleton instance"""
    if 'mqtt_client_instance' not in globals() or mqtt_client_instance is None:
        logger.error("MQTT client is not initialized. Call start_mqtt_client first.")
        return False
    return mqtt_client_instance.send_prediction_result(prediction_data)

def send_message(topic, message):
    """Send a message to a specific topic via the MQTT client singleton instance"""
    if 'mqtt_client_instance' not in globals() or mqtt_client_instance is None:
        logger.error("MQTT client is not initialized. Call start_mqtt_client first.")
        return False
    return mqtt_client_instance.send_message(topic, message)

def get_client_instance():
    """Get the MQTT client singleton instance"""
    if 'mqtt_client_instance' not in globals() or mqtt_client_instance is None:
        logger.warning("MQTT client is not initialized. Returning None.")
    return mqtt_client_instance

# Singleton instance
mqtt_client_instance = None

# Example usage
if __name__ == "__main__":
    topics = {
        "health": "healthmon/data",
        "status": "healthmon/status",
        "notifications": "healthmon/notifications"
    }
    mqtt_client = MqttClient(
        server="mqtt.koinsightug.com",
        port=1883,
        username="gkfiqxkh",
        password="wtc48z8dSovj",
        client_id="HealthMonitor",
        topics=topics
    )
    mqtt_client.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Exiting MQTT client...")
