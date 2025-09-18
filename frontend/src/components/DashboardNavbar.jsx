import React, { useEffect, useState } from "react"
import "../css/LandingpageCSS/Navbar.css"
import { useNavigate } from "react-router-dom";
import logo from "./Landingpage/assets/logo.png";
import NotificationSystem from "./NotificationSystem";

function DashboardNavbar() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const onScroll = () => {
            setIsScrolled(window.scrollY > 8);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        // Get current user from localStorage
        const alumni = localStorage.getItem('alumni');
        const student = localStorage.getItem('student');
        const recruiter = localStorage.getItem('recruiter');
        const admin = localStorage.getItem('admin');
        
        if (alumni) {
            setCurrentUser(JSON.parse(alumni));
        } else if (student) {
            setCurrentUser(JSON.parse(student));
        } else if (recruiter) {
            setCurrentUser(JSON.parse(recruiter));
        } else if (admin) {
            setCurrentUser(JSON.parse(admin));
        }
    }, []);

    const handleNavigate = (path) => {
        setIsMenuOpen(false);
        navigate(path);
    };

    const handleContactClick = () => {
        setIsMenuOpen(false);
        // If on landing page, scroll to contact section
        if (window.location.pathname === '/') {
            const contactSection = document.getElementById('contact-us');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // If on other pages, navigate to landing page with hash
            navigate('/#contact-us');
        }
    };

    const handleLogout = () => {
        // Clear localStorage and redirect to landing page
        localStorage.removeItem('alumni');
        navigate('/');
    };

    return(
       <>
            <header className={`navbar ${isScrolled ? "navbar--scrolled" : ""}`}>
                <div className="navbar__left" onClick={() => handleNavigate("/")} role="button" tabIndex={0} aria-label="Go to home">
                    <div className="brand" onClick={() => handleNavigate("/")}>
                        <img 
                            src={logo} 
                            alt="AlumniConnect Logo" 
                            className="brand__logo"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'inline-flex';
                            }}
                        />
                        <span className="brand__logo-fallback" style={{display: 'none'}}>AC</span>
                        <h1 className="brand__name">AlumniConnect</h1>
                    </div>
                </div>

                <nav className={`nav ${isMenuOpen ? "nav--open" : ""}`} aria-label="Main">
                    <ul className="nav-link">
                        <li><a onClick={() => handleNavigate("/notable-alumni")}>Notable Alumni</a></li>
                        <li><a onClick={() => handleNavigate("/nostalgia")}>Nostalgia Repo</a></li>
                        <li><a onClick={handleContactClick}>Contact Us</a></li>
                        <li><a onClick={() => handleNavigate("/faq")}>FAQ</a></li>
                        <li><a onClick={() => handleNavigate("/about")}>About</a></li>
                    </ul>
                </nav>

                <div className="navbar-actions">
                    {currentUser && (
                        <div className="notification-container">
                            <button 
                                className="notification-btn"
                                onClick={() => setShowNotifications(!showNotifications)}
                                aria-label="Notifications"
                            >
                                🔔
                            </button>
                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <NotificationSystem user={currentUser} />
                                </div>
                            )}
                        </div>
                    )}
                    <div className="btn">
                        <button className="logout-btn" onClick={handleLogout}>Logout</button>
                    </div>
                </div>

                <button
                    className={`hamburger ${isMenuOpen ? "is-active" : ""}`}
                    aria-label="Toggle menu"
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span className="hamburger__line"></span>
                    <span className="hamburger__line"></span>
                    <span className="hamburger__line"></span>
                </button>
            </header>
        </>
    );
}

export default DashboardNavbar;
