import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/NotificationSystem.css';

function NotificationSystem({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await apiService.getNotifications(user.id, true); // Get unread only
      if (response.success) {
        setNotifications(response.notifications);
        setUnreadCount(response.notifications.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiService.getNotifications(user.id, false); // Get all
      if (response.success) {
        setNotifications(response.notifications);
        setUnreadCount(response.notifications.filter(n => !n.is_read).length);
        setShowAll(true);
      }
    } catch (err) {
      console.error('Error fetching all notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await apiService.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => apiService.markNotificationAsRead(n.id))
      );
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'registration_approved':
        return '✅';
      case 'registration_declined':
        return '❌';
      case 'event_reminder':
        return '📅';
      case 'mentorship_request':
        return '🤝';
      case 'mentorship_approved':
        return '🎉';
      case 'donation_received':
        return '💰';
      case 'job_posted':
        return '💼';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'registration_approved':
      case 'mentorship_approved':
        return 'success';
      case 'registration_declined':
        return 'error';
      case 'event_reminder':
        return 'info';
      case 'mentorship_request':
        return 'warning';
      case 'donation_received':
        return 'success';
      case 'job_posted':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  if (!user) {
    return null;
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="notification-system">
        <div className="loading-state">Loading notifications...</div>
      </div>
    );
  }

  const displayNotifications = showAll ? notifications : notifications.slice(0, 5);

  return (
    <div className="notification-system">
      <div className="notification-header">
        <div className="notification-title">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="notification-actions">
          {!showAll && notifications.length > 5 && (
            <button 
              className="btn btn-text"
              onClick={fetchAllNotifications}
            >
              View All
            </button>
          )}
          {unreadCount > 0 && (
            <button 
              className="btn btn-text"
              onClick={markAllAsRead}
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {displayNotifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <h4>No Notifications</h4>
          <p>You're all caught up! New notifications will appear here.</p>
        </div>
      ) : (
        <div className="notification-list">
          {displayNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getNotificationColor(notification.type)}`}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title-text">
                  {notification.title}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-time">
                  {formatTimeAgo(notification.created_at)}
                </div>
              </div>
              {!notification.is_read && (
                <div className="unread-indicator"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAll && notifications.length > 5 && (
        <div className="notification-footer">
          <button 
            className="btn btn-text"
            onClick={() => setShowAll(false)}
          >
            Show Less
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationSystem;
