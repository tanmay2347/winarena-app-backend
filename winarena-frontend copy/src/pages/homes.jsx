import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  // Wallet Balance State
  const [walletBalance, setWalletBalance] = useState("0.00");

  // Coming Soon Alert State
  const [showAlert, setShowAlert] = useState(false);
  const [selectedGame, setSelectedGame] = useState("");

  // Load balance from localStorage
  useEffect(() => {
    const savedBalance = localStorage.getItem("walletBalance");
    if (savedBalance) {
      setWalletBalance(parseFloat(savedBalance).toFixed(2));
    }
  }, []);

  // Banner images array for auto scroller
  const banners = [
    "/hero-banner1.png",
    "/hero-banner2.png",
    "/hero-banner3.png",
    "/hero-banner4.png"
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto scroll effect (Har 3 seconds mein image change hogi)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Check karke navigate karne ka function
  const handleNavigation = (path) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      navigate("/login");
    }
  };

  // Game Click Handler (Free Fire -> Open, Others -> Coming Soon Popup)
  const handleGameClick = (gameName) => {
    const formatted = gameName.toLowerCase().replace(/\s+/g, "");
    if (formatted.includes("freefire")) {
      handleNavigation("/games/freefire");
    } else {
      setSelectedGame(gameName);
      setShowAlert(true);
    }
  };

  return (
    <div className="winarena">

      {/* ================= HEADER ================= */}
      <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>

        {/* WIN ARENA STACKED LOGO */}
        <Link to="/" className="logo" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", borderRadius: "8px", display: "grid", placeItems: "center", fontWeight: "900", color: "#fbbf24", fontSize: "16px", border: "1px solid rgba(251,191,36,0.4)" }}>
            W
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.1" }}>
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#fff", letterSpacing: "1px" }}>WIN</span>
            <span style={{ fontSize: "13px", fontWeight: "900", color: "#fbbf24", letterSpacing: "1.5px" }}>ARENA</span>
          </div>
        </Link>

        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* WALLET WITH LIVE BALANCE */}
          <div 
            className="wallet" 
            onClick={() => handleNavigation("/wallet")}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.4)", padding: "4px 10px", borderRadius: "20px" }}
          >
            <span className="wallet-icon" style={{ background: "#fbbf24", color: "#000", width: "20px", height: "20px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "11px", fontWeight: "900" }}>
              ₹
            </span>
            <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "12px" }}>
              ₹{walletBalance}
            </span>
          </div>

          {/* NOTIFICATION */}
          <button className="notification" style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative", fontSize: "16px", color: "#fff" }}>
            🔔
            <i style={{ position: "absolute", top: "2px", right: "2px", width: "6px", height: "6px", background: "#ef4444", borderRadius: "50%" }}></i>
          </button>

          {/* PROFILE */}
          <div
            onClick={() => handleNavigation("/profile")}
            className="profile"
            style={{ cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", background: "#1e1b4b", border: "1px solid #fbbf24", display: "grid", placeItems: "center" }}
          >
            👤
          </div>
        </div>

      </header>


      {/* ================= HERO AUTO-SCROLLER (Dots removed) ================= */}
      <section className="hero" style={{ position: "relative", overflow: "hidden" }}>
        <img 
          src={banners[currentSlide]} 
          alt="Banner" 
          style={{ 
            position: "absolute", 
            top: 0, 
            left: 0, 
            width: "100%", 
            height: "100%", 
            objectFit: "cover", 
            zIndex: 1,
            transition: "opacity 0.5s ease-in-out"
          }} 
        />

        <div style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          width: "100%", 
          height: "100%", 
          background: "linear-gradient(270deg, rgba(15,23,42,0.95) 45%, rgba(15,23,42,0.3) 100%)", 
          zIndex: 2 
        }}></div>

        <div className="hero-content" style={{ position: "relative", zIndex: 3, textAlign: "right", alignItems: "flex-end", width: "100%", marginLeft: "auto", marginRight: "0", display: "flex", flexDirection: "column" }}>
          <span className="live-label" style={{ textAlign: "right" }}>
            ● LIVE TOURNAMENTS
          </span>

          <h1 style={{ textAlign: "right" }}>
            PLAY.<br />
            <span>COMPETE.</span><br />
            <b>WIN BIG!</b>
          </h1>

          <p style={{ textAlign: "right", maxWidth: "280px", margin: "0 0 12px 0", fontSize: "12px", color: "#cbd5e1", alignSelf: "flex-end" }}>
            India's next generation gaming tournament platform.
          </p>

          <div
            onClick={() => handleNavigation("/tournaments")}
            className="play-button"
            style={{ cursor: "pointer", display: "inline-flex", alignSelf: "flex-end" }}
          >
            JOIN TOURNAMENT <span>→</span>
          </div>
        </div>
      </section>


      {/* ================= QUICK MENU ================= */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", padding: "0 16px", margin: "16px 0" }}>
        <div onClick={() => handleNavigation("/games")} style={{ displayContents: "contents" }}><QuickCard icon="🎮" title="Games" /></div>
        <div onClick={() => handleNavigation("/tournaments")} style={{ displayContents: "contents" }}><QuickCard icon="🏆" title="Tournaments" /></div>
        <div onClick={() => handleNavigation("/leaderboard")} style={{ displayContents: "contents" }}><QuickCard icon="📊" title="Leaderboard" /></div>
        <div onClick={() => handleNavigation("/support")} style={{ displayContents: "contents" }}><QuickCard icon="🎧" title="Support" /></div>
      </section>


      {/* ================= GAMES ================= */}
      <SectionTitle title="CHOOSE YOUR GAME" onViewAll={() => handleNavigation("/games")} />
      <section className="games" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", padding: "0 16px" }}>
        <Game title="FREE FIRE" subtitle="BATTLE ROYALE" image="/freefire.png" slug="freefire" onGameClick={handleGameClick} />
        <Game title="CARROM" subtitle="REAL TIME" image="/carrom.png" slug="carrom" onGameClick={handleGameClick} />
        <Game title="LUDO" subtitle="MULTIPLAYER" image="/ludo.png" slug="ludo" onGameClick={handleGameClick} />
      </section>


      {/* ================= LIVE TOURNAMENTS (Sorted by time) ================= */}
      <SectionTitle title="LIVE TOURNAMENTS" live onViewAll={() => handleNavigation("/tournaments")} />
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", padding: "0 16px" }}>
        {(
          JSON.parse(localStorage.getItem("adminTournaments")) || [
            { game: "FREE FIRE", mode: "SOLO", entry: "10", prize: "500", image: "/freefire.png", startTime: new Date("2026-06-07T15:00:00").getTime() },
            { game: "CARROM", mode: "1 VS 1", entry: "20", prize: "800", image: "/carrom.png", startTime: new Date("2026-06-07T14:00:00").getTime() },
            { game: "LUDO", mode: "2 PLAYER", entry: "10", prize: "300", image: "/ludo.png", startTime: new Date("2026-06-07T16:00:00").getTime() }
          ]
        )
        .sort((a, b) => (a.startTime || 0) - (b.startTime || 0))
        .map((tournament, index) => (
          <div key={index} onClick={() => handleNavigation("/tournaments")} style={{ displayContents: "contents" }}>
            <Tournament game={tournament.game} mode={tournament.mode} entry={tournament.entry} prize={tournament.prize} image={tournament.image} />
          </div>
        ))}
      </section>


      {/* ================= PROMO BANNER ================= */}
      <section style={{ position: "relative", borderRadius: "14px", overflow: "hidden", margin: "16px 16px", padding: "20px", height: "130px", display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }} onClick={() => handleNavigation("/tournaments")}>
        <img src="/promo-banner.png" alt="Promo" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(90deg, rgba(15,23,42,0.92) 50%, rgba(15,23,42,0.4) 100%)", zIndex: 2 }}></div>
        <div style={{ position: "relative", zIndex: 3, width: "100%" }}>
          <small style={{ color: "#fbbf24", fontSize: "10px", fontWeight: "700", display: "block", marginBottom: "4px" }}>WIN BIG EVERYDAY</small>
          <h2 style={{ color: "#fff", fontSize: "16px", fontWeight: "900", lineHeight: "1.2", margin: "0 0 10px 0" }}>PLAY MORE.<br />WIN MORE.</h2>
          <div style={{ background: "#fbbf24", color: "#000", fontSize: "10px", padding: "6px 12px", borderRadius: "6px", fontWeight: "800", display: "inline-block" }}>PLAY NOW →</div>
        </div>
      </section>


      {/* ================= WALLET SECTION ================= */}
      <SectionTitle title="YOUR WINARENA" onViewAll={() => handleNavigation("/wallet")} />
      <section className="wallet-section">
        <div className="wallet-card" onClick={() => handleNavigation("/wallet")} style={{ cursor: "pointer" }}>
          <div className="wallet-big-icon">₹</div>
          <div><small>Total Balance</small><h2>₹{walletBalance}</h2></div>
        </div>
        <div className="wallet-card" onClick={() => handleNavigation("/tournaments")} style={{ cursor: "pointer" }}>
          <div className="trophy-icon">🏆</div>
          <div><small>Total Tournaments</small><h2>4,847+</h2></div>
        </div>
      </section>


      {/* ================= COMING SOON MODAL ================= */}
      {showAlert && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0, 0, 0, 0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(5px)" }}>
          <div style={{ background: "linear-gradient(135deg, #311042 0%, #0f172a 100%)", border: "2px solid #fbbf24", padding: "24px", borderRadius: "20px", textAlign: "center", maxWidth: "320px", width: "85%", boxShadow: "0 10px 30px rgba(251, 191, 36, 0.3)" }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>🚀</div>
            <h2 style={{ color: "#fbbf24", fontSize: "18px", margin: "0 0 8px 0", fontWeight: "900" }}>{selectedGame} IS COMING SOON!</h2>
            <p style={{ color: "#cbd5e1", fontSize: "12px", margin: "0 0 20px 0", lineHeight: "1.4" }}>We are working hard to launch tournaments for <strong>{selectedGame}</strong> very soon. Stay tuned!</p>
            <button onClick={() => setShowAlert(false)} style={{ background: "#fbbf24", color: "#000", border: "none", padding: "10px 24px", borderRadius: "10px", fontWeight: "900", fontSize: "12px", cursor: "pointer", width: "100%" }}>GOT IT 👍</button>
          </div>
        </div>
      )}


      {/* ================= BOTTOM NAV ================= */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item active"><span>⌂</span><small>Home</small></Link>
        <div onClick={() => handleNavigation("/games")} className="nav-item" style={{ cursor: "pointer" }}><span>🎮</span><small>Games</small></div>
        <div onClick={() => handleNavigation("/tournaments")} className="nav-item" style={{ cursor: "pointer" }}><span>🏆</span><small>Tournaments</small></div>
        <div onClick={() => handleNavigation("/wallet")} className="nav-item" style={{ cursor: "pointer" }}><span>₹</span><small>Wallet</small></div>
        <div onClick={() => handleNavigation("/profile")} className="nav-item" style={{ cursor: "pointer" }}><span>👤</span><small>Profile</small></div>
      </nav>

    </div>
  );
}


/* ================= QUICK CARD ================= */
function QuickCard({ icon, title }) {
  return (
    <div style={{ cursor: "pointer", background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontSize: "18px", marginBottom: "4px" }}>{icon}</div>
      <span style={{ fontSize: "9px", color: "#fff", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{title}</span>
    </div>
  );
}


/* ================= GAME ================= */
function Game({ title, subtitle, image, slug, onGameClick }) {
  return (
    <div onClick={() => onGameClick(title)} className="game" style={{ cursor: "pointer", position: "relative", borderRadius: "14px", overflow: "hidden", height: "160px", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "12px", border: "1px solid rgba(255,255,255,0.15)" }}>
      <img src={image} alt={title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,23,42,0.95) 100%)", zIndex: 2 }}></div>
      <div className="game-info" style={{ position: "relative", zIndex: 3, width: "100%", textAlign: "left" }}>
        <h3 style={{ fontSize: "11px", color: "#fff", margin: "0 0 2px 0", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h3>
        <p style={{ fontSize: "9px", color: "#fbbf24", margin: "0 0 8px 0", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</p>
        <div className="game-play-button" style={{ background: "#7c3aed", color: "#fff", fontSize: "9px", padding: "4px 10px", borderRadius: "6px", fontWeight: "700", display: "inline-block" }}>PLAY</div>
      </div>
    </div>
  );
}


/* ================= TOURNAMENT ================= */
function Tournament({ game, mode, entry, prize, image }) {
  return (
    <div style={{ cursor: "pointer", position: "relative", borderRadius: "14px", overflow: "hidden", height: "175px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "12px", border: "1px solid rgba(255,255,255,0.15)" }}>
      <img src={image} alt={game} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.92) 100%)", zIndex: 2 }}></div>
      <div style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ background: "#ef4444", color: "#fff", fontSize: "9px", fontWeight: "800", padding: "2px 8px", borderRadius: "4px" }}>● LIVE</span>
      </div>
      <div style={{ position: "relative", zIndex: 3, width: "100%", textAlign: "left" }}>
        <h3 style={{ fontSize: "14px", color: "#fff", margin: "0 0 2px 0", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game}</h3>
        <p style={{ fontSize: "10px", color: "#cbd5e1", margin: "0 0 8px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mode}</p>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "10px" }}>
          <div>
            <span style={{ color: "#9ca3af", display: "block", fontSize: "8px", fontWeight: "600" }}>ENTRY</span>
            <strong style={{ color: "#fbbf24", fontSize: "11px" }}>₹{entry}</strong>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ color: "#9ca3af", display: "block", fontSize: "8px", fontWeight: "600" }}>PRIZE</span>
            <strong style={{ color: "#22c55e", fontSize: "11px" }}>₹{prize}</strong>
          </div>
        </div>
        <div style={{ background: "#7c3aed", color: "#fff", fontSize: "10px", padding: "6px", borderRadius: "6px", fontWeight: "700", textAlign: "center", width: "100%" }}>JOIN</div>
      </div>
    </div>
  );
}


/* ================= SECTION TITLE ================= */
function SectionTitle({ title, live, onViewAll }) {
  return (
    <div className="section-title">
      <div>
        <i></i>
        <h2>{title}</h2>
        {live && <span className="red-dot"></span>}
      </div>
      <button onClick={onViewAll} style={{ cursor: "pointer" }}>VIEW ALL →</button>
    </div>
  );
}