import time
import paho.mqtt.client as paho
from paho import mqtt

# MQTT Configuration from the provided details
mqtt_server = "mqtt.koinsightug.com"
broker_username = "gkfiqxkh"
broker_password = "wtc48z8dSovj"
broker_port = 1883
client_id = "HealthMonitor_001"
health_topic = "healthmon/data"
status_topic = "healthmon/status"
notification_topic = "healthmon/notifications"

# Callback for when the client receives a CONNACK response from the server
def on_connect(client, userdata, flags, rc, properties=None):
    print(f"Connected with result code {rc}")
    
    if rc == 0:
        print("Successfully connected to broker!")
        # Subscribe to all required topics
        client.subscribe(health_topic, qos=1)
        client.subscribe(status_topic, qos=1)
        print(f"Subscribed to: {health_topic}")
        print(f"Subscribed to: {status_topic}")
    else:
        print(f"Failed to connect. Return code: {rc}")

# Callback when a message is published
def on_publish(client, userdata, mid, properties=None):
    print(f"Message published. Message ID: {mid}")

# Callback when a subscription is confirmed
def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    print(f"Subscription confirmed. Message ID: {mid}, QoS: {granted_qos}")

# Callback when a message is received
def on_message(client, userdata, msg):
    print(f"Received message on topic {msg.topic}: {msg.payload.decode()}")
    
    # Example of how to process different topics
    if msg.topic == health_topic:
        process_health_data(msg.payload.decode())
    elif msg.topic == status_topic:
        process_status_update(msg.payload.decode())

# Process health data (example function)
def process_health_data(data):
    print(f"Processing health data: {data}")
    # Add your health data processing logic here

# Process status updates (example function)
def process_status_update(status):
    print(f"Processing status update: {status}")
    # Add your status update processing logic here

# Function to send notifications
def send_notification(message):
    client.publish(notification_topic, message, qos=1)
    print(f"Notification sent: {message}")

# Create MQTT client instance with MQTT v5
client = paho.Client(client_id=client_id, userdata=None, protocol=paho.MQTTv5)

# Set callbacks
client.on_connect = on_connect
client.on_subscribe = on_subscribe
client.on_message = on_message
client.on_publish = on_publish

# Set credentials
client.username_pw_set(broker_username, broker_password)

# Connect to broker
try:
    print(f"Connecting to {mqtt_server} on port {broker_port}...")
    client.connect(mqtt_server, broker_port)
    
    # Example of sending a notification after connecting
    # Uncomment to test notifications:
    # client.loop_start()
    # time.sleep(2)  # Wait for connection to establish
    # send_notification("Health Monitor client started and connected")
    
    # Start the loop to process callbacks
    print("Starting message loop...")
    client.loop_forever()
    
except Exception as e:
    print(f"Connection failed: {e}")