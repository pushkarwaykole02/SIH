import "../../css/LandingpageCSS/HeroSection.css"
import { useNavigate } from "react-router-dom";

function HeroSection(){
    const navigate = useNavigate();
    return(
        <>
        <div id="hero-section" className="container">
            <div className="herocard">
                
            </div>
            <div className="blurbg">
                <h1>Connecting Alumni and Institutions</h1>
                <p>The ultimate platform to bridge the gap between alumni and their alma mater, fostering lifelong relationships and opportunities.</p>
                <button className="join-btn" onClick={() => navigate("/register")}>
                    <span className="btn-text-one">Join Now</span>
                    <span className="btn-text-two">Get Started</span>
                </button>
            </div>
        </div>
            
        </>
    );
}

export default HeroSection