import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/CareerUpdates.css';

function CareerUpdates({ user }) {
  const [careerUpdates, setCareerUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);

  const [formData, setFormData] = useState({
    company: '',
    designation: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchCareerUpdates();
    }
  }, [user]);

  const fetchCareerUpdates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getCareerUpdates(user.id);
      if (response.success) {
        setCareerUpdates(response.careerUpdates);
      }
    } catch (err) {
      console.error('Error fetching career updates:', err);
      setError('Failed to load career updates');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updateData = {
        alumni_id: user.id,
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.is_current ? null : formData.end_date
      };

      let response;
      if (editingUpdate) {
        response = await apiService.updateCareerUpdate(editingUpdate.id, updateData);
      } else {
        response = await apiService.createCareerUpdate(updateData);
      }

      if (response.success) {
        setShowForm(false);
        setEditingUpdate(null);
        setFormData({
          company: '',
          designation: '',
          start_date: '',
          end_date: '',
          is_current: false,
          description: ''
        });
        fetchCareerUpdates();
        alert(editingUpdate ? 'Career update updated successfully!' : 'Career update added successfully!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (update) => {
    setEditingUpdate(update);
    setFormData({
      company: update.company || '',
      designation: update.designation || '',
      start_date: update.start_date ? update.start_date.split('T')[0] : '',
      end_date: update.end_date ? update.end_date.split('T')[0] : '',
      is_current: update.is_current || false,
      description: update.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (updateId) => {
    if (window.confirm('Are you sure you want to delete this career update?')) {
      setLoading(true);
      setError('');
      try {
        const response = await apiService.deleteCareerUpdate(updateId);
        if (response.success) {
          fetchCareerUpdates();
          alert('Career update deleted successfully!');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Present';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  if (!user) {
    return <div className="career-updates">Please log in to view career updates.</div>;
  }

  if (loading) {
    return <div className="career-updates">Loading career updates...</div>;
  }

  return (
    <div className="career-updates">
      <div className="career-updates-header">
        <h3>Career Timeline</h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          ➕ Add Career Update
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {careerUpdates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💼</div>
          <h4>No Career Updates Yet</h4>
          <p>Start building your career timeline by adding your work experience.</p>
        </div>
      ) : (
        <div className="career-timeline">
          {careerUpdates.map((update, index) => (
            <div key={update.id} className={`timeline-item ${update.is_current ? 'current' : ''}`}>
              <div className="timeline-marker">
                {update.is_current ? '📍' : '💼'}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <h4 className="job-title">{update.designation}</h4>
                  <div className="timeline-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleEdit(update)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(update.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="company-name">{update.company}</div>
                <div className="timeline-dates">
                  {formatDate(update.start_date)} - {formatDate(update.end_date)}
                  {update.is_current && <span className="current-badge">Current</span>}
                </div>
                {update.description && (
                  <div className="timeline-description">{update.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingUpdate ? 'Edit Career Update' : 'Add Career Update'}</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingUpdate(null);
                  setFormData({
                    company: '',
                    designation: '',
                    start_date: '',
                    end_date: '',
                    is_current: false,
                    description: ''
                  });
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="career-form">
              <div className="form-group">
                <label htmlFor="company">Company *</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Google, Microsoft"
                />
              </div>

              <div className="form-group">
                <label htmlFor="designation">Job Title *</label>
                <input
                  type="text"
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Software Engineer, Product Manager"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Start Date *</label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date">End Date</label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    disabled={formData.is_current}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_current"
                    checked={formData.is_current}
                    onChange={handleInputChange}
                  />
                  <span className="checkbox-text">This is my current position</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe your role and achievements..."
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUpdate(null);
                    setFormData({
                      company: '',
                      designation: '',
                      start_date: '',
                      end_date: '',
                      is_current: false,
                      description: ''
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingUpdate ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareerUpdates;
