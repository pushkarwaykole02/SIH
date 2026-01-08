import DashboardNavbar from '../components/DashboardNavbar';
import Footer from '../components/Landingpage/Footer';
import '../css/AlumniDashboard.css';
import { useNavigate } from 'react-router-dom';

function RejectedPage(){
  const navigate = useNavigate();

  const handleReapply = () => {
    navigate('/register', { replace: true });
  };

  const handleContact = () => {
    navigate('/#contact-us');
  };

  return (
    <>
      <DashboardNavbar />
      <div className="alumni-dashboard">
        <div className="status-container">
          <div className="status-card declined">
            <div className="status-icon">❌</div>
            <h2>Registration Rejected</h2>
            <p className='space'>We’re sorry — your verification was not successful this time.</p>
            <div className="status-details">
              <div className="detail-item">
                <span className="detail-label">What you can do:</span>
                <span className="detail-value">Reapply with updated details or reach out to admins</span>
              </div>
            </div>
            <div className="status-actions">
              <button className="btn btn-primary" onClick={handleReapply}>Reapply</button>
              <button className="btn btn-secondary" onClick={handleContact}>Contact Admins</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default RejectedPage;


