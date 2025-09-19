
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import EventForm from '../components/EventForm';
import UpcomingEvents from '../components/UpcomingEvents';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import DashboardNavbar from '../components/DashboardNavbar';
import Footer from '../components/Landingpage/Footer';
import '../css/AdminDashboard.css';

function AdminDashboard(){
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState('');
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('alumni');
  const [analytics, setAnalytics] = useState(null);
  const [allAlumni, setAllAlumni] = useState([]);
  const [donations, setDonations] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [alumniView, setAlumniView] = useState('pending'); // 'pending' | 'all'
  const [actionLoading, setActionLoading] = useState({ id: null, type: null }); // {id, type: 'approve'|'decline'}
  
  const load = async ()=>{
    try{
      const data = await apiService.getPendingRequests();
      setPending(data);
      setMsg('');
    }catch(err){ 
      setMsg(err.message); 
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await apiService.getDashboardAnalytics();
      setAnalytics(data.analytics);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const loadAllAlumni = async () => {
    try {
      const data = await apiService.getAllAlumni();
      setAllAlumni(data.alumni || []);
    } catch (err) {
      console.error('Error loading all alumni:', err);
    }
  };

  const loadDonations = async () => {
    try {
      const data = await apiService.getDonations();
      setDonations(data.donations || []);
    } catch (err) {
      console.error('Error loading donations:', err);
    }
  };

  const loadMentorships = async () => {
    try {
      // Load all mentorships for admin view
      const data = await apiService.getAllMentorships();
      setMentorships(data.mentorships || []);
    } catch (err) {
      console.error('Error loading mentorships:', err);
    }
  };

  const loadMentorshipPrograms = async () => {
    try {
      const data = await apiService.getAdminMentorshipPrograms();
      setPrograms(data.programs || []);
    } catch (err) {
      console.error('Error loading mentorship programs:', err);
    }
  };

  const getMenteesCountForMentor = (row) => {
    const key = row.mentor_id ?? row.mentor_user_id ?? row.mentor_name;
    if (!key) return 0;
    return mentorships.filter(m => (m.mentor_id ?? m.mentor_user_id ?? m.mentor_name) === key).length;
  };

  const handleEventCreated = () => {
    // Refresh events list
    console.log('Event created successfully');
    setRefreshTrigger(prev => prev + 1);
    // Also refresh analytics so counters update immediately
    loadAnalytics();
  };
  useEffect(()=>{ 
    load();
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'alumni') {
      loadAllAlumni();
    } else if (activeTab === 'donations') {
      loadDonations();
    } else if (activeTab === 'mentorships') {
      loadMentorships();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'mentorships') {
      loadMentorshipPrograms();
    }
  }, [activeTab]);
  
  const act = async (id, action)=>{
    try{
      setActionLoading({ id, type: action });
      if (action === 'approve') {
        await apiService.approveAlumni(id);
      } else if (action === 'decline') {
        await apiService.declineAlumni(id);
      }
      await load(); // Reload the list
    }catch(err){ 
      setMsg(err.message); 
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };
  
  const viewDocument = (alumni) => {
    setSelectedAlumni(alumni);
    setShowModal(true);
  };
  
  const downloadDocument = async (id) => {
    try {
      const blob = await apiService.downloadDocument(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedAlumni?.document_original_name || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setMsg('Error downloading document: ' + err.message);
    }
  };
  return (
    <>
      <DashboardNavbar />
      <div className="admin-dashboard">
        <div className="admin-header">
          <div className="admin-title-section">
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Manage AlumniConnect Platform</p>
          </div>
          <div className="admin-stats">
            {analytics && (
              <>
                <div className="stat-card">
                  <div className="stat-number">{analytics.alumni.total}</div>
                  <div className="stat-label">Total Alumni</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{analytics.alumni.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{analytics.events.total}</div>
                  <div className="stat-label">Events</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">₹{analytics.donations.total}</div>
                  <div className="stat-label">Donations</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'alumni' ? 'active' : ''}`}
            onClick={() => setActiveTab('alumni')}
          >
            👥 Alumni Management
          </button>
          <button 
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            📅 Events
          </button>
          <button 
            className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
            onClick={() => setActiveTab('donations')}
          >
            💰 Donations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'mentorships' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentorships')}
          >
            🤝 Mentorships
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {msg && (
          <div className="error-message">
            {msg}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'alumni' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Alumni Management</h2>
              <div className="alumni-filters">
                <button
                  className={`filter-btn ${alumniView === 'pending' ? 'active' : ''}`}
                  onClick={() => setAlumniView('pending')}
                >
                  Pending ({pending.length})
                </button>
                <button
                  className={`filter-btn ${alumniView === 'all' ? 'active' : ''}`}
                  onClick={() => setAlumniView('all')}
                >
                  All Alumni ({allAlumni.length})
                </button>
              </div>
            </div>

            {alumniView === 'pending' ? (
              <div className="requests-container">
                {pending.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No Pending Requests</h3>
                    <p>All alumni registrations have been processed.</p>
                  </div>
                ) : (
                  <div className="requests-grid">
                    {pending.map(p => (
                      <div key={p.id} className="request-card">
                        <div className="request-header">
                          <div className="alumni-info">
                            <h3 className="alumni-name">{p.name}</h3>
                            <p className="alumni-email">{p.email}</p>
                          </div>
                          <div className="request-status pending">Pending</div>
                        </div>
                        
                        <div className="request-details">
                          <div className="detail-row">
                            <span className="detail-label">Degree:</span>
                            <span className="detail-value">{p.degree}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Year:</span>
                            <span className="detail-value">{p.graduation_year}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Department:</span>
                            <span className="detail-value">{p.department}</span>
                          </div>
                        </div>

                        <div className="request-actions">
                          {p.document_original_name ? (
                            <button 
                              className="btn btn-secondary"
                              onClick={()=>viewDocument(p)}
                            >
                              📄 View Document
                            </button>
                          ) : (
                            <span className="no-document">❌ No Document</span>
                          )}
                          
                          <div className="action-buttons">
                          <button 
                            className="btn btn-success"
                            disabled={actionLoading.id === p.id}
                            onClick={()=>act(p.id,'approve')}
                          >
                            {actionLoading.id === p.id && actionLoading.type === 'approve' ? '⏳ Approving...' : '✅ Approve'}
                          </button>
                          <button 
                            className="btn btn-danger"
                            disabled={actionLoading.id === p.id}
                            onClick={()=>act(p.id,'decline')}
                          >
                            {actionLoading.id === p.id && actionLoading.type === 'decline' ? '⏳ Declining...' : '❌ Decline'}
                          </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="requests-container">
                {allAlumni.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h3>No Alumni Found</h3>
                    <p>Alumni will appear here once they are registered.</p>
                  </div>
                ) : (
                  <div className="alumni-table-wrapper">
                    <table className="alumni-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Degree</th>
                          <th>Year</th>
                          <th>Department</th>
                          <th>Company</th>
                          <th>Designation</th>
                          <th>Experience</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAlumni.map((a, idx) => (
                          <tr key={a.id}>
                            <td>{idx + 1}</td>
                            <td>{a.name}</td>
                            <td className="mono">{a.email}</td>
                            <td>{a.degree || '-'}</td>
                            <td>{a.graduation_year || '-'}</td>
                            <td>{a.department || '-'}</td>
                            <td>{a.company || '-'}</td>
                            <td>{a.designation || '-'}</td>
                            <td>{a.years_experience ?? '-'}</td>
                            <td>
                              <span className={`status-chip ${a.status}`}>{a.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Event Management</h2>
              <button 
                className="btn btn-primary create-event-btn"
                onClick={() => setShowEventForm(true)}
              >
                ➕ Create Event
              </button>
            </div>
            
            <div className="events-container">
              <UpcomingEvents key={refreshTrigger} limit={10} />
            </div>
          </div>
        )}

        {activeTab === 'donations' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Donation Management</h2>
            </div>
            
            <div className="donations-list">
              {donations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💰</div>
                  <h3>No Donations Yet</h3>
                  <p>Donations will appear here once alumni start contributing.</p>
                </div>
              ) : (
                <div className="donations-grid">
                  {donations.map(donation => (
                    <div key={donation.id} className="donation-card">
                      <div className="donation-amount">₹{donation.amount}</div>
                      <div className="donation-details">
                        <div className="donor-name">{donation.donor_name}</div>
                        <div className="donation-date">{new Date(donation.created_at).toLocaleDateString()}</div>
                        <div className="donation-status">{donation.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mentorships' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Mentorship Management</h2>
            </div>
            
            <div className="mentorships-list">
              {programs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🤝</div>
                  <h3>No Mentorship Programs</h3>
                  <p>Programs created by mentors will appear here.</p>
                </div>
              ) : (
                <div className="alumni-table-wrapper">
                  <table className="alumni-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Mentor</th>
                        <th>Program</th>
                        <th>Joined / Batch</th>
                        <th>Active</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.map((p, idx) => (
                        <tr key={p.id}>
                          <td>{idx + 1}</td>
                          <td>{p.mentor_name || '-'}</td>
                          <td>{p.subject}</td>
                          <td>{p.joined_count}/{p.batch_size}</td>
                          <td>{p.is_active ? 'Yes' : 'No'}</td>
                          <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="tab-content">
            <AnalyticsDashboard />
          </div>
        )}

        {/* Document Modal */}
        {showModal && selectedAlumni && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Document Verification</h3>
                <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="alumni-details">
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedAlumni.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedAlumni.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Degree:</span>
                    <span className="detail-value">{selectedAlumni.degree}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Graduation Year:</span>
                    <span className="detail-value">{selectedAlumni.graduation_year}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Department:</span>
                    <span className="detail-value">{selectedAlumni.department}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Document:</span>
                    <span className="detail-value">{selectedAlumni.document_original_name}</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn btn-primary"
                  onClick={()=>downloadDocument(selectedAlumni.id)}
                >
                  📥 Download Document
                </button>
                <button 
                  className="btn btn-success"
                  disabled={actionLoading.id === selectedAlumni.id}
                  onClick={()=>{
                    act(selectedAlumni.id,'approve');
                    setShowModal(false);
                  }}
                >
                  {actionLoading.id === selectedAlumni.id && actionLoading.type === 'approve' ? '⏳ Approving...' : '✅ Approve Request'}
                </button>
                <button 
                  className="btn btn-danger"
                  disabled={actionLoading.id === selectedAlumni.id}
                  onClick={()=>{
                    act(selectedAlumni.id,'decline');
                    setShowModal(false);
                  }}
                >
                  {actionLoading.id === selectedAlumni.id && actionLoading.type === 'decline' ? '⏳ Declining...' : '❌ Decline Request'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Event Form Modal */}
        {showEventForm && (
          <EventForm 
            onEventCreated={handleEventCreated}
            onClose={() => setShowEventForm(false)}
          />
        )}

      </div>
      <Footer />
    </>
  )
}

export default AdminDashboard;
