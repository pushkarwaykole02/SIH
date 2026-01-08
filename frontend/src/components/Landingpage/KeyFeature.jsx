import "../../css/LandingpageCSS/KeyFeature.css"
import { PiCoinsBold } from "react-icons/pi";
import { PiUsersThree } from "react-icons/pi";
import FeatureCard from "./FeatureCard";
import { HiOutlineArchiveBox } from "react-icons/hi2";
function KeyFeature(){
    return(
        <>
            <h1 id="key-feature" className="key-feature-heading">Key Feature</h1>
            <span className="tagline">
                Explore the various ways you can engage with our alumni network.
            </span>
            <div className="feature-card">
                <FeatureCard icon={<PiCoinsBold size={24}/>} heading={"Contribution Management"} description={"Easily manage your contributions and support the college's initiatives."}/>
                <FeatureCard icon={<PiUsersThree size={24}/>} heading={"Mentorship Program"} description={"Connect with current students and fellow alumni through our mentorship program."}/>
                <FeatureCard icon={<HiOutlineArchiveBox size={24}/>} heading={"Nostalgia Repository"} description={"Relive your college days with our collection of photos, videos, and stories."}/>
            </div>

        </>
    );
}

export default KeyFeature;