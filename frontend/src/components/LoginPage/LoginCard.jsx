import "../../css/LoginpageCSS/LoginCard.css"
import { apiService } from "../../services/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginCard(){
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage('');

        try {
            await apiService.forgotPassword(forgotEmail);
            setForgotMessage('Password reset link sent to your email!');
            setForgotEmail('');
        } catch (err) {
            console.error('Forgot password error:', err);
            if (err.message.includes('<!DOCTYPE')) {
                setForgotMessage('Server is not running. Please start the backend server.');
            } else {
                setForgotMessage(err.message);
            }
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await apiService.loginAlumni(formData.email, formData.password);
            console.log('Login result:', result); // Debug log
            
            if (result.role === 'admin') {
                // Redirect to admin dashboard immediately
                navigate('/admin', { replace: true });
            } else if (result.role === 'alumni') {
                // Store alumni data and redirect to dashboard immediately
                localStorage.setItem('alumni', JSON.stringify(result.alumni));
                navigate('/alumni-dashboard', { replace: true });
            } else if (result.role === 'student') {
                // Store student data and redirect to student dashboard
                localStorage.setItem('student', JSON.stringify(result.user));
                navigate('/student-dashboard', { replace: true });
            } else if (result.role === 'recruiter') {
                // Store recruiter data and redirect to recruiter dashboard
                localStorage.setItem('recruiter', JSON.stringify(result.user));
                navigate('/recruiter-dashboard', { replace: true });
            } else {
                setError('Invalid response from server');
            }
        } catch (err) {
            console.error('Login error:', err); // Debug log
            const message = err.message || '';
            if (
                message.toLowerCase().includes('registration not approved') ||
                message.toLowerCase().includes('account is inactive')
            ) {
                try {
                    const profile = await apiService.getAlumni(formData.email);
                    if (profile?.status === 'pending') {
                        navigate('/pending', { replace: true });
                        return;
                    }
                    if (profile?.status === 'rejected') {
                        navigate('/rejected', { replace: true });
                        return;
                    }
                } catch (e) {}
            }
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return(
        <>
            <div className="login-page">
                <div className="oval-bg">
                    <div className="login-card">
                        <h1 className="login-title">AlumniConnect</h1>
                        <p className="login-subtitle">
                            Welcome back, please login to your account.
                        </p>

                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="error-message" style={{ color: 'red', marginBottom: '16px', textAlign: 'center', width: '75%' }}>
                                    {error}
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    placeholder="you@example.com" 
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Password </label>
                                <input 
                                    type="password" 
                                    name="password"
                                    placeholder="••••••••" 
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="forget-and-checkbox">
                                <div className="checkbox">
                                    <input type="checkbox" id="myCheckbox" name="options" value="remeberme"></input>
                                    <label htmlFor="myCheckbox">Remember me</label>
                                </div>
                                <div className="forget-password">
                                    <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>Forgot Password?</a>
                                </div>
                            </div>
                            

                            <button type="submit" className="loginBtn" disabled={isLoading}>
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                        <p className="signup-text">
                            Don't have an account? <a href="/register">Create an account</a>
                        </p>
                        </div>
                </div>
            </div>

            {/* Forgot Password Modal - Outside login-page to ensure proper z-index */}
            {showForgotPassword && (
                <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reset Password</h2>
                            <button className="close-btn" onClick={() => setShowForgotPassword(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="jaagaa">Enter your email address and we'll send you a link to reset your password.</p>
                            <form onSubmit={handleForgotPassword}>
                                <div className="motha">
                                    <label>Email Address</label>
                                    <input
                                        type="email" 
                                        placeholder="you@example.com"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                {forgotMessage && (
                                    <div className={`message ${forgotMessage.includes('sent') ? 'success' : 'error'}`}>
                                        {forgotMessage}
                                    </div>
                                )}
                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowForgotPassword(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={forgotLoading}>
                                        {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default LoginCard