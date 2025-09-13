import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/EventCalendar.css';

function EventCalendar({ onEventClick, refreshTrigger }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  useEffect(() => {
    fetchEvents();
  }, [refreshTrigger]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      console.log('Fetching events from API...');
      const response = await apiService.getEvents();
      console.log('API Response:', response);
      console.log('Fetched events:', response.events);
      
      if (!response.events) {
        console.warn('No events property in response:', response);
        setEvents([]);
        setEventsByDate({});
        setConnectionStatus('connected');
        return;
      }
      
      setEvents(response.events || []);
      setConnectionStatus('connected');
      
      // Group events by date
      const grouped = {};
      (response.events || []).forEach(event => {
        const date = event.event_date;
        console.log('Processing event:', event.event_name, 'Date:', date);
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(event);
      });
      console.log('Grouped events by date:', grouped);
      setEventsByDate(grouped);
    } catch (error) {
      console.error('Error fetching events:', error);
      console.error('Error details:', error.message);
      setEvents([]);
      setEventsByDate({});
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date && 
           date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const hasEvents = (date) => {
    if (!date) return false;
    const dateStr = formatDate(date);
    console.log('Checking date:', dateStr, 'Has events:', eventsByDate[dateStr] && eventsByDate[dateStr].length > 0);
    return eventsByDate[dateStr] && eventsByDate[dateStr].length > 0;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = formatDate(date);
    return eventsByDate[dateStr] || [];
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const createTestEvent = async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const testEvent = {
        event_name: 'Test Event - Alumni Meetup',
        event_description: 'This is a test event to verify calendar functionality. Join us for networking and fun!',
        event_venue: 'Main Campus - Conference Hall',
        event_date: formatDate(tomorrow),
        event_time: '14:00'
      };
      
      console.log('Creating test event:', testEvent);
      await apiService.createEvent(testEvent);
      console.log('Test event created successfully!');
      
      // Refresh events after creating test event
      await fetchEvents();
    } catch (error) {
      console.error('Error creating test event:', error);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="event-calendar">
        <div className="calendar-loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-calendar">
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => navigateMonth(-1)}>
          ‹
        </button>
        <h2 className="calendar-title">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchEvents} title="Refresh Events">
            🔄
          </button>
          <button className="test-btn" onClick={createTestEvent} title="Create Test Event">
            🧪
          </button>
          <button className="nav-btn" onClick={() => navigateMonth(1)}>
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        
        <div className="calendar-days">
          {getDaysInMonth(currentDate).map((date, index) => (
            <div
              key={index}
              className={`calendar-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''} ${hasEvents(date) ? 'has-events' : ''}`}
              onClick={() => date && hasEvents(date) && onEventClick && onEventClick(getEventsForDate(date), date)}
            >
              {date && (
                <>
                  <span className="day-number">{date.getDate()}</span>
                  {hasEvents(date) && (
                    <div className="event-indicators">
                      {getEventsForDate(date).slice(0, 3).map((event, eventIndex) => (
                        <div key={eventIndex} className="event-dot" title={event.event_name}></div>
                      ))}
                      {getEventsForDate(date).length > 3 && (
                        <div className="more-events">+{getEventsForDate(date).length - 3}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-dot today"></div>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot has-events"></div>
          <span>Has Events</span>
        </div>
        <div className="legend-item">
          <div className={`status-dot ${connectionStatus}`}></div>
          <span>
            {connectionStatus === 'connected' && 'Connected to DB'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
            {connectionStatus === 'unknown' && 'Unknown Status'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default EventCalendar;
