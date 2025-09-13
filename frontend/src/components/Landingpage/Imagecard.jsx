import "../../css/LandingpageCSS/Imagecard.css"

function Imagecard({ image, name, description }){
    return(
        <>
        <div className="image-card">
            <img src={image} alt={name} className="card-img" />
            <h2 className="card-title">{name}</h2>
            <p className="card-desc">{description}</p>
        </div>
        </>
    );
}

export default Imagecard;