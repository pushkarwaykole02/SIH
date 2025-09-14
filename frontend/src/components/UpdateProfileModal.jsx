import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import '../css/UpdateProfileModal.css';

function UpdateProfileModal({ isOpen, onClose, alumni, onProfileUpdated }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    degree: '',
    graduation_year: '',
    department: '',
    address: '',
    city: '',
    state: '',
    country: '',
    linkedin: '',
    github: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (alumni && isOpen) {
      setFormData({
        name: alumni.name || '',
        phone: alumni.phone || '',
        degree: alumni.degree || '',
        graduation_year: alumni.graduation_year || '',
        department: alumni.department || '',
        address: alumni.address || '',
        city: alumni.city || '',
        state: alumni.state || '',
        country: alumni.country || '',
        linkedin: alumni.linkedin || '',
        github: alumni.github || ''
      });
      setError('');
      setSuccess('');
    }
  }, [alumni, isOpen]);

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
      const result = await apiService.updateAlumniProfile(alumni.id, formData);
      setSuccess('Profile updated successfully!');
      
      // Update localStorage with new data
      localStorage.setItem('alumni', JSON.stringify(result.alumni));
      
      // Notify parent component
      if (onProfileUpdated) {
        onProfileUpdated(result.alumni);
      }
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="update-profile-overlay" onClick={onClose}>
      <div className="update-profile-container" onClick={(e) => e.stopPropagation()}>
        <div className="update-profile-header">
          <h2>Update Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="update-profile-form">
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const phoneValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData(prev => ({ ...prev, phone: phoneValue }));
                }}
                placeholder="1234567890"
                pattern="[0-9]{10}"
                maxLength="10"
                style={{
                  borderColor: formData.phone && formData.phone.length !== 10 ? '#ff4444' : '',
                  backgroundColor: formData.phone && formData.phone.length !== 10 ? '#fff5f5' : ''
                }}
              />
              {formData.phone && formData.phone.length !== 10 && (
                <small style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Phone number must be exactly 10 digits
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="degree">Degree</label>
              <input
                type="text"
                id="degree"
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                placeholder="e.g., B.Tech, M.Tech, MBA"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="graduation_year">Graduation Year</label>
              <input
                type="number"
                id="graduation_year"
                name="graduation_year"
                value={formData.graduation_year}
                onChange={handleChange}
                placeholder="e.g., 2022"
                min="1950"
                max="2100"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g., CSE, ECE, ME, CE"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your address"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter your city"
              />
            </div>
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter your state"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Enter your country"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn Profile</label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="github">GitHub Profile</label>
              <input
                type="url"
                id="github"
                name="github"
                value={formData.github}
                onChange={handleChange}
                placeholder="https://github.com/username"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProfileModal;
