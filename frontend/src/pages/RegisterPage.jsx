import RegisterCard from "../components/RegisterPage/RegisterCard";
import LoginNavbar from "../components/LoginPage/LoginNavbar";
import Footer from '../components/Landingpage/Footer';
import '../css/RegisterPage.css';

function RegisterPage(){
    return(
        <div className="register-page-container">
            <LoginNavbar />
            <div className="register-main-content">
                <div className="register-hero-section">
                    <div className="register-hero-content">
                        <h1 className="register-hero-title">Join Our Community!</h1>
                        <p className="register-hero-subtitle">Become part of the AlumniConnect family and unlock endless opportunities for networking, mentorship, and growth.</p>
                        <div className="register-benefits">
                            <div className="benefit-item">
                                <span className="benefit-icon">🌟</span>
                                <div className="benefit-content">
                                    <h3>Exclusive Access</h3>
                                    <p>Connect with verified alumni from your institution</p>
                                </div>
                            </div>
                            <div className="benefit-item">
                                <span className="benefit-icon">🚀</span>
                                <div className="benefit-content">
                                    <h3>Career Growth</h3>
                                    <p>Find mentors, job opportunities, and career guidance</p>
                                </div>
                            </div>
                            <div className="benefit-item">
                                <span className="benefit-icon">🎉</span>
                                <div className="benefit-content">
                                    <h3>Events & Networking</h3>
                                    <p>Attend exclusive events and build meaningful connections</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="register-form-section">
                    <RegisterCard />
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default RegisterPage;