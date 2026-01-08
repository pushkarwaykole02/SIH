import React from 'react';
import '../css/EventDetailsModal.css';

function EventDetailsModal({ events, selectedDate, onClose }) {
  if (!events || events.length === 0) return null;

  const formatTime = (time) => {
    if (!time) return 'All Day';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="event-details-overlay" onClick={onClose}>
      <div className="event-details-container" onClick={(e) => e.stopPropagation()}>
        <div className="event-details-header">
          <h2>Events on {formatDate(selectedDate)}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="event-details-content">
          {events.map((event, index) => (
            <div key={event.id || index} className="event-card">
              <div className="event-card-header">
                <h3 className="event-name">{event.event_name}</h3>
                <div className="event-time">
                  <span className="time-icon">🕒</span>
                  {formatTime(event.event_time)}
                </div>
              </div>
              
              <div className="event-details">
                <div className="event-detail-item">
                  <span className="detail-icon">📍</span>
                  <span className="detail-label">Venue:</span>
                  <span className="detail-value">{event.event_venue}</span>
                </div>
                
                <div className="event-detail-item description">
                  <span className="detail-icon">📝</span>
                  <span className="detail-label">Description:</span>
                  <p className="detail-value">{event.event_description}</p>
                </div>
              </div>
              
              <div className="event-card-footer">
                <div className="event-created">
                  Created: {new Date(event.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="event-details-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventDetailsModal;
