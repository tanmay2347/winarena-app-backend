export default function TournamentCard({
  game,
  mode,
  entry,
  prize,
  image
}) {
  return (
    <div className="tournament-card">

      <div className="tournament-image">

        <img src={image} alt={game} />

        <span className="live-tag">
          ● LIVE
        </span>

      </div>

      <div className="tournament-info">

        <h3>{game}</h3>

        <p>{mode}</p>

        <div className="tournament-stats">

          <div>
            <small>Entry Fee</small>
            <strong>₹{entry}</strong>
          </div>

          <div>
            <small>Prize Pool</small>
            <strong>₹{prize}</strong>
          </div>

        </div>

        <button className="join-btn">
          JOIN NOW
        </button>

      </div>

    </div>
  );
}