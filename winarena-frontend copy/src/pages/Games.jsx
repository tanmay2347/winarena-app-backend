import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Games() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);
  const [selectedGame, setSelectedGame] = useState("");

  // Game click handler
 const handleGameClick = (gameName) => {
    const formatted = gameName.toLowerCase().replace(/\s+/g, "");
    
    // Agar Free Fire hai toh GameDetail page par bhej do jahan game-specific tournaments show honge
    if (formatted.includes("freefire")) {
      navigate(`/games/freefire`);
    } else {
      // Baaki sabhi games ke liye "Coming Soon" popup dikhao
      setSelectedGame(gameName);
      setShowAlert(true);
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "90px", boxSizing: "border-box" }}>
      
      {/* HEADER */}
      <h1 style={{ fontSize: "22px", color: "#fbbf24", marginBottom: "4px", fontWeight: "900" }}>
        CHOOSE YOUR GAME
      </h1>
      <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "20px" }}>
        Select a game to join live tournaments and win cash prizes.
      </p>

      {/* GAMES GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
        
        {/* FREE FIRE CARD (Active) */}
        <div 
          onClick={() => handleGameClick("Free Fire")}
          style={{ 
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", 
            borderRadius: "16px", 
            border: "2px solid #7c3aed", 
            overflow: "hidden", 
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(124, 58, 237, 0.3)",
            transition: "transform 0.2s"
          }}
        >
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ background: "#22c55e", color: "#fff", fontSize: "9px", fontWeight: "800", padding: "3px 8px", borderRadius: "4px" }}>
                ● ACTIVE
              </span>
              <h2 style={{ fontSize: "18px", margin: "8px 0 4px 0", fontWeight: "900", color: "#fff" }}>FREE FIRE</h2>
              <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>Battle Royale & Clash Squad</p>
            </div>
            <button style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
              PLAY 🚀
            </button>
          </div>
        </div>

        {/* CARROM CARD (Coming Soon) */}
        <div 
          onClick={() => handleGameClick("Carrom")}
          style={{ 
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", 
            borderRadius: "16px", 
            border: "1px solid rgba(255,255,255,0.1)", 
            overflow: "hidden", 
            cursor: "pointer",
            opacity: 0.85
          }}
        >
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ background: "#f59e0b", color: "#000", fontSize: "9px", fontWeight: "900", padding: "3px 8px", borderRadius: "4px" }}>
                ⏳ COMING SOON
              </span>
              <h2 style={{ fontSize: "18px", margin: "8px 0 4px 0", fontWeight: "900", color: "#fff" }}>CARROM</h2>
              <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>Real-time Board Match</p>
            </div>
            <button style={{ background: "rgba(255,255,255,0.1)", color: "#9ca3af", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
              SOON
            </button>
          </div>
        </div>

        {/* LUDO CARD (Coming Soon) */}
        <div 
          onClick={() => handleGameClick("Ludo")}
          style={{ 
            background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", 
            borderRadius: "16px", 
            border: "1px solid rgba(255,255,255,0.1)", 
            overflow: "hidden", 
            cursor: "pointer",
            opacity: 0.85
          }}
        >
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ background: "#f59e0b", color: "#000", fontSize: "9px", fontWeight: "900", padding: "3px 8px", borderRadius: "4px" }}>
                ⏳ COMING SOON
              </span>
              <h2 style={{ fontSize: "18px", margin: "8px 0 4px 0", fontWeight: "900", color: "#fff" }}>LUDO</h2>
              <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>Multiplayer Dice Game</p>
            </div>
            <button style={{ background: "rgba(255,255,255,0.1)", color: "#9ca3af", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
              SOON
            </button>
          </div>
        </div>

      </div>

      {/* ANIMATED COMING SOON MODAL ALERT */}
      {showAlert && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          backdropFilter: "blur(5px)"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #311042 0%, #0f172a 100%)",
            border: "2px solid #fbbf24",
            padding: "24px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "320px",
            width: "85%",
            boxShadow: "0 10px 30px rgba(251, 191, 36, 0.3)",
            animation: "popIn 0.3s ease-out forwards"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>🚀</div>
            <h2 style={{ color: "#fbbf24", fontSize: "18px", margin: "0 0 8px 0", fontWeight: "900" }}>
              {selectedGame} IS COMING SOON!
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: "12px", margin: "0 0 20px 0", lineHeight: "1.4" }}>
              We are working hard to launch tournaments for <strong>{selectedGame}</strong> very soon. Stay tuned!
            </p>
            <button 
              onClick={() => setShowAlert(false)}
              style={{
                background: "#fbbf24",
                color: "#000",
                border: "none",
                padding: "10px 24px",
                borderRadius: "10px",
                fontWeight: "900",
                fontSize: "12px",
                cursor: "pointer",
                width: "100%"
              }}
            >
              GOT IT 👍
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item"><span>⌂</span><small>Home</small></Link>
        <Link to="/games" className="nav-item active"><span>🎮</span><small>Games</small></Link>
        <Link to="/tournaments" className="nav-item"><span>🏆</span><small>Tournaments</small></Link>
        <Link to="/wallet" className="nav-item"><span>₹</span><small>Wallet</small></Link>
        <Link to="/profile" className="nav-item"><span>👤</span><small>Profile</small></Link>
      </nav>

    </div>
  );
}