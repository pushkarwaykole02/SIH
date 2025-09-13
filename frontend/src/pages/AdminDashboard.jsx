
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import EventForm from '../components/EventForm';
import UpcomingEvents from '../components/UpcomingEvents';
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
  
  const load = async ()=>{
    try{
      const data = await apiService.getPendingRequests();
      setPending(data);
      setMsg('');
    }catch(err){ 
      setMsg(err.message); 
    }
  };

  const handleEventCreated = () => {
    // Refresh events list
    console.log('Event created successfully');
    setRefreshTrigger(prev => prev + 1);
  };
  useEffect(()=>{ load() },[]);
  
  const act = async (id, action)=>{
    try{
      if (action === 'approve') {
        await apiService.approveAlumni(id);
      } else if (action === 'decline') {
        await apiService.declineAlumni(id);
      }
      load(); // Reload the list
    }catch(err){ 
      setMsg(err.message); 
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
            <p className="admin-subtitle">Manage Alumni Registration Requests</p>
          </div>
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-number">{pending.length}</div>
              <div className="stat-label">Pending Requests</div>
            </div>
          </div>
        </div>

        {msg && (
          <div className="error-message">
            {msg}
          </div>
        )}

        <div className="requests-container">
          {pending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Pending Requests</h3>
              <p style={{marginLeft: '340px'}}>All alumni registrations have been processed.</p>
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
                        onClick={()=>act(p.id,'approve')}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={()=>act(p.id,'decline')}
                      >
                        ❌ Decline
                      </button>
                      <button 
                        className="btn btn-info"
                        onClick={()=>alert(JSON.stringify(p,null,2))}
                      >
                        👁️ Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
                  onClick={()=>{
                    act(selectedAlumni.id,'approve');
                    setShowModal(false);
                  }}
                >
                  ✅ Approve Request
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={()=>{
                    act(selectedAlumni.id,'decline');
                    setShowModal(false);
                  }}
                >
                  ❌ Decline Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Management Section */}
        <div className="admin-section">
          <div className="section-header">
            <h2 className="section-title">Event Management</h2>
            <button 
              className="btn btn-primary create-event-btn"
              onClick={() => setShowEventForm(true)}
            >
              ➕ Create Event
            </button>
          </div>
          
          <div className="events-container">
            <UpcomingEvents key={refreshTrigger} limit={5} />
          </div>
        </div>

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
