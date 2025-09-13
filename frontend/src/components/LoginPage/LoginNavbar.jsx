import "../../css/LoginpageCSS/LoginNavbar.css"
import { useNavigate } from "react-router-dom";

function LoginNavbar() {
    const navigate = useNavigate();
    return(
       <>
            <div className="navbar">
                <div className="brand" onClick={() => navigate("/")} role="button" tabIndex={0} aria-label="Go to home">
                    <span className="brand__logo" aria-hidden>AC</span>
                    <h1 className="brand__name">AlumniConnect</h1>
                </div>
                <div className="btn"></div>
            </div>
        </>
    );
}

export default LoginNavbar;