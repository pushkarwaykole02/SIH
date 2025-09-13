import Navbar from "../components/Landingpage/Navbar";
import Footer from "../components/Landingpage/Footer";
import "../css/LandingpageCSS/NostalgiaRepo.css";

function NostalgiaRepoPage(){
    return(
        <>
            <Navbar />
            <section className="nostalgia-hero">
                <h1>Relive your college days with our collection of photos, videos, and stories.</h1>
                <p>Take a walk down memory lane — campus fests, classrooms, chai spots, and lifelong friendships.</p>
            </section>

            <section className="nostalgia-gallery">
                <div className="gallery-grid">
                    <img src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop" alt="Campus festival lights" />
                    <img src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop" alt="Friends sitting on stairs" />
                    <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop" alt="Library corner" />
                    <img src="https://images.unsplash.com/photo-1519452575417-564c1401ecc0?q=80&w=1200&auto=format&fit=crop" alt="Cultural performance" />
                    <img src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop" alt="Classroom vibes" />
                    <img src="https://images.unsplash.com/photo-1529336953121-c9e3d7f5f63f?q=80&w=1200&auto=format&fit=crop" alt="Hostel corridor" />
                </div>
            </section>

            <section className="nostalgia-stories">
                <h2>Stories from the Quad</h2>
                <div className="stories-grid">
                    <article className="story-card">
                        <h3>The Night Before Submissions</h3>
                        <p>We turned the lab into a war-room. Coffee cups, code, and chaos. At sunrise, we walked out with bleary eyes and the wildest sense of victory.</p>
                        <span className="story-meta">Class of 2018 • CSE</span>
                    </article>
                    <article className="story-card">
                        <h3>Chai at the Old Canteen</h3>
                        <p>Every 4 PM lecture magically became a chai meetup. Friendships brewed stronger than the tea, and ideas flowed like monsoon rain.</p>
                        <span className="story-meta">Class of 2016 • ECE</span>
                    </article>
                    <article className="story-card">
                        <h3>Fest Season Fever</h3>
                        <p>Three sleepless nights, a stage full of lights, and the crowd singing with us — nothing matched the madness of fest season.</p>
                        <span className="story-meta">Class of 2019 • Arts Club</span>
                    </article>
                </div>
            </section>

            <Footer />
        </>
    );
}

export default NostalgiaRepoPage;

