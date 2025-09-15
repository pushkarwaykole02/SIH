const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin) || import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Debug logging for API URL
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);

// API service functions
export const apiService = {
  // Register alumni
  async registerAlumni(formData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        body: formData, // FormData for file upload
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login alumni
  async loginAlumni(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Get alumni by email
  async getAlumni(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alumni?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch alumni data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get alumni error:', error);
      throw error;
    }
  },

  // Update alumni profile
  async updateAlumniProfile(id, profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alumni/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Admin: Get pending requests
  async getPendingRequests() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/pending`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pending requests');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get pending requests error:', error);
      throw error;
    }
  },

  // Admin: Approve alumni
  async approveAlumni(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/${id}/approve`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve alumni');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Approve alumni error:', error);
      throw error;
    }
  },

  // Admin: Decline alumni
  async declineAlumni(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/${id}/decline`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to decline alumni');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Decline alumni error:', error);
      throw error;
    }
  },

  // Admin: Download document
  async downloadDocument(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/document/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download document');
      }
      
      return response.blob();
    } catch (error) {
      console.error('Download document error:', error);
      throw error;
    }
  },

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  // ================= EVENT API FUNCTIONS ================= //

  // Create event
  async createEvent(eventData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create event error:', error);
      throw error;
    }
  },

  // Get all events
  async getEvents() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get events error:', error);
      throw error;
    }
  },

  // Get events by date
  async getEventsByDate(date) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/date/${date}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events by date');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get events by date error:', error);
      throw error;
    }
  },

  // Get single event
  async getEvent(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch event');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get event error:', error);
      throw error;
    }
  },

  // Update event
  async updateEvent(id, eventData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update event error:', error);
      throw error;
    }
  },

  // Delete event
  async deleteEvent(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Delete event error:', error);
      throw error;
    }
  }
};
