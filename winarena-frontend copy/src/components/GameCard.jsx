export default function GameCard({
  title,
  subtitle,
  image
}) {
  return (
    <div className="game-card">

      <img src={image} alt={title} />

      <div className="game-overlay">

        <h3>{title}</h3>

        <p>{subtitle}</p>

        <button>
          PLAY NOW
        </button>

      </div>

    </div>
  );
}