import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/AdminEventManagement.css';

function AdminEventManagement({ refreshTrigger, onEventUpdated }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });

  useEffect(() => {
    fetchEvents();
    
    // Set up auto-refresh every minute to hide events that have passed
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000); // Refresh every minute
    
    return () => {
      clearInterval(interval);
    };
  }, [refreshTrigger]);


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
          });
        
        setEvents(upcomingEvents);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    
    // Format date for HTML input (YYYY-MM-DD)
    let formattedDate = event.event_date;
    if (event.event_date) {
      const date = new Date(event.event_date);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }
    
    // Format time for HTML input (HH:MM)
    let formattedTime = '';
    if (event.event_time) {
      try {
        if (event.event_time instanceof Date) {
          // If it's a Date object, format it as HH:MM
          const hours = event.event_time.getHours().toString().padStart(2, '0');
          const minutes = event.event_time.getMinutes().toString().padStart(2, '0');
          formattedTime = `${hours}:${minutes}`;
        } else if (typeof event.event_time === 'string') {
          // Handle string formats
          let timeStr = event.event_time;
          
          // If it's an ISO string, extract just the time part
          if (timeStr.includes('T')) {
            timeStr = timeStr.split('T')[1];
          }
          
          // Remove seconds if present and format as HH:MM
          if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            formattedTime = `${hours}:${minutes}`;
          }
        }
      } catch (error) {
        console.error('Error formatting time for edit form:', error);
        formattedTime = '';
      }
    }
    
    setEditFormData({
      event_name: event.event_name,
      event_description: event.event_description,
      event_venue: event.event_venue,
      event_date: formattedDate,
      event_time: formattedTime
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    // Validate date to prevent past dates
    if (name === 'event_date' && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      
      if (selectedDate < today) {
        setError('Event date cannot be in the past. Please select today or a future date.');
        return;
      }
    }
    
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    setActionLoading({ id: editingEvent.id, action: 'update' });
    
    // Final validation to prevent past dates
    if (editFormData.event_date) {
      const selectedDate = new Date(editFormData.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setError('Event date cannot be in the past. Please select today or a future date.');
        setActionLoading({ id: null, action: null });
        return;
      }
    }
    
    try {
      await apiService.updateEvent(editingEvent.id, editFormData);
      setEditingEvent(null);
      setEditFormData({});
      await fetchEvents();
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update event');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    setActionLoading({ id: eventId, action: 'delete' });
    
    try {
      await apiService.deleteEvent(eventId);
      await fetchEvents();
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
    } finally {
      setActionLoading({ id: null, action: null });
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
    if (!timeString) return 'No time specified';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="admin-event-management">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-event-management">
        <div className="error-state">
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
      <div className="admin-event-management">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Upcoming Events</h3>
          <p>All events have passed or no events have been created yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-event-management">
      <div className="events-header">
        <h3>Upcoming Events ({events.length})</h3>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchEvents}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="events-list">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <div className="event-date">
              <div className="date-day">{new Date(event.event_date).getDate()}</div>
              <div className="date-month">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
            
            <div className="event-content">
              <div className="event-details">
                <h4 className="event-title">{event.event_name}</h4>
                <p className="event-description">{event.event_description}</p>
                <div className="event-meta">
                  <span className="event-venue">📍 {event.event_venue}</span>
                  <span className="event-time">🕒 {formatTime(event.event_time)}</span>
                  <span className="event-date-display">📅 {formatDate(event.event_date)}</span>
                </div>
              </div>
              
              <div className="event-actions">
                <button 
                  className="btn btn-edit"
                  onClick={() => handleEdit(event)}
                  disabled={actionLoading.id === event.id}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-delete"
                  onClick={() => handleDeleteEvent(event.id)}
                  disabled={actionLoading.id === event.id}
                >
                  {actionLoading.id === event.id && actionLoading.action === 'delete' ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="edit-modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Event</h3>
              <button className="close-btn" onClick={() => setEditingEvent(null)}>×</button>
            </div>
            
            <form onSubmit={handleUpdateEvent} className="edit-form">
              <div className="form-group">
                <label htmlFor="event_name">Event Name</label>
                <input
                  type="text"
                  id="event_name"
                  name="event_name"
                  value={editFormData.event_name}
                  onChange={handleEditChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="event_description">Description</label>
                <textarea
                  id="event_description"
                  name="event_description"
                  value={editFormData.event_description}
                  onChange={handleEditChange}
                  rows="3"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="event_venue">Venue</label>
                <input
                  type="text"
                  id="event_venue"
                  name="event_venue"
                  value={editFormData.event_venue}
                  onChange={handleEditChange}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="event_date">Date</label>
                  <input
                    type="date"
                    id="event_date"
                    name="event_date"
                    value={editFormData.event_date}
                    onChange={handleEditChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="event_time">Time (optional)</label>
                  <input
                    type="time"
                    id="event_time"
                    name="event_time"
                    value={editFormData.event_time}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={actionLoading.id === editingEvent.id}
                >
                  {actionLoading.id === editingEvent.id && actionLoading.action === 'update' ? '⏳ Updating...' : '💾 Update Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminEventManagement;
