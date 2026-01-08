import "../../css/LandingpageCSS/NotableAlumni.css"
import Imagecard from "./Imagecard";
import Image1 from "../Landingpage/assets/Alumni1.png"
import Image2 from "../Landingpage/assets/Alumni2.png"
import Image3 from "../Landingpage/assets/Alumni3.png"
import Image4 from "../Landingpage/assets/Alumni4.png"
import Image5 from "../Landingpage/assets/Alumni5.png"
import Image6 from "../Landingpage/assets/Alumni6.png"


function NotableAlumni(){
    return(
        <> 
      
        <div className="alumni-info">
            
            <div className="grid-container">
                <Imagecard image={Image1} name={"Mr. Charles Bennett"} description={"Renowned architect, known for innovative and sustainable building designs."}/>
                <Imagecard image={Image2} name={"Dr. Evelyn Reed"} description={"Pioneering researcher in biotechnology, leading advancements in genetic engineering."}/>
                <Imagecard image={Image3} name={"Ms. Sophia Carter"} description={"Award-winning journalist, covering global events and social issues."} />
                <Imagecard image={Image4} name={"David Miller"} description={"Data Scientist at IBM – specializes in machine learning and predictive analytics."}/>
                <Imagecard image={Image5} name={"Carlos Ramirez"} description={"Entrepreneur – founder of a fintech startup helping small businesses with digital payments."}/>
                <Imagecard image={Image6} name={"Emma Johansson"} description={"UX Designer at Spotify – works on improving user experience for global music streaming."}/>
            </div>

        </div>
            
           
        </>
    );
}

export default NotableAlumni