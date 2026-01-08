import "../../css/LoginpageCSS/LoginNavbar.css"
import { useNavigate } from "react-router-dom";
import logo from "../Landingpage/assets/logo.png";

function LoginNavbar() {
    const navigate = useNavigate();
    return(
       <>
            <div className="navbar">
                <div className="brand" onClick={() => navigate("/")} role="button" tabIndex={0} aria-label="Go to home">
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
                <div className="btn"></div>
            </div>
        </>
    );
}

export default LoginNavbar;