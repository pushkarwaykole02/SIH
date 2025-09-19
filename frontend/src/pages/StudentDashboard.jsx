import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UpcomingEvents from '../components/UpcomingEvents';
import MentorshipModule from '../components/MentorshipModule';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import DashboardNavbar from '../components/DashboardNavbar';
import Footer from '../components/Landingpage/Footer';
import '../css/StudentDashboard.css';

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    // Get student data from localStorage (set during login)
    const studentData = localStorage.getItem('student');
    console.log('Student data from localStorage:', studentData); // Debug log
    if (studentData) {
      try {
        const parsedData = JSON.parse(studentData);
        console.log('Parsed student data:', parsedData); // Debug log
        setStudent(parsedData);
      } catch (err) {
        console.error('Error parsing student data:', err); // Debug log
        setMsg('Error loading student data');
      }
    } else {
      setMsg('No student data found. Please login again.');
    }
  }, []);

  if (!student) {
    return (
      <>
        <DashboardNavbar />
        <div className="student-dashboard">
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
      <div className="student-dashboard">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1 className="welcome-title">Welcome, {student.name || 'Student'}! 👋</h1>
            <p className="welcome-subtitle">Your Student Dashboard</p>
          </div>
          <div className="profile-card">
            <div className="profile-avatar">
              <span className="avatar-text">{(student.name || 'S').charAt(0)}</span>
            </div>
            <div className="profile-info">
              <h3>{student.name || 'Student'}</h3>
              <h5>{student.department || 'Department'}</h5>
              <span className="status-badge student">🎓 Student</span>
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
              🤝 View Mentorship Programs
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 View Analytics
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-info">
                    <div className="stat-number">Student</div>
                    <div className="stat-label">Status</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <div className="stat-number">{student.department || 'Department'}</div>
                    <div className="stat-label">Department</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <div className="stat-number">Active</div>
                    <div className="stat-label">Learning</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions removed as requested; 'View Analytics' moved to top navigation */}

              {/* Recent Events Preview */}
              <div className="events-section">
                <h3 className="events-title">Upcoming Events</h3>
                <div className="events-container">
                  <UpcomingEvents limit={3} showRSVP={true} />
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
            <MentorshipModule user={student} userRole="student" />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default StudentDashboard;
