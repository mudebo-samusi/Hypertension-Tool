import time
import paho.mqtt.client as paho
from paho import mqtt
import json
import threading
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('mqtt_client')

# MQTT Configuration from the provided details
mqtt_server = "mqtt.koinsightug.com"
broker_username = "gkfiqxkh"
broker_password = "wtc48z8dSovj"
broker_port = 1883
client_id = "HealthMonitor_001"
health_topic = "healthmon/data"
status_topic = "healthmon/status"
notification_topic = "healthmon/notifications"

# Global client variable
client = None

# Callback handlers (will be set by the Flask app)
health_data_handler = None
prediction_handler = None

# Callback for when the client receives a CONNACK response from the server
def on_connect(client, userdata, flags, rc, properties=None):
    logger.info(f"Connected with result code {rc}")
    
    if rc == 0:
        logger.info("Successfully connected to broker!")
        # Subscribe to all required topics
        client.subscribe(health_topic, qos=1)
        client.subscribe(status_topic, qos=1)
        logger.info(f"Subscribed to: {health_topic}")
        logger.info(f"Subscribed to: {status_topic}")
    else:
        logger.error(f"Failed to connect. Return code: {rc}")

# Callback when a message is published
def on_publish(client, userdata, mid, properties=None):
    logger.info(f"Message published. Message ID: {mid}")

# Callback when a subscription is confirmed
def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    logger.info(f"Subscription confirmed. Message ID: {mid}, QoS: {granted_qos}")

# Callback when a message is received
def on_message(client, userdata, msg):
    logger.info(f"Received message on topic {msg.topic}: {msg.payload.decode()}")
    
    # Process different topics
    if msg.topic == health_topic and health_data_handler:
        try:
            data = json.loads(msg.payload.decode())
            health_data_handler(data)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from message: {msg.payload.decode()}")
        except Exception as e:
            logger.error(f"Error processing health data: {e}")
    elif msg.topic == status_topic:
        process_status_update(msg.payload.decode())

# Process status updates (example function)
def process_status_update(status):
    logger.info(f"Processing status update: {status}")
    # Add your status update processing logic here

# Function to send notifications
def send_notification(message):
    if client and client.is_connected():
        if isinstance(message, dict):
            message = json.dumps(message)
        client.publish(notification_topic, message, qos=1)
        logger.info(f"Notification sent: {message}")
    else:
        logger.error("Cannot send notification: MQTT client not connected")

# Function to send prediction results via MQTT
def send_prediction_result(prediction_data):
    if client and client.is_connected():
        try:
            message = json.dumps(prediction_data)
            client.publish(notification_topic, message, qos=1)
            logger.info(f"Prediction result sent: {message}")
        except Exception as e:
            logger.error(f"Error sending prediction result: {e}")
    else:
        logger.error("Cannot send prediction: MQTT client not connected")

# Initialize the MQTT client
def initialize_mqtt_client(health_callback=None, prediction_callback=None):
    global client, health_data_handler, prediction_handler
    
    # Store the callbacks
    health_data_handler = health_callback
    prediction_handler = prediction_callback
    
    # Create MQTT client instance with MQTT v5
    client = paho.Client(client_id=client_id, userdata=None, protocol=paho.MQTTv5)
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_subscribe = on_subscribe
    client.on_message = on_message
    client.on_publish = on_publish
    
    # Set credentials
    client.username_pw_set(broker_username, broker_password)
    
    return client

# Start MQTT client in a separate thread
def start_mqtt_client(health_callback=None, prediction_callback=None):
    client = initialize_mqtt_client(health_callback, prediction_callback)
    
    # Connect to broker
    def mqtt_loop():
        try:
            logger.info(f"Connecting to {mqtt_server} on port {broker_port}...")
            client.connect(mqtt_server, broker_port)
            client.loop_forever()
        except Exception as e:
            logger.error(f"MQTT connection failed: {e}")
    
    # Start in a new thread
    mqtt_thread = threading.Thread(target=mqtt_loop, daemon=True)
    mqtt_thread.start()
    
    return mqtt_thread

# For standalone usage
if __name__ == "__main__":
    start_mqtt_client()
    
    # Keep the main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Exiting...")