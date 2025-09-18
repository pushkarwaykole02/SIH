import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import Footer from '../components/Landingpage/Footer';
import '../css/RecruiterDashboard.css';

function RecruiterDashboard() {
  const [recruiter, setRecruiter] = useState(null);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Job form state
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    description: '',
    location: '',
    job_type: 'full-time',
    salary_range: '',
    requirements: '',
    status: 'active'
  });

  useEffect(() => {
    const recruiterData = localStorage.getItem('recruiter');
    if (recruiterData) {
      try {
        setRecruiter(JSON.parse(recruiterData));
        loadData();
      } catch (err) {
        setMsg('Error loading recruiter data');
      }
    } else {
      setMsg('No recruiter data found. Please login again.');
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'jobs') {
        const jobsResponse = await apiService.getJobs();
        if (jobsResponse.success) {
          setJobs(jobsResponse.jobs);
        }
      } else if (activeTab === 'alumni') {
        const alumniResponse = await apiService.getAllAlumni();
        if (alumniResponse.success) {
          setAlumni(alumniResponse.alumni);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recruiter) {
      loadData();
    }
  }, [activeTab, recruiter]);

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiService.createJob({
        ...jobForm,
        recruiter_id: recruiter.id
      });

      if (response.success) {
        setShowJobForm(false);
        setJobForm({
          title: '',
          company: '',
          description: '',
          location: '',
          job_type: 'full-time',
          salary_range: '',
          requirements: '',
          status: 'active'
        });
        loadData(); // Refresh jobs list
        alert('Job posted successfully!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJobFormChange = (e) => {
    const { name, value } = e.target;
    setJobForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!recruiter) {
    return (
      <>
        <DashboardNavbar />
        <div className="recruiter-dashboard">
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <h2>Loading your profile...</h2>
            {msg && <div className="error-message">{msg}</div>}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <DashboardNavbar />
      <div className="recruiter-dashboard">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome, {recruiter.email}! 👋</h1>
            <p className="welcome-subtitle">Recruiter Dashboard</p>
          </div>
          <div className="profile-card">
            <div className="profile-avatar">
              <span className="avatar-text">{recruiter.email.charAt(0).toUpperCase()}</span>
            </div>
            <div className="profile-info">
              <h3>Recruiter Account</h3>
              <p>{recruiter.email}</p>
              <span className="status-badge approved">✓ Active Recruiter</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            💼 My Jobs
          </button>
          <button
            className={`tab-btn ${activeTab === 'alumni' ? 'active' : ''}`}
            onClick={() => setActiveTab('alumni')}
          >
            👥 Browse Alumni
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'jobs' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Job Management</h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowJobForm(true)}
              >
                ➕ Post New Job
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
              <div className="loading-state">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <h3>No Jobs Posted Yet</h3>
                <p>Start by posting your first job opportunity.</p>
              </div>
            ) : (
              <div className="jobs-grid">
                {jobs.map(job => (
                  <div key={job.id} className="job-card">
                    <div className="job-header">
                      <h3 className="job-title">{job.title}</h3>
                      <span className={`job-status status-${job.status}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="job-company">{job.company}</div>
                    <div className="job-location">📍 {job.location}</div>
                    <div className="job-type">{job.job_type}</div>
                    {job.salary_range && (
                      <div className="job-salary">💰 {job.salary_range}</div>
                    )}
                    <div className="job-description">
                      {job.description.substring(0, 150)}...
                    </div>
                    <div className="job-requirements">
                      <strong>Requirements:</strong> {job.requirements}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alumni' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Alumni Directory</h2>
              <p>Browse and connect with talented alumni</p>
            </div>

            {loading ? (
              <div className="loading-state">Loading alumni...</div>
            ) : alumni.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No Alumni Found</h3>
                <p>Alumni profiles will appear here once they register.</p>
              </div>
            ) : (
              <div className="alumni-grid">
                {alumni.map(alumnus => (
                  <div key={alumnus.id} className="alumnus-card">
                    <div className="alumnus-header">
                      <h3 className="alumnus-name">{alumnus.name}</h3>
                      <span className={`alumnus-status status-${alumnus.user_status}`}>
                        {alumnus.user_status}
                      </span>
                    </div>
                    <div className="alumnus-email">{alumnus.email}</div>
                    <div className="alumnus-degree">{alumnus.degree} - {alumnus.graduation_year}</div>
                    <div className="alumnus-department">{alumnus.department}</div>
                    {alumnus.company && (
                      <div className="alumnus-company">🏢 {alumnus.company}</div>
                    )}
                    {alumnus.designation && (
                      <div className="alumnus-designation">{alumnus.designation}</div>
                    )}
                    {alumnus.years_experience && (
                      <div className="alumnus-experience">
                        {alumnus.years_experience} years experience
                      </div>
                    )}
                    <div className="alumnus-actions">
                      <button className="btn btn-primary">Contact</button>
                      <button className="btn btn-secondary">View Profile</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Job Form Modal */}
        {showJobForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Post New Job</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowJobForm(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleJobSubmit} className="job-form">
                <div className="form-group">
                  <label htmlFor="title">Job Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={jobForm.title}
                    onChange={handleJobFormChange}
                    required
                    placeholder="e.g., Software Engineer"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="company">Company *</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={jobForm.company}
                    onChange={handleJobFormChange}
                    required
                    placeholder="e.g., Tech Corp"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Job Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    value={jobForm.description}
                    onChange={handleJobFormChange}
                    required
                    rows="4"
                    placeholder="Describe the role and responsibilities..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="location">Location *</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={jobForm.location}
                      onChange={handleJobFormChange}
                      required
                      placeholder="e.g., Mumbai, India"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="job_type">Job Type *</label>
                    <select
                      id="job_type"
                      name="job_type"
                      value={jobForm.job_type}
                      onChange={handleJobFormChange}
                      required
                    >
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="salary_range">Salary Range</label>
                  <input
                    type="text"
                    id="salary_range"
                    name="salary_range"
                    value={jobForm.salary_range}
                    onChange={handleJobFormChange}
                    placeholder="e.g., 5-10 LPA"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="requirements">Requirements</label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    value={jobForm.requirements}
                    onChange={handleJobFormChange}
                    rows="3"
                    placeholder="List the required skills and qualifications..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowJobForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Posting...' : 'Post Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default RecruiterDashboard;
