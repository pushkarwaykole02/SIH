import React, { useState } from 'react';
import { apiService } from '../services/api';
import '../css/EventForm.css';

function EventForm({ onEventCreated, onClose }) {
  const [formData, setFormData] = useState({
    event_name: '',
    event_description: '',
    event_venue: '',
    event_date: '',
    event_time: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiService.createEvent(formData);
      setSuccess('Event created successfully!');
      setFormData({
        event_name: '',
        event_description: '',
        event_venue: '',
        event_date: '',
        event_time: ''
      });
      
      // Notify parent component
      if (onEventCreated) {
        onEventCreated();
      }
      
      // Auto close after 2 seconds
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="event-form-overlay" onClick={onClose}>
      <div className="event-form-container" onClick={(e) => e.stopPropagation()}>
        <div className="event-form-header">
          <h2>Create New Event</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="event-form">
          {error && (
            <div className="message error">
              {error}
            </div>
          )}
          
          {success && (
            <div className="message success">
              {success}
            </div>
          )}

          <div className="event-name-group">
            <label htmlFor="event_name">Event Name</label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="event-description-group">
            <label htmlFor="event_description">Event Description</label>
            <textarea
              id="event_description"
              name="event_description"
              value={formData.event_description}
              onChange={handleChange}
              placeholder="Describe the event details"
              required
            />
          </div>

          <div className="event-venue-group">
            <label htmlFor="event_venue">Event Venue</label>
            <input
              type="text"
              id="event_venue"
              name="event_venue"
              value={formData.event_venue}
              onChange={handleChange}
              placeholder="Enter venue location"
              required
            />
          </div>

          <div className="form-row">
            <div className="event-date-group">
              <label htmlFor="event_date">Event Date</label>
              <input
                type="date"
                id="event_date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="event-time-group">
              <label htmlFor="event_time">Event Time</label>
              <input
                type="time"
                id="event_time"
                name="event_time"
                value={formData.event_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;
