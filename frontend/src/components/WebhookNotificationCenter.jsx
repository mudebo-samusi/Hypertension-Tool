// WebhookNotificationCenter.jsx - React component to display webhook notifications
import React, { useState, useEffect } from 'react';
import './WebhookNotificationCenter.css';

const WebhookNotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from webhook server
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5174/api/notifications');
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      
      const data = await response.json();
      const newNotifications = data.notifications || [];
      
      setNotifications(newNotifications);
      
      // Count unread notifications
      const unread = newNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      
    } catch (err) {
      console.error('[WebhookNotificationCenter] Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all notifications
  const clearNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5174/api/notifications/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[WebhookNotificationCenter] Error clearing notifications:', err);
      setError(err.message);
    }
  };

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      const response = await fetch(`http://localhost:5174/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[WebhookNotificationCenter] Error marking notification as read:', err);
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#dc3545'; // red
      case 'medium':
        return '#fd7e14'; // orange
      case 'low':
        return '#28a745'; // green
      case 'info':
      default:
        return '#17a2b8'; // blue
    }
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'bp_reading':
        return '❤️';
      case 'prediction':
        return '🔮';
      case 'alert':
        return '⚠️';
      case 'status':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Auto-refresh notifications every 5 seconds
  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="webhook-notification-center">
      {/* Notification Bell Button */}
      <button 
        className="notification-bell" 
        onClick={() => setIsOpen(!isOpen)}
        title="Webhook Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Webhook Notifications</h3>
            <div className="notification-actions">
              <button 
                onClick={fetchNotifications} 
                disabled={isLoading}
                title="Refresh notifications"
              >
                🔄
              </button>
              <button 
                onClick={clearNotifications}
                title="Clear all notifications"
              >
                🗑️
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                title="Close panel"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="notification-content">
            {isLoading && (
              <div className="notification-loading">Loading notifications...</div>
            )}

            {error && (
              <div className="notification-error">
                Error: {error}
                <button onClick={() => setError(null)}>✕</button>
              </div>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <div className="notification-empty">
                No webhook notifications yet
              </div>
            )}

            {!isLoading && notifications.length > 0 && (
              <div className="notification-list">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    style={{ borderLeftColor: getSeverityColor(notification.severity) }}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="notification-icon">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="notification-body">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="notification-unread-dot"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notification-footer">
            <small>Auto-refreshes every 5 seconds</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookNotificationCenter;