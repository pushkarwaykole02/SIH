import React from "react";
import "../../css/LandingpageCSS/ContactUs.css";

function ContactUs() {
    return (
        <section id="contact-us" className="contact-section">
            <div className="contact-container">
                <h2>Get in Touch</h2>
                <p>Have questions or want to connect? We'd love to hear from you!</p>
                
                <div className="contact-info">
                    <div className="contact-item">
                        <div className="contact-icon">📧</div>
                        <div className="contact-details">
                            <h3>Email Us</h3>
                            <a href="mailto:pushkarwaykole73@gmail.com" className="contact-link">
                                pushkarwaykole73@gmail.com
                            </a>
                        </div>
                    </div>
                    
                    <div className="contact-item">
                        <div className="contact-icon">📞</div>
                        <div className="contact-details">
                            <h3>Call Us</h3>
                            <a href="tel:+918484071702" className="contact-link">
                                +91 8484071702
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ContactUs;