import { useState, useCallback } from 'react';

// Webhook event types
export const WEBHOOK_EVENTS = {
  BP_READING: 'bp_reading',
  PREDICTION: 'prediction', 
  ALERT: 'alert',
  STATUS: 'status'
};

// Hook for managing webhook notifications
export const useWebhookNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isListening, setIsListening] = useState(false);
  
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const addNotification = useCallback((notification) => {
    const newNotification = {
      ...notification,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    
    // Auto-remove non-critical notifications after 10 seconds
    if (notification.severity !== 'critical' && notification.severity !== 'high') {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 10000);
    }
  }, [removeNotification]);
  
  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);
  
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);
  
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);
  
  return {
    notifications,
    isListening,
    setIsListening,
    addNotification,
    removeNotification,
    markAsRead,
    clearAll,
    getUnreadCount
  };
};

// Webhook event processor
export class WebhookEventProcessor {
  constructor(onNotification) {
    this.onNotification = onNotification;
    this.eventHandlers = {
      [WEBHOOK_EVENTS.BP_READING]: this.handleBPReading.bind(this),
      [WEBHOOK_EVENTS.PREDICTION]: this.handlePrediction.bind(this),
      [WEBHOOK_EVENTS.ALERT]: this.handleAlert.bind(this),
      [WEBHOOK_EVENTS.STATUS]: this.handleStatus.bind(this)
    };
  }
  
  processEvent(webhookEvent) {
    try {
      const { event_type, data, timestamp, event_id } = webhookEvent;
      
      if (this.eventHandlers[event_type]) {
        this.eventHandlers[event_type](data, timestamp, event_id);
      } else {
        console.warn('Unknown webhook event type:', event_type);
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }
  
  handleBPReading(data, timestamp, eventId) {
    const { reading, severity } = data;
    
    let title = 'New BP Reading';
    let level = 'info';
    
    if (severity === 'critical') {
      title = '🚨 Critical BP Reading';
      level = 'error';
    } else if (severity === 'high') {
      title = '⚠️ High BP Reading';
      level = 'warning';
    }
    
    this.onNotification({
      title,
      message: `BP: ${reading.systolic}/${reading.diastolic} mmHg, HR: ${reading.heart_rate} bpm`,
      level,
      severity,
      eventType: WEBHOOK_EVENTS.BP_READING,
      eventId,
      timestamp,
      data: { reading }
    });
  }
  
  handlePrediction(data, timestamp, eventId) {
    const { prediction, alert_level } = data;
    
    let title = '🔮 BP Prediction';
    let level = 'info';
    
    if (alert_level === 'high') {
      title = '🚨 High Risk Prediction';
      level = 'error';
    } else if (alert_level === 'medium') {
      title = '⚠️ Moderate Risk Prediction';
      level = 'warning';
    }
    
    this.onNotification({
      title,
      message: `${prediction.prediction} (${prediction.risk_level} risk)`,
      level,
      severity: alert_level,
      eventType: WEBHOOK_EVENTS.PREDICTION,
      eventId,
      timestamp,
      data: { prediction }
    });
  }
  
  handleAlert(data, timestamp, eventId) {
    const { alert_type, message, severity, additional_data } = data;
    
    let title = '📢 System Alert';
    let level = 'warning';
    
    if (severity === 'critical') {
      title = '🚨 Critical Alert';
      level = 'error';
    } else if (severity === 'high') {
      title = '⚠️ High Priority Alert';
      level = 'error';
    }
    
    this.onNotification({
      title,
      message,
      level,
      severity,
      eventType: WEBHOOK_EVENTS.ALERT,
      eventId,
      timestamp,
      data: { alert_type, additional_data }
    });
  }
  
  handleStatus(data, timestamp, eventId) {
    const { status, message } = data;
    
    let title = '📊 Status Update';
    let level = 'info';
    
    if (status.includes('error') || status.includes('failed')) {
      level = 'error';
      title = '❌ Service Error';
    } else if (status.includes('warning')) {
      level = 'warning';
      title = '⚠️ Service Warning';
    }
    
    this.onNotification({
      title,
      message,
      level,
      severity: 'low',
      eventType: WEBHOOK_EVENTS.STATUS,
      eventId,
      timestamp,
      data: { status }
    });
  }
}

// Webhook signature verification (simplified for browser environment)
export const verifyWebhookSignature = async (payload, signature, secret) => {
  if (!signature || !secret) return false;
  
  try {
    // Use Web Crypto API for browser compatibility
    if (!window.crypto || !window.crypto.subtle) {
      console.warn('Web Crypto API not available, skipping signature verification');
      return true; // Allow through if crypto not available
    }
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureArrayBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureArrayBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return expectedSignature === providedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// BP Monitor webhook client for frontend
export class BPMonitorWebhookClient {
  constructor(baseUrl = 'http://localhost:5001', onNotification = null) {
    this.baseUrl = baseUrl;
    this.onNotification = onNotification;
    this.eventProcessor = new WebhookEventProcessor(onNotification);
    this.eventSource = null;
    this.isConnected = false;
  }
  
  // Connect to webhook events via Socket.IO (since SSE is not implemented)
  connect() {
    try {
      if (this.isConnected) {
        return;
      }
      
      // Import socket service dynamically to avoid circular dependencies
      import('./socket').then(({ getMonitorSocketSync, initializeSocket }) => {
        // Try to get existing socket first
        let socket = getMonitorSocketSync();
        
        if (!socket) {
          // If no socket exists, initialize one
          initializeSocket('monitor').then(newSocket => {
            if (newSocket) {
              this.setupSocketListeners(newSocket);
            }
          });
        } else {
          this.setupSocketListeners(socket);
        }
      }).catch(error => {
        console.error('Failed to import socket service:', error);
      });
      
    } catch (error) {
      console.error('Failed to connect to webhook events:', error);
    }
  }
  
  setupSocketListeners(socket) {
    console.log('Setting up webhook client socket listeners');
    
    socket.on('new_bp_reading', (data) => {
      console.log('Webhook client received BP reading:', data);
      this.handleBPReadingEvent(data);
    });
    
    socket.on('prediction_result', (data) => {
      console.log('Webhook client received prediction:', data);
      this.handlePredictionEvent(data);
    });
    
    socket.on('connect', () => {
      console.log('Webhook client socket connected');
      this.isConnected = true;
    });
    
    socket.on('disconnect', () => {
      console.log('Webhook client socket disconnected');
      this.isConnected = false;
    });
    
    this.isConnected = socket.connected;
  }
  
  handleBPReadingEvent(data) {
    if (!this.onNotification) return;
    
    const severity = this.assessBPSeverity(data.systolic, data.diastolic);
    
    this.onNotification({
      title: '📊 New BP Reading',
      message: `BP: ${data.systolic}/${data.diastolic} mmHg, HR: ${data.heart_rate} bpm`,
      level: severity === 'critical' ? 'error' : severity === 'high' ? 'warning' : 'info',
      severity,
      eventType: WEBHOOK_EVENTS.BP_READING,
      data
    });
  }
  
  handlePredictionEvent(data) {
    if (!this.onNotification) return;
    
    const severity = data.risk_level === 'High' ? 'high' : 
                    data.risk_level === 'Medium' ? 'medium' : 'low';
    
    this.onNotification({
      title: '🔮 BP Prediction',
      message: `${data.prediction} (${data.risk_level} risk, ${(data.probability * 100).toFixed(1)}% confidence)`,
      level: severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info',
      severity,
      eventType: WEBHOOK_EVENTS.PREDICTION,
      data
    });
  }
  
  assessBPSeverity(systolic, diastolic) {
    if (systolic >= 180 || diastolic >= 120) return 'critical';
    if (systolic >= 160 || diastolic >= 100) return 'high';
    if (systolic >= 140 || diastolic >= 90) return 'medium';
    return 'low';
  }
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    console.log('Webhook client disconnected');
  }
  
  // Register a webhook endpoint
  async registerWebhook(endpointId, url, eventTypes, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint_id: endpointId,
          url,
          event_types: eventTypes,
          ...options
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Webhook registered successfully:', result);
      return result;
      
    } catch (error) {
      console.error('Failed to register webhook:', error);
      throw error;
    }
  }
  
  // Get webhook statistics
  async getWebhookStats() {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Failed to get webhook stats:', error);
      throw error;
    }
  }
  
  // Test a webhook endpoint
  async testWebhook(endpointId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/${endpointId}/test`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Failed to test webhook:', error);
      throw error;
    }
  }
}

export default {
  useWebhookNotifications,
  WebhookEventProcessor,
  BPMonitorWebhookClient,
  verifyWebhookSignature,
  WEBHOOK_EVENTS
};