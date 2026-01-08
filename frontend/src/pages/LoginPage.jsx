import LoginCard from "../components/LoginPage/LoginCard";
import LoginNavbar from "../components/LoginPage/LoginNavbar";
import Footer from '../components/Landingpage/Footer'
import '../css/LoginPage.css'

function LoginPage(){
    return(
        <div className="login-page-container">
            <LoginNavbar/>
            <div className="login-main-content">
                <div className="login-hero-section">
                    <div className="login-hero-content">
                        <h1 className="login-hero-title">Welcome Back!</h1>
                        <p className="login-hero-subtitle">Sign in to your AlumniConnect account and continue your journey with fellow alumni.</p>
                        <div className="login-features">
                            <div className="feature-item">
                                <span className="feature-icon">🎓</span>
                                <span>Connect with Alumni</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon">📅</span>
                                <span>Join Events</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon">🤝</span>
                                <span>Network & Mentor</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="login-form-section">
                    <LoginCard />
                </div>
            </div>
            <Footer />
        </div>
    );
}
export default LoginPage;