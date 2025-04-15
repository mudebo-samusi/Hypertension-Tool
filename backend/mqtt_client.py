import time
import paho.mqtt.client as paho
import json
import threading
import logging

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('mqtt_client')

# MQTT Configuration
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

# Timestamp of the last message (for monitoring)
last_message_received_time = time.time()

# Callback handlers (to be set by the Flask app or caller)
health_data_handler = None
prediction_handler = None

# Callback when the client connects
def on_connect(client, userdata, flags, rc, properties=None):
    logger.info(f"Connected with result code {rc}")
    if rc == 0:
        logger.info("Successfully connected to broker!")
        # Subscribe to topics with QoS 1
        client.subscribe(health_topic, qos=1)
        client.subscribe(status_topic, qos=1)
        logger.info(f"Subscribed to: {health_topic}")
        logger.info(f"Subscribed to: {status_topic}")
    else:
        logger.error(f"Failed to connect. Return code: {rc}")

# Callback when the client disconnects
def on_disconnect(client, userdata, rc, properties=None):
    # rc will be 0 if the disconnect was intentional
    if rc != 0:
        logger.warning(f"Unexpected disconnection. Return code: {rc}")
    else:
        logger.info("Client disconnected gracefully.")

# Callback when a message is published
def on_publish(client, userdata, mid, properties=None):
    logger.info(f"Message published. Message ID: {mid}")

# Callback when a subscription is acknowledged
def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    logger.info(f"Subscription confirmed. Message ID: {mid}, QoS: {granted_qos}")

# Callback when a message is received
def on_message(client, userdata, msg):
    global last_message_received_time
    last_message_received_time = time.time()  # update timestamp for monitoring
    payload_text = msg.payload.decode()
    logger.info(f"Received message on topic {msg.topic}: {payload_text}")

    # Optionally log at debug level depending on the topic
    if msg.topic == health_topic:
        logger.debug(f"Health topic data: {payload_text}")
    elif msg.topic == status_topic:
        logger.debug(f"Status topic data: {payload_text}")
    elif msg.topic == notification_topic:
        logger.debug(f"Notification topic data: {payload_text}")

    # Process messages based on topic
    if msg.topic == health_topic and health_data_handler:
        try:
            data = json.loads(payload_text)
            health_data_handler(data)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from message: {payload_text}")
        except Exception as e:
            logger.error(f"Error processing health data: {e}")
    elif msg.topic == status_topic:
        process_status_update(payload_text)
    # Optionally, add handling for prediction messages if needed

# Example function to process status updates
def process_status_update(status):
    logger.info(f"Processing status update: {status}")
    # Add custom status processing logic here

# Function to send a notification via MQTT
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

# Monitor message reception and log if none received within the interval
def monitor_message_reception(interval=30):
    def monitor():
        global last_message_received_time
        while True:
            time_since_last = time.time() - last_message_received_time
            if time_since_last > interval:
                logger.warning(f"No messages received in the last {interval} seconds.")
            time.sleep(interval)
    thread = threading.Thread(target=monitor, daemon=True)
    thread.start()

# Initialize MQTT client and assign callbacks and credentials
def initialize_mqtt_client(health_callback=None, prediction_callback=None):
    global client, health_data_handler, prediction_handler

    # Save callbacks for later use
    health_data_handler = health_callback
    prediction_handler = prediction_callback

    # Create the MQTT client with MQTT v5 protocol
    client = paho.Client(client_id=client_id, userdata=None, protocol=paho.MQTTv5)

    # Set callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_subscribe = on_subscribe
    client.on_message = on_message
    client.on_publish = on_publish

    # Set broker credentials
    client.username_pw_set(broker_username, broker_password)

    # Optionally, set will message (if needed)
    # client.will_set(topic=notification_topic, payload="Client disconnected unexpectedly", qos=1, retain=False)

    # Configure reconnect delay to avoid tight reconnect loops
    client.reconnect_delay_set(min_delay=1, max_delay=120)

    return client

# Start MQTT client in its own thread to run the loop_forever
def start_mqtt_client(health_callback=None, prediction_callback=None):
    client = initialize_mqtt_client(health_callback, prediction_callback)

    def mqtt_loop():
        try:
            logger.info(f"Connecting to {mqtt_server} on port {broker_port} with keepalive=60...")
            client.connect(mqtt_server, broker_port, keepalive=60)
            # This will block and handle reconnections automatically per reconnect_delay_set()
            client.loop_forever()
        except Exception as e:
            logger.error(f"MQTT connection failed: {e}")

    mqtt_thread = threading.Thread(target=mqtt_loop, daemon=True)
    mqtt_thread.start()

    # Start the thread that monitors message reception
    monitor_message_reception()

    return mqtt_thread

# For standalone testing, start the client
if __name__ == "__main__":
    start_mqtt_client()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Exiting MQTT client...")
