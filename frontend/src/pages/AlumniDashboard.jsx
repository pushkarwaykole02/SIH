
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UpcomingEvents from '../components/UpcomingEvents';
import UpdateProfileModal from '../components/UpdateProfileModal';
import EventRSVP from '../components/EventRSVP';
import MentorshipModule from '../components/MentorshipModule';
import DonationsModule from '../components/DonationsModule';
import CareerUpdates from '../components/CareerUpdates';
import RecommendationEngine from '../components/RecommendationEngine';
import DashboardNavbar from '../components/DashboardNavbar';
import Footer from '../components/Landingpage/Footer';
import '../css/AlumniDashboard.css';

function AlumniDashboard(){
  const [alumni, setAlumni] = useState(null);
  const [msg, setMsg] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const handleReapply = () => {
    navigate('/register');
  };

  const handleContactSupport = () => {
    navigate('/#contact-us');
  };

  const handleUpdateProfile = () => {
    setShowUpdateModal(true);
  };

  const handleProfileUpdated = (updatedAlumni) => {
    setAlumni(updatedAlumni);
    setShowUpdateModal(false);
  };

  const handleJoinDiscussions = () => {
    window.open('https://discord.gg/KG96wAZK', '_blank');
  };

  useEffect(() => {
    // Get alumni data from localStorage (set during login)
    const alumniData = localStorage.getItem('alumni');
    if (alumniData) {
      try {
        setAlumni(JSON.parse(alumniData));
      } catch (err) {
        setMsg('Error loading alumni data');
      }
    } else {
      setMsg('No alumni data found. Please login again.');
    }
  }, []);

  if (!alumni) {
    return (
      <>
        <DashboardNavbar />
        <div className="alumni-dashboard">
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

  if (alumni.status === 'pending'){
    return (
      <>
        <DashboardNavbar />
        <div className="alumni-dashboard">
          <div className="status-container">
            <div className="status-card pending">
              <div className="status-icon">⏳</div>
              <h2>Verification Pending</h2>
              <p className="space">Your registration request has been submitted and is under review.</p>
              <div className="status-details">
                <div className="detail-item">
                  <span className="detail-label">Submitted:</span>
                  <span className="detail-value">{new Date(alumni.created_at).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value status-badge pending">Under Review</span>
                </div>
              </div>
              <div className="status-message">
                <p>📧 You'll receive an email notification once your account is approved.</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (alumni.status === 'rejected'){
    return (
      <>
        <DashboardNavbar />
        <div className="alumni-dashboard">
          <div className="status-container">
            <div className="status-card declined">
              <div className="status-icon">❌</div>
              <h2>Registration Rejected</h2>
              <p className='space'>Unfortunately, your registration request was not approved.</p>
              <div className="status-details">
                <div className="detail-item">
                  <span className="detail-label">Reason:</span>
                  <span className="detail-value">Document verification failed</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact:</span>
                  <span className="detail-value">pushkarwaykole73@gmail.com</span>
                </div>
              </div>
              <div className="status-actions">
                <button className="btn btn-primary" onClick={handleContactSupport}>Contact Support</button>
                <button className="btn btn-secondary" onClick={handleReapply}>Reapply</button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // approved
  return (
    <>
      <DashboardNavbar />
      <div className="alumni-dashboard">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome back, {alumni.name}! 👋</h1>
            <p className="welcome-subtitle">Your AlumniConnect dashboard</p>
          </div>
          <div className="profile-card">
            <div className="profile-avatar">
              <span className="avatar-text">{alumni.name.charAt(0)}</span>
            </div>
            <div className="profile-info">
              <h3>{alumni.name}</h3>
              <h5>{alumni.degree} • {alumni.graduation_year}</h5>
              <span className="status-badge approved">✓ Verified Alumni</span>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Navigation Tabs */}
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              📅 Events
            </button>
            <button 
              className={`tab-btn ${activeTab === 'mentorship' ? 'active' : ''}`}
              onClick={() => setActiveTab('mentorship')}
            >
              🤝 Mentorship
            </button>
            <button 
              className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
              onClick={() => setActiveTab('donations')}
            >
              💝 Donations
            </button>
            <button 
              className={`tab-btn ${activeTab === 'career' ? 'active' : ''}`}
              onClick={() => setActiveTab('career')}
            >
              💼 Career Timeline
            </button>
            <button 
              className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              🎯 Recommendations
            </button>
            <button 
              className="tab-btn"
              onClick={handleUpdateProfile}
            >
              📝 Update Profile
            </button>
            <button 
              className="tab-btn"
              onClick={handleJoinDiscussions}
            >
              💬 Join Discussions
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-info">
                    <div className="stat-number">{alumni.degree}</div>
                    <div className="stat-label">Degree</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-info">
                    <div className="stat-number">{alumni.graduation_year}</div>
                    <div className="stat-label">Graduation Year</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏢</div>
                  <div className="stat-info">
                    <div className="stat-number">{alumni.department}</div>
                    <div className="stat-label">Department</div>
                  </div>
                </div>
                {alumni.company && (
                  <div className="stat-card">
                    <div className="stat-icon">💼</div>
                    <div className="stat-info">
                      <div className="stat-number">{alumni.company}</div>
                      <div className="stat-label">Current Company</div>
                    </div>
                  </div>
                )}
              </div>

             {/* Quick Actions removed as requested; actions moved to top navigation */}

              {/* Recent Events Preview */}
              <div className="events-section">
                <h3 className="events-title">Upcoming Events</h3>
                <div className="events-container">
                  <UpcomingEvents limit={3} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'events' && (
            <div className="events-section">
              <h3 className="events-title">All Events</h3>
              <div className="events-container">
                <UpcomingEvents showRSVP={true} />
              </div>
            </div>
          )}

          {activeTab === 'mentorship' && (
            <MentorshipModule user={alumni} userRole="alumni" />
          )}

          {activeTab === 'donations' && (
            <DonationsModule user={alumni} />
          )}

          {activeTab === 'career' && (
            <CareerUpdates user={alumni} />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationEngine user={alumni} userRole="alumni" />
          )}
        </div>

        {/* Update Profile Modal */}
        <UpdateProfileModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          alumni={alumni}
          onProfileUpdated={handleProfileUpdated}
        />
      </div>
      <Footer />
    </>
  )
}

export default AlumniDashboard;
