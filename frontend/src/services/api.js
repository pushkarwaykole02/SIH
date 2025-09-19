const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Debug logging for API URL
console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);
console.log('Full API URL for login:', `${API_BASE_URL}/api/login`);

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

  // Register student
  async registerStudent(studentData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Student registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Student registration error:', error);
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
        // Pass through structured status to client for routing
        const error = new Error(errorData.error || 'Login failed');
        error.code = response.status;
        throw error;
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
  },

  // ================= EVENT RSVP API FUNCTIONS ================= //

  // Update event RSVP
  async updateEventRSVP(eventId, userId, rsvpStatus) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, rsvp_status: rsvpStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update RSVP');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update RSVP error:', error);
      throw error;
    }
  },

  // Get event RSVP counts
  async getEventRSVPCounts(eventId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/rsvp-counts`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch RSVP counts');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get RSVP counts error:', error);
      throw error;
    }
  },

  // ================= MENTORSHIP API FUNCTIONS ================= //

  // Register as mentor (legacy)
  async registerAsMentor(mentorData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentorship/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mentorData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register as mentor');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Register as mentor error:', error);
      throw error;
    }
  },

  // Create mentorship request (legacy)
  async createMentorshipRequest(requestData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentorship/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create mentorship request');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create mentorship request error:', error);
      throw error;
    }
  },

  // Get mentorships for user
  async getMentorships(userId, type) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentorship/${userId}?type=${type}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch mentorships');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get mentorships error:', error);
      throw error;
    }
  },

  // Update mentorship status
  async updateMentorshipStatus(mentorshipId, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentorship/${mentorshipId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update mentorship status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update mentorship status error:', error);
      throw error;
    }
  },

  // List mentors (directory)
  async listMentors(searchTerm = '') {
    try {
      const url = searchTerm
        ? `${API_BASE_URL}/api/mentors?search=${encodeURIComponent(searchTerm)}`
        : `${API_BASE_URL}/api/mentors`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch mentors');
      }
      return await response.json();
    } catch (error) {
      console.error('List mentors error:', error);
      throw error;
    }
  },

  // -------- New Mentorship Programs workflow -------- //

  // Mentor creates a mentorship program
  async createMentorshipProgram(programData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentorship/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create program');
      }
      return await response.json();
    } catch (error) {
      console.error('Create mentorship program error:', error);
      throw error;
    }
  },

  // List active mentorship programs
  async listMentorshipPrograms(menteeUserId) {
    try {
      const url = menteeUserId
        ? `${API_BASE_URL}/api/mentorship/programs?mentee_user_id=${encodeURIComponent(menteeUserId)}`
        : `${API_BASE_URL}/api/mentorship/programs`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch programs');
      }
      return await response.json();
    } catch (error) {
      console.error('List mentorship programs error:', error);
      throw error;
    }
  },

  // Join a mentorship program
  async joinMentorshipProgram(programId, menteeUserId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mentorship/programs/${programId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentee_user_id: menteeUserId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join program');
      }
      return await response.json();
    } catch (error) {
      console.error('Join mentorship program error:', error);
      throw error;
    }
  },

  // Admin: list mentorship programs with counts
  async getAdminMentorshipPrograms() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/mentorship-programs`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch mentorship programs');
      }
      return await response.json();
    } catch (error) {
      console.error('Admin list mentorship programs error:', error);
      throw error;
    }
  },

  // ================= DONATIONS API FUNCTIONS ================= //

  // Create donation
  async createDonation(donationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(donationData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create donation');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create donation error:', error);
      throw error;
    }
  },

  // Get donations
  async getDonations(donorId) {
    try {
      const url = donorId ? `${API_BASE_URL}/api/donations?donor_id=${donorId}` : `${API_BASE_URL}/api/donations`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch donations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get donations error:', error);
      throw error;
    }
  },

  // Get donation stats
  async getDonationStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch donation stats');
      }
      
      const data = await response.json();
      return {
        stats: {
          totalDonations: data.analytics.donations.count,
          totalAmount: data.analytics.donations.total
        }
      };
    } catch (error) {
      console.error('Get donation stats error:', error);
      throw error;
    }
  },

  // ================= JOBS API FUNCTIONS ================= //

  // Create job posting
  async createJob(jobData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create job error:', error);
      throw error;
    }
  },

  // Get jobs
  async getJobs(recruiterId, status, jobType) {
    try {
      let url = `${API_BASE_URL}/api/jobs`;
      const params = new URLSearchParams();
      
      if (recruiterId) params.append('recruiter_id', recruiterId);
      if (status) params.append('status', status);
      if (jobType) params.append('job_type', jobType);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch jobs');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get jobs error:', error);
      throw error;
    }
  },

  // ================= NOTIFICATIONS API FUNCTIONS ================= //

  // Get notifications for user
  async getNotifications(userId, unreadOnly = false) {
    try {
      const url = unreadOnly 
        ? `${API_BASE_URL}/api/notifications/${userId}?unread_only=true`
        : `${API_BASE_URL}/api/notifications/${userId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch notifications');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark notification as read');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  },

  // ================= ANALYTICS API FUNCTIONS ================= //

  // Get dashboard analytics
  async getDashboardAnalytics() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  },

  // ================= ADMIN API FUNCTIONS ================= //

  // Get all alumni (for admin)
  async getAllAlumni() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/all-alumni`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch all alumni');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get all alumni error:', error);
      throw error;
    }
  },

  // Get all mentorships (for admin)
  async getAllMentorships() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/mentorships`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch mentorships');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get all mentorships error:', error);
      throw error;
    }
  },

  // ================= CAREER UPDATES API FUNCTIONS ================= //

  // Create career update
  async createCareerUpdate(careerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(careerData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create career update');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Create career update error:', error);
      throw error;
    }
  },

  // Get career updates for alumni
  async getCareerUpdates(alumniId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career-updates/${alumniId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch career updates');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get career updates error:', error);
      throw error;
    }
  },

  // Update career update
  async updateCareerUpdate(updateId, careerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career-updates/${updateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(careerData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update career update');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update career update error:', error);
      throw error;
    }
  },

  // Delete career update
  async deleteCareerUpdate(updateId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career-updates/${updateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete career update');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Delete career update error:', error);
      throw error;
    }
  },

  // ================= RECOMMENDATION API FUNCTIONS ================= //

  // Get mentor recommendations
  async getMentorRecommendations(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/mentors/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch mentor recommendations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get mentor recommendations error:', error);
      throw error;
    }
  },

  // Get event recommendations
  async getEventRecommendations(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/events/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch event recommendations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get event recommendations error:', error);
      throw error;
    }
  },

  // Get job recommendations
  async getJobRecommendations(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/jobs/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch job recommendations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get job recommendations error:', error);
      throw error;
    }
  },

  // Get alumni recommendations
  async getAlumniRecommendations(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/alumni/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch alumni recommendations');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get alumni recommendations error:', error);
      throw error;
    }
  }
};
