import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/UpcomingEvents.css';

function UpcomingEvents({ limit = 5 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getEvents();
      
      if (response.events) {
        // Sort events by date and get upcoming ones
        const today = new Date();
        const upcomingEvents = response.events
          .filter(event => new Date(event.event_date) >= today)
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
          .slice(0, limit);
        
        setEvents(upcomingEvents);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'All Day';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="upcoming-events">
        <div className="events-loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upcoming-events">
        <div className="events-error">
          <div className="error-icon">❌</div>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchEvents}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="upcoming-events">
        <div className="events-empty">
          <div className="empty-icon">📅</div>
          <p>No upcoming events</p>
          <small>Check back later for new events!</small>
        </div>
      </div>
    );
  }

  return (
    <div className="upcoming-events">
      <div className="events-list">
        {events.map((event, index) => (
          <div key={event.id || index} className="event-item">
            <div className="event-date">
              <div className="date-day">{new Date(event.event_date).getDate()}</div>
              <div className="date-month">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
            
            <div className="event-details">
              <h4 className="event-title">{event.event_name}</h4>
              <p className="event-description">{event.event_description}</p>
              <div className="event-meta">
                <span className="event-venue">📍 {event.event_venue}</span>
                <span className="event-time">🕒 {formatTime(event.event_time)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="events-footer">
        <button className="view-all-btn" onClick={fetchEvents}>
          🔄 Refresh Events
        </button>
      </div>
    </div>
  );
}

export default UpcomingEvents;
