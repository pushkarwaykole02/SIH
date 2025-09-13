import "../../css/LandingpageCSS/FeatureCard.css"

function FeatureCard(props){
    return(
        <>
            <div className="key-feature-card">
                <div className="icon">{props.icon}</div>
                <h3>{props.heading}</h3>
                <span>{props.description}</span>
            </div>
        </>
    );
}

export default FeatureCard;