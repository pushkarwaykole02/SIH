import Navbar from "../components/Landingpage/Navbar";
import Footer from "../components/Landingpage/Footer";
import "../css/PageLayout.css";

function FAQPage(){
    return(
        <div className="page-container faq-page">
            <Navbar />
            <div className="page-content">
                <main className="page-main faq-content">
                    <h1>Frequently Asked Questions</h1>
                    <div style={{ marginTop: 16 }}>
                        <details open>
                            <summary>What is AlumniConnect?</summary>
                            <p>AlumniConnect is a platform to connect alumni with their institute and peers through events, mentorship, job postings, and community features.</p>
                        </details>
                        <details>
                            <summary>How do I register?</summary>
                            <p>Click Register in the navbar, fill in your details, and verify your email to get started.</p>
                        </details>
                        <details>
                            <summary>Is my data secure?</summary>
                            <p>Yes. We use industry best practices for authentication and protect your personal information with secure storage.</p>
                        </details>
                        <details>
                            <summary>Can I share photos and stories?</summary>
                            <p>Yes, the Nostalgia Repo lets you share curated photos, videos, and stories from campus life.</p>
                        </details>
                        <details>
                            <summary>How do I contact support?</summary>
                            <p>Use the Contact Us section on the landing page to email or call us.</p>
                        </details>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

export default FAQPage;

