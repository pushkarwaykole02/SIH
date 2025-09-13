import Footer from "../components/Landingpage/Footer";
import HeroSection from "../components/Landingpage/HeroSection";
import KeyFeature from "../components/Landingpage/KeyFeature";
import Navbar from "../components/Landingpage/Navbar";
import ContactUs from "../components/Landingpage/ContactUs";

function LandingPage() {
    return(
        <>
            <Navbar/>
            <HeroSection/>
            <KeyFeature />
            <ContactUs />
            <Footer />
        </>
        
    );
}

export default LandingPage;