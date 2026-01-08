import DashboardNavbar from '../components/DashboardNavbar';
import Footer from '../components/Landingpage/Footer';
import '../css/AlumniDashboard.css';

function PendingVerification(){
  return (
    <>
      <DashboardNavbar />
      <div className="alumni-dashboard">
        <div className="status-container">
          <div className="status-card pending">
            <div className="status-icon">⏳</div>
            <h2>Verification Pending</h2>
            <p className="space">Your registration request has been submitted and is under review.</p>
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

export default PendingVerification;


