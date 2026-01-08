import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import EventRSVP from './EventRSVP';
import '../css/UpcomingEvents.css';

function UpcomingEvents({ limit = 5, showRSVP = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchEvents();
    // Get current user from localStorage
    const userData = localStorage.getItem('alumni');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
    
    // Set up auto-refresh every minute to hide events that have passed
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getEvents();
      
      if (response.events) {
        // Get current date and time
        const now = new Date();
        
        // Filter events that are still upcoming (considering both date and time)
        const upcomingEvents = response.events
          .filter(event => {
            // Create a new date object for the event
            const eventDateTime = new Date(event.event_date);
            
            // If event has a time, combine date and time
            if (event.event_time) {
              // Check if event_time is already a Date object (from database)
              if (event.event_time instanceof Date) {
                // Extract hours and minutes from the Date object
                const hours = event.event_time.getHours();
                const minutes = event.event_time.getMinutes();
                eventDateTime.setHours(hours, minutes, 0, 0);
              } else if (typeof event.event_time === 'string') {
                // Parse time string (e.g., "14:30:00" or "14:30")
                const timeStr = event.event_time.split('T')[1] || event.event_time; // Handle ISO strings
                const [hours, minutes] = timeStr.split(':');
                eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              }
            } else {
              // If no time specified, consider it as end of day
              eventDateTime.setHours(23, 59, 59, 999);
            }
            
            // Get current time in the same timezone
            const currentTime = new Date();
            
            // Debug logging for all events
            console.log(`=== UpcomingEvents Filtering Debug ===`);
            console.log(`Event: ${event.event_name}`);
            console.log(`Event Date: ${event.event_date}`);
            console.log(`Event Time: ${event.event_time}`);
            console.log(`Event DateTime: ${eventDateTime.toISOString()}`);
            console.log(`Current DateTime: ${currentTime.toISOString()}`);
            console.log(`Event Timestamp: ${eventDateTime.getTime()}`);
            console.log(`Current Timestamp: ${currentTime.getTime()}`);
            console.log(`Time Difference (ms): ${eventDateTime.getTime() - currentTime.getTime()}`);
            console.log(`Is Upcoming: ${eventDateTime.getTime() > currentTime.getTime()}`);
            console.log(`=====================================`);
            
            // More aggressive filtering - add a 1-minute buffer to ensure events disappear promptly
            const bufferTime = 60 * 1000; // 1 minute in milliseconds
            return eventDateTime.getTime() > (currentTime.getTime() + bufferTime);
          })
          .sort((a, b) => {
            // Sort by date first, then by time
            const dateA = new Date(a.event_date);
            const dateB = new Date(b.event_date);
            
            if (dateA.getTime() !== dateB.getTime()) {
              return dateA - dateB;
            }
            
            // If same date, sort by time
            if (a.event_time && b.event_time) {
              return a.event_time.localeCompare(b.event_time);
            }
            
            return 0;
          })
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
              
              {showRSVP && currentUser && (
                <EventRSVP 
                  eventId={event.id} 
                  userId={currentUser.user_id ?? currentUser.id} 
                  onRSVPChange={() => {
                    // Optionally refresh RSVP counts
                    console.log('RSVP updated for event:', event.id);
                  }}
                />
              )}
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
