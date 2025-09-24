// webhookServer.js - Frontend webhook server to receive webhooks from BP monitor microservice
import express from 'express';
import cors from 'cors';
import { webhookNotificationService } from './webhookNotifications';

class WebhookServer {
  constructor(port = 5174) {
    this.app = express();
    this.port = port;
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for all routes
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:5001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Parse JSON bodies
    this.app.use(express.json());

    // Log all webhook requests
    this.app.use('/api/webhooks', (req, res, next) => {
      console.log(`[WebhookServer] ${req.method} ${req.path}`, req.body);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // BP Reading webhook endpoint
    this.app.post('/api/webhooks/bp-reading', (req, res) => {
      try {
        const { systolic, diastolic, heart_rate, timestamp, patient_id } = req.body;
        
        console.log('[WebhookServer] BP Reading webhook received:', req.body);
        
        // Notify the notification service
        webhookNotificationService.addNotification({
          type: 'bp_reading',
          title: 'New BP Reading',
          message: `BP: ${systolic}/${diastolic} mmHg, HR: ${heart_rate} bpm`,
          data: req.body,
          timestamp: timestamp || new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'BP reading webhook processed' });
      } catch (error) {
        console.error('[WebhookServer] Error processing BP reading webhook:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Prediction webhook endpoint
    this.app.post('/api/webhooks/prediction', (req, res) => {
      try {
        const { prediction, confidence, risk_factors, timestamp, patient_id } = req.body;
        
        console.log('[WebhookServer] Prediction webhook received:', req.body);
        
        // Determine severity based on prediction
        const severity = prediction === 'high_risk' ? 'high' : 
                        prediction === 'medium_risk' ? 'medium' : 'low';
        
        webhookNotificationService.addNotification({
          type: 'prediction',
          title: 'Hypertension Risk Prediction',
          message: `Risk Level: ${prediction} (${Math.round(confidence * 100)}% confidence)`,
          data: req.body,
          severity,
          timestamp: timestamp || new Date().toISOString()
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
        const { alert_type, message, severity, timestamp, patient_id, data } = req.body;
        
        console.log('[WebhookServer] Alert webhook received:', req.body);
        
        webhookNotificationService.addNotification({
          type: 'alert',
          title: `${alert_type} Alert`,
          message: message,
          data: req.body,
          severity: severity || 'high',
          timestamp: timestamp || new Date().toISOString()
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
        const { status, service, message, timestamp } = req.body;
        
        console.log('[WebhookServer] Status webhook received:', req.body);
        
        webhookNotificationService.addNotification({
          type: 'status',
          title: `${service} Status Update`,
          message: message || `Status: ${status}`,
          data: req.body,
          severity: status === 'error' ? 'high' : 'low',
          timestamp: timestamp || new Date().toISOString()
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
        const notifications = webhookNotificationService.getNotifications();
        res.json({ notifications });
      } catch (error) {
        console.error('[WebhookServer] Error getting notifications:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Clear notifications endpoint
    this.app.post('/api/notifications/clear', (req, res) => {
      try {
        webhookNotificationService.clearNotifications();
        res.json({ success: true, message: 'Notifications cleared' });
      } catch (error) {
        console.error('[WebhookServer] Error clearing notifications:', error);
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

// Create and export singleton instance
export const webhookServer = new WebhookServer();

// Auto-start if this module is imported
if (typeof window === 'undefined') {
  // Only start in Node.js environment (not in browser)
  webhookServer.start().catch(console.error);
}

export default WebhookServer;