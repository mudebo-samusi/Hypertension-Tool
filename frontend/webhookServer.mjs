// webhookServer.mjs - Standalone Node.js webhook server for receiving BP monitor webhooks
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

class WebhookNotificationService {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 100;
  }

  addNotification(notification) {
    const id = Date.now() + Math.random();
    const fullNotification = {
      id,
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false
    };
    
    this.notifications.unshift(fullNotification);
    
    // Keep only the latest notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }
    
    console.log(`[WebhookNotifications] Added notification: ${notification.title}`);
    return fullNotification;
  }

  getNotifications(limit = 50) {
    return this.notifications.slice(0, limit);
  }

  clearNotifications() {
    this.notifications = [];
    console.log('[WebhookNotifications] Cleared all notifications');
  }

  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }
}

class WebhookServer {
  constructor(port = 5174) {
    this.app = express();
    this.port = port;
    this.server = null;
    this.notificationService = new WebhookNotificationService();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for all routes
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:5001', 'http://127.0.0.1:5173', 'http://127.0.0.1:5001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Parse JSON bodies
    this.app.use(express.json());

    // Log all webhook requests
    this.app.use('/api/webhooks', (req, res, next) => {
      console.log(`[WebhookServer] ${new Date().toISOString()} ${req.method} ${req.path}`, req.body);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        notifications: this.notificationService.notifications.length
      });
    });

    // BP Reading webhook endpoint
    this.app.post('/api/webhooks/bp-reading', (req, res) => {
      try {
        console.log('[WebhookServer] BP Reading webhook received - Full body:', JSON.stringify(req.body, null, 2));
        
        // The BP microservice sends WebhookEvent structure: { event_id, event_type, data: { reading: {...}, severity, timestamp }, ... }
        const { event_id, event_type, data, timestamp: eventTimestamp } = req.body;
        
        console.log('[WebhookServer] Extracted data:', { event_id, event_type, data: data ? 'present' : 'missing' });
        
        if (!data) {
          throw new Error('Missing data object in webhook payload');
        }
        
        if (!data.reading) {
          console.log('[WebhookServer] Data object content:', JSON.stringify(data, null, 2));
          throw new Error('Missing reading data in webhook payload data object');
        }
        
        // Extract values from the nested data.reading object
        const { reading, severity, timestamp } = data;
        const { systolic, diastolic, heart_rate } = reading;
        
        console.log('[WebhookServer] Extracted reading values:', { systolic, diastolic, heart_rate });
        
        // Notify the notification service
        this.notificationService.addNotification({
          type: 'bp_reading',
          title: 'New BP Reading',
          message: `BP: ${systolic}/${diastolic} mmHg, HR: ${heart_rate} bpm`,
          data: req.body,
          severity: severity || 'info',
          timestamp: timestamp || eventTimestamp || new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'BP reading webhook processed' });
      } catch (error) {
        console.error('[WebhookServer] Error processing BP reading webhook:', error);
        console.error('[WebhookServer] Request body was:', JSON.stringify(req.body, null, 2));
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Prediction webhook endpoint
    this.app.post('/api/webhooks/prediction', (req, res) => {
      try {
        // The BP microservice sends WebhookEvent: { event_id, event_type, data: { prediction: {...}, reading: {...}, alert_level, timestamp }, ... }
        const { event_id, event_type, data, timestamp: eventTimestamp } = req.body;
        
        console.log('[WebhookServer] Prediction webhook received:', req.body);
        
        if (!data || !data.prediction) {
          throw new Error('Missing prediction data in webhook payload');
        }
        
        // Extract prediction details from nested data object
        const { prediction, reading, alert_level, timestamp } = data;
        const { prediction: predictionValue, probability, risk_level } = prediction;
        
        // Determine severity based on prediction value or risk level
        const severity = risk_level === 'High' ? 'high' : 
                        risk_level === 'Medium' ? 'medium' : 
                        alert_level === 'critical' ? 'high' : 'low';
        
        this.notificationService.addNotification({
          type: 'prediction',
          title: 'Hypertension Risk Prediction',
          message: `Risk Level: ${predictionValue} (${Math.round((probability || 0) * 100)}% confidence)`,
          data: req.body,
          severity,
          timestamp: timestamp || eventTimestamp || new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'Prediction webhook processed' });
      } catch (error) {
        console.error('[WebhookServer] Error processing prediction webhook:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Alert webhook endpoint
    this.app.post('/api/webhooks/alert', (req, res) => {
      try {
        // The BP microservice sends WebhookEvent: { event_id, event_type, data: { alert_type, message, severity, timestamp }, ... }
        const { event_id, event_type, data, timestamp: eventTimestamp } = req.body;
        
        console.log('[WebhookServer] Alert webhook received:', req.body);
        
        if (!data) {
          throw new Error('Missing alert data in webhook payload');
        }
        
        // Extract alert details from data object
        const { alert_type, message, severity, timestamp } = data;
        
        this.notificationService.addNotification({
          type: 'alert',
          title: `${alert_type} Alert`,
          message: message,
          data: req.body,
          severity: severity || 'high',
          timestamp: timestamp || eventTimestamp || new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'Alert webhook processed' });
      } catch (error) {
        console.error('[WebhookServer] Error processing alert webhook:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Status webhook endpoint
    this.app.post('/api/webhooks/status', (req, res) => {
      try {
        // The BP microservice sends WebhookEvent: { event_id, event_type, data: { status, message, service, timestamp }, ... }
        const { event_id, event_type, data, timestamp: eventTimestamp } = req.body;
        
        console.log('[WebhookServer] Status webhook received:', req.body);
        
        if (!data) {
          throw new Error('Missing status data in webhook payload');
        }
        
        // Extract status details from data object
        const { status, service, message, timestamp } = data;
        
        this.notificationService.addNotification({
          type: 'status',
          title: `${service || 'System'} Status Update`,
          message: message || `Status: ${status}`,
          data: req.body,
          severity: status === 'error' ? 'high' : 'low',
          timestamp: timestamp || eventTimestamp || new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'Status webhook processed' });
      } catch (error) {
        console.error('[WebhookServer] Error processing status webhook:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // List active notifications endpoint
    this.app.get('/api/notifications', (req, res) => {
      try {
        const notifications = this.notificationService.getNotifications();
        res.json({ notifications });
      } catch (error) {
        console.error('[WebhookServer] Error getting notifications:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Clear notifications endpoint
    this.app.post('/api/notifications/clear', (req, res) => {
      try {
        this.notificationService.clearNotifications();
        res.json({ success: true, message: 'Notifications cleared' });
      } catch (error) {
        console.error('[WebhookServer] Error clearing notifications:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Mark notification as read
    this.app.post('/api/notifications/:id/read', (req, res) => {
      try {
        const id = parseInt(req.params.id);
        this.notificationService.markAsRead(id);
        res.json({ success: true, message: 'Notification marked as read' });
      } catch (error) {
        console.error('[WebhookServer] Error marking notification as read:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`[WebhookServer] Webhook server listening on port ${this.port}`);
          console.log(`[WebhookServer] Webhook endpoints available at:`);
          console.log(`  - http://localhost:${this.port}/api/webhooks/bp-reading`);
          console.log(`  - http://localhost:${this.port}/api/webhooks/prediction`);
          console.log(`  - http://localhost:${this.port}/api/webhooks/alert`);
          console.log(`  - http://localhost:${this.port}/api/webhooks/status`);
          console.log(`  - http://localhost:${this.port}/api/notifications`);
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          console.error('[WebhookServer] Server error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('[WebhookServer] Failed to start server:', error);
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[WebhookServer] Webhook server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Create and start the server
const webhookServer = new WebhookServer();
webhookServer.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[WebhookServer] Shutting down gracefully...');
  webhookServer.stop().then(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[WebhookServer] Shutting down gracefully...');
  webhookServer.stop().then(() => {
    process.exit(0);
  });
});