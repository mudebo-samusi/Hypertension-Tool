import React from 'react';
import { useWebhookNotifications } from '../services/webhooks';

const NotificationItem = ({ notification, onRemove, onMarkRead }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-400 text-blue-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getIcon = (eventType) => {
    switch (eventType) {
      case 'bp_reading': return '📊';
      case 'prediction': return '🔮';
      case 'alert': return '🚨';
      case 'status': return '📢';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <div className={`p-3 border-l-4 rounded-r-md mb-2 ${getSeverityColor(notification.severity)} ${!notification.read ? 'font-semibold' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <span className="text-lg">{getIcon(notification.eventType)}</span>
          <div className="flex-1">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            <p className="text-sm mt-1">{notification.message}</p>
            <p className="text-xs text-gray-500 mt-1">{formatTimestamp(notification.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Mark as read"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onRemove(notification.id)}
            className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter = ({ className = '' }) => {
  const {
    notifications,
    removeNotification,
    markAsRead,
    clearAll,
    getUnreadCount
  } = useWebhookNotifications();

  const unreadCount = getUnreadCount();

  if (notifications.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-2">Notifications</h3>
        <p className="text-gray-500 text-center py-8">No notifications</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="max-h-96 overflow-y-auto space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
            onMarkRead={markAsRead}
          />
        ))}
      </div>
    </div>
  );
};

const NotificationBadge = ({ onClick, className = '' }) => {
  const { getUnreadCount } = useWebhookNotifications();
  const unreadCount = getUnreadCount();

  return (
    <button
      onClick={onClick}
      className={`relative p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 ${className}`}
      title="Notifications"
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Enhanced BPMonitor component with webhook notifications
const WebhookNotificationProvider = ({ children, bpMonitorUrl = 'http://localhost:5001' }) => {
  const { addNotification } = useWebhookNotifications();
  
  React.useEffect(() => {
    // Import webhook client dynamically to avoid SSR issues
    import('../services/webhooks').then(({ BPMonitorWebhookClient }) => {
      const webhookClient = new BPMonitorWebhookClient(bpMonitorUrl, addNotification);
      
      // Try to connect to webhook events
      webhookClient.connect();
      
      return () => {
        webhookClient.disconnect();
      };
    }).catch(error => {
      console.error('Failed to initialize webhook client:', error);
    });
  }, [bpMonitorUrl, addNotification]);

  return <>{children}</>;
};

// Test notification function for development
export const testNotifications = () => {
  const { addNotification } = useWebhookNotifications();
  
  const testData = [
    {
      title: '📊 New BP Reading',
      message: 'BP: 145/95 mmHg, HR: 82 bpm',
      level: 'warning',
      severity: 'high',
      eventType: 'bp_reading'
    },
    {
      title: '🔮 BP Prediction',
      message: 'Hypertension Stage 1 (Medium risk)',
      level: 'info',
      severity: 'medium',
      eventType: 'prediction'
    },
    {
      title: '🚨 Critical Alert',
      message: 'Critical BP reading detected: 180/120 mmHg',
      level: 'error',
      severity: 'critical',
      eventType: 'alert'
    },
    {
      title: '📢 Status Update',
      message: 'Continuous BP monitoring has been started',
      level: 'info',
      severity: 'low',
      eventType: 'status'
    }
  ];
  
  testData.forEach((notification, index) => {
    setTimeout(() => {
      addNotification(notification);
    }, index * 1000);
  });
};

export { NotificationCenter, NotificationBadge, WebhookNotificationProvider, NotificationItem };
export default NotificationCenter;