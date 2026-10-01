import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Tournaments() {
  const navigate = useNavigate();
  const [joinedTournaments, setJoinedTournaments] = useState([]);
  
  // 🟢 Live Backend URL Constant
  const API_URL = "https://winarena-backend-1.onrender.com";

  // Function to fetch and filter joined tournaments
  const fetchJoinedTournaments = () => {
    fetch(`${API_URL}/api/tournaments`)
      .then((res) => res.json())
      .then((data) => {
        const allTournaments = Array.isArray(data) ? data : (data.tournaments || []);
        
        const localJoinedIds = JSON.parse(localStorage.getItem("myJoinedTournamentIds")) || [];
        const userEmail = localStorage.getItem("userEmail") || "";
        const userName = localStorage.getItem("userName") || "";

        const joined = allTournaments.filter((t) => {
          const isLocallyJoined = localJoinedIds.includes(t._id || t.id);
          const isRegisteredInDb = t.registeredUsers && t.registeredUsers.some(u => u.email === userEmail || u.name === userName);
          return isLocallyJoined || isRegisteredInDb;
        });

        if (joined.length === 0) {
          const fallbackData = JSON.parse(localStorage.getItem("myJoinedTournaments")) || [];
          setJoinedTournaments(fallbackData);
        } else {
          setJoinedTournaments(joined);
        }
      })
      .catch((err) => {
        console.error("Error fetching tournaments from backend, falling back to local storage:", err);
        const data = localStorage.getItem("myJoinedTournaments");
        if (data) {
          setJoinedTournaments(JSON.parse(data));
        }
      });
  };

  useEffect(() => {
    // Initial fetch
    fetchJoinedTournaments();

    // 🟢 Auto-refresh every 5 seconds to get live Room ID & Password automatically
    const interval = setInterval(fetchJoinedTournaments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px", background: "#0f172a", minHeight: "100vh", color: "#fff", paddingBottom: "90px", boxSizing: "border-box" }}>
      
      {/* HEADER TITLE */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", color: "#fbbf24", margin: "0 0 4px 0", fontWeight: "900" }}>
          MY JOINED TOURNAMENTS
        </h1>
        <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
          Aapke sabhi registered matches aur room details yahan honge (Live Synced).
        </p>
      </div>

      {/* TOURNAMENTS LIST OR EMPTY STATE */}
      {joinedTournaments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🏆</div>
          <h3 style={{ fontSize: "14px", color: "#fff", margin: "0 0 6px 0" }}>No Tournaments Joined Yet</h3>
          <p style={{ fontSize: "12px", margin: "0 0 16px 0" }}>Games section se koi bhi tournament join karein.</p>
          <button 
            onClick={() => navigate("/games")} 
            style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "800", cursor: "pointer", fontSize: "12px" }}
          >
            Browse Games 🎮
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {joinedTournaments.map((tournament, index) => (
            <JoinedTournamentCard key={tournament._id || index} tournament={tournament} />
          ))}
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item"><span>⌂</span><small>Home</small></Link>
        <Link to="/games" className="nav-item"><span>🎮</span><small>Games</small></Link>
        <Link to="/tournaments" className="nav-item active"><span>🏆</span><small>Tournaments</small></Link>
        <Link to="/wallet" className="nav-item"><span>₹</span><small>Wallet</small></Link>
        <Link to="/profile" className="nav-item"><span>👤</span><small>Profile</small></Link>
      </nav>

    </div>
  );
}

// Fixed card component with bulletproof live countdown timer & date formatting
function JoinedTournamentCard({ tournament }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      // Safely parse start time (handles both number timestamps and date strings)
      const startTimeMs = !isNaN(tournament.startTime) ? Number(tournament.startTime) : new Date(tournament.startTime).getTime();
      
      if (!startTimeMs || isNaN(startTimeMs)) {
        setTimeLeft("INVALID TIME");
        return;
      }

      const now = new Date().getTime();
      const difference = startTimeMs - now;

      if (difference <= 0) {
        setTimeLeft("🔴 MATCH STARTED / LIVE");
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [tournament.startTime]);

  // Format date safely for display
  const formattedDate = tournament.startTime 
    ? (!isNaN(tournament.startTime) ? new Date(Number(tournament.startTime)) : new Date(tournament.startTime)).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : "TBA";

  return (
    <div style={{ 
      background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", 
      padding: "16px", 
      borderRadius: "14px", 
      border: "1px solid rgba(255,255,255,0.15)",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "14px", color: "#fff", margin: 0, fontWeight: "800" }}>
          {tournament.game} - {tournament.mode}
        </h3>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ background: "rgba(255,255,255,0.1)", color: "#fbbf24", fontSize: "8px", fontWeight: "800", padding: "3px 6px", borderRadius: "4px", border: "1px solid rgba(251,191,36,0.3)" }}>
            📅 {formattedDate}
          </span>
          <span style={{ background: "#22c55e", color: "#fff", fontSize: "8px", fontWeight: "800", padding: "3px 8px", borderRadius: "4px" }}>
            ● REGISTERED
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", margin: "4px 0" }}>
        <div>
          <span style={{ color: "#9ca3af", display: "block", fontSize: "8px" }}>ENTRY PAID</span>
          <strong style={{ color: "#fbbf24" }}>₹{tournament.entry}</strong>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ color: "#9ca3af", display: "block", fontSize: "8px" }}>PRIZE POOL</span>
          <strong style={{ color: "#22c55e" }}>₹{tournament.prize}</strong>
        </div>
      </div>

      {/* LIVE COUNTDOWN TIMER BAR */}
      <div style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", padding: "8px", borderRadius: "8px", fontSize: "11px", textAlign: "center", fontWeight: "800", display: "flex", justifyContent: "center", gap: "6px", alignItems: "center" }}>
        <span>⏳ Starts in:</span>
        <span style={{ fontSize: "12px", letterSpacing: "1px" }}>{timeLeft}</span>
      </div>

      {/* ROOM ID & PASSWORD SECTION */}
      {tournament.roomId && tournament.roomPass ? (
        <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.4)", padding: "10px", borderRadius: "8px", marginTop: "4px" }}>
          <div style={{ color: "#22c55e", fontSize: "10px", fontWeight: "900", marginBottom: "6px", textAlign: "center" }}>
            🔑 ROOM CREDENTIALS LIVE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ color: "#9ca3af", display: "block", fontSize: "8px" }}>ROOM ID</span>
              <strong style={{ color: "#fff" }}>{tournament.roomId}</strong>
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ color: "#9ca3af", display: "block", fontSize: "8px" }}>PASSWORD</span>
              <strong style={{ color: "#fff" }}>{tournament.roomPass}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "8px", fontSize: "10px", textAlign: "center", color: "#9ca3af" }}>
          🔒 Room ID & Password will be available when admin publishes.
        </div>
      )}
    </div>
  );
}