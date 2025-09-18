import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/EventRSVP.css';

function EventRSVP({ eventId, userId, onRSVPChange }) {
  const [rsvpStatus, setRsvpStatus] = useState('');
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, interested: 0, not_going: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRSVPCounts();
  }, [eventId]);

  const fetchRSVPCounts = async () => {
    try {
      const response = await apiService.getEventRSVPCounts(eventId);
      setRsvpCounts(response.counts);
    } catch (err) {
      console.error('Error fetching RSVP counts:', err);
    }
  };

  const handleRSVP = async (status) => {
    if (!userId) {
      setError('Please login to RSVP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiService.updateEventRSVP(eventId, userId, status);
      setRsvpStatus(status);
      fetchRSVPCounts(); // Refresh counts
      
      if (onRSVPChange) {
        onRSVPChange(status);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonClass = (status) => {
    let baseClass = 'rsvp-btn';
    if (rsvpStatus === status) {
      baseClass += ' active';
    }
    switch (status) {
      case 'going':
        return `${baseClass} going`;
      case 'interested':
        return `${baseClass} interested`;
      case 'not_going':
        return `${baseClass} not-going`;
      default:
        return baseClass;
    }
  };

  return (
    <div className="event-rsvp">
      <div className="rsvp-header">
        <h4>RSVP for this event</h4>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="rsvp-buttons">
        <button
          className={getButtonClass('going')}
          onClick={() => handleRSVP('going')}
          disabled={isLoading}
        >
          {isLoading && rsvpStatus === 'going' ? '⏳' : '✅'} Going
        </button>
        <button
          className={getButtonClass('interested')}
          onClick={() => handleRSVP('interested')}
          disabled={isLoading}
        >
          {isLoading && rsvpStatus === 'interested' ? '⏳' : '🤔'} Interested
        </button>
        <button
          className={getButtonClass('not_going')}
          onClick={() => handleRSVP('not_going')}
          disabled={isLoading}
        >
          {isLoading && rsvpStatus === 'not_going' ? '⏳' : '❌'} Not Going
        </button>
      </div>

      <div className="rsvp-counts">
        <div className="count-item">
          <span className="count going">{rsvpCounts.going}</span>
          <span className="label">Going</span>
        </div>
        <div className="count-item">
          <span className="count interested">{rsvpCounts.interested}</span>
          <span className="label">Interested</span>
        </div>
        <div className="count-item">
          <span className="count not-going">{rsvpCounts.not_going}</span>
          <span className="label">Not Going</span>
        </div>
      </div>
    </div>
  );
}

export default EventRSVP;
