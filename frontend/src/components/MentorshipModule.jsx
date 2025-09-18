import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/MentorshipModule.css';

function MentorshipModule({ user, userRole }) {
  const [mentorships, setMentorships] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [requestForm, setRequestForm] = useState({
    mentor_id: '',
    subject_area: '',
    description: ''
  });

  const [registerForm, setRegisterForm] = useState({
    subject_areas: [],
    description: ''
  });

  useEffect(() => {
    if (user && (user.user_id || user.id)) {
      fetchMentorships();
    }
  }, [user]);

  const fetchMentorships = async () => {
    try {
      setIsLoading(true);
      const type = userRole === 'alumni' ? 'mentor' : 'mentee';
      const uid = parseInt(user.user_id || user.id, 10);
      const response = await apiService.getMentorships(uid, type);
      setMentorships(response.mentorships);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.mentor_id || !requestForm.subject_area) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.createMentorshipRequest({
        mentor_id: parseInt(requestForm.mentor_id, 10),
        mentee_id: parseInt(user.user_id || user.id, 10),
        subject_area: requestForm.subject_area,
        description: requestForm.description
      });
      setSuccess('Mentorship request sent successfully!');
      setRequestForm({ mentor_id: '', subject_area: '', description: '' });
      setShowRequestForm(false);
      fetchMentorships();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (registerForm.subject_areas.length === 0) {
      setError('Please select at least one subject area');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.registerAsMentor({
        user_id: parseInt(user.user_id || user.id, 10),
        subject_areas: registerForm.subject_areas,
        description: registerForm.description
      });
      setSuccess('Successfully registered as mentor!');
      setRegisterForm({ subject_areas: [], description: '' });
      setShowRegisterForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (mentorshipId, status) => {
    try {
      await apiService.updateMentorshipStatus(mentorshipId, status);
      setSuccess(`Mentorship ${status} successfully!`);
      fetchMentorships();
    } catch (err) {
      setError(err.message);
    }
  };

  const subjectAreas = [
    'Computer Science', 'Engineering', 'Business', 'Data Science',
    'Machine Learning', 'Web Development', 'Mobile Development',
    'DevOps', 'Cybersecurity', 'Product Management', 'Marketing',
    'Finance', 'Design', 'Other'
  ];

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      completed: 'status-completed'
    };
    return <span className={`status-badge ${statusClasses[status]}`}>{status}</span>;
  };

  return (
    <div className="mentorship-module">
      <div className="mentorship-header">
        <h2>Mentorship Program</h2>
        <div className="mentorship-actions">
          {userRole === 'alumni' && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowRegisterForm(true)}
            >
              Register as Mentor
            </button>
          )}
          {userRole === 'student' && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowRequestForm(true)}
            >
              Request Mentorship
            </button>
          )}
        </div>
      </div>

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

      <div className="mentorships-list">
        {isLoading ? (
          <div className="loading">Loading mentorships...</div>
        ) : mentorships.length === 0 ? (
          <div className="empty-state">
            <p>No mentorship requests found.</p>
          </div>
        ) : (
          mentorships.map(mentorship => (
            <div key={mentorship.id} className="mentorship-card">
              <div className="mentorship-info">
                <h4>
                  {userRole === 'mentor' ? mentorship.mentee_name : mentorship.mentor_name}
                </h4>
                <p className="mentorship-subject">{mentorship.subject_area}</p>
                <p className="mentorship-description">{mentorship.description}</p>
                <div className="mentorship-meta">
                  <span>Requested: {new Date(mentorship.created_at).toLocaleDateString()}</span>
                  {getStatusBadge(mentorship.status)}
                </div>
              </div>
              
              {userRole === 'alumni' && mentorship.status === 'pending' && (
                <div className="mentorship-actions">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleStatusUpdate(mentorship.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleStatusUpdate(mentorship.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Request Mentorship Modal */}
      {showRequestForm && (
        <div className="modal-overlay" onClick={() => setShowRequestForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Mentorship</h3>
              <button className="modal-close" onClick={() => setShowRequestForm(false)}>×</button>
            </div>
            <form onSubmit={handleRequestSubmit} className="mentorship-form">
              <div className="form-group">
                <label>Mentor ID</label>
                <input
                  type="number"
                  value={requestForm.mentor_id}
                  onChange={(e) => setRequestForm({...requestForm, mentor_id: e.target.value})}
                  placeholder="Enter mentor ID"
                  required
                />
              </div>
              <div className="form-group">
                <label>Subject Area</label>
                <input
                  type="text"
                  value={requestForm.subject_area}
                  onChange={(e) => setRequestForm({...requestForm, subject_area: e.target.value})}
                  placeholder="e.g., Computer Science, Web Development"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({...requestForm, description: e.target.value})}
                  placeholder="Describe what you'd like to learn or discuss"
                  rows="4"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register as Mentor Modal */}
      {showRegisterForm && (
        <div className="modal-overlay" onClick={() => setShowRegisterForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register as Mentor</h3>
              <button className="modal-close" onClick={() => setShowRegisterForm(false)}>×</button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="mentorship-form">
              <div className="form-group">
                <label>Subject Areas</label>
                <div className="checkbox-group">
                  {subjectAreas.map(area => (
                    <label key={area} className="checkbox-label">
                      <input
                        type="checkbox"
                        value={area}
                        checked={registerForm.subject_areas.includes(area)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRegisterForm({
                              ...registerForm,
                              subject_areas: [...registerForm.subject_areas, area]
                            });
                          } else {
                            setRegisterForm({
                              ...registerForm,
                              subject_areas: registerForm.subject_areas.filter(a => a !== area)
                            });
                          }
                        }}
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={registerForm.description}
                  onChange={(e) => setRegisterForm({...registerForm, description: e.target.value})}
                  placeholder="Tell us about your experience and how you can help students"
                  rows="4"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Registering...' : 'Register as Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MentorshipModule;
