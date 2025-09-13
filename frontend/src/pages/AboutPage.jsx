import Navbar from "../components/Landingpage/Navbar";
import Footer from "../components/Landingpage/Footer";
import "../css/PageLayout.css";

function AboutPage(){
    return(
        <div className="page-container about-page">
            <Navbar />
            <div className="page-content">
                <main className="page-main about-content">
                    <div className="about-main">
                        <h1>About AlumniConnect</h1>
                        <p>
                            AlumniConnect is an alumni engagement platform designed to strengthen the bond between graduates and their alma mater. Our goal is to foster meaningful connections, mentorship, and opportunities across batches and departments.
                        </p>
                        <h3>What we offer</h3>
                        <ul>
                            <li>Community updates, events, and reunions</li>
                            <li>Mentorship and networking between alumni and students</li>
                            <li>Job postings, referrals, and career resources</li>
                            <li>Nostalgia Repo to relive campus memories</li>
                        </ul>
                        <h3>Our mission</h3>
                        <p>
                            To build a vibrant alumni ecosystem that supports lifelong learning, collaboration, and giving back to the community.
                        </p>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

export default AboutPage;

