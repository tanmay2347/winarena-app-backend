import { useNavigate } from "react-router-dom";

export default function GameCard({
  title,
  subtitle,
  image
}) {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    const formatted = title.toLowerCase().replace(/\s+/g, "");
    
    // Agar Carrom hai toh /carrom page par bhej do jahan zip game open hogi
    if (formatted.includes("carrom")) {
      navigate("/carrom");
    } 
    // Agar Free Fire hai toh tournament page par bhej do
    else if (formatted.includes("freefire")) {
      navigate("/games/freefire");
    } else {
      alert(`${title} is coming soon!`);
    }
  };

  return (
    <div className="game-card">

      <img src={image} alt={title} />

      <div className="game-overlay">

        <h3>{title}</h3>

        <p>{subtitle}</p>

        <button onClick={handlePlayClick}>
          PLAY NOW 🚀
        </button>

      </div>

    </div>
  );
}