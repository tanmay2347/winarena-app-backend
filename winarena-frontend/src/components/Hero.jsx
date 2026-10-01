import {
  ArrowRight,
  Zap,
  Trophy
} from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">

      <div className="hero-bg-glow" />

      <div className="hero-content">

        <div className="hero-text">

          <div className="hero-badge">
            <Zap size={15} />
            LIVE TOURNAMENTS
          </div>

          <h1>
            PLAY.
            <br />
            <span>COMPETE.</span>
            <br />
            <b>WIN BIG!</b>
          </h1>

          <p>
            India's next generation gaming
            tournament platform.
          </p>

          <button className="primary-btn">
            JOIN TOURNAMENT
            <ArrowRight size={19} />
          </button>

        </div>

        <div className="hero-art">
          <div className="energy-ring">
            <Trophy size={100} />
          </div>
        </div>

      </div>

      <div className="hero-dots">
        <span className="active" />
        <span />
        <span />
        <span />
      </div>

    </section>
  );
}