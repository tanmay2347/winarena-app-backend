import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function GameDetail() {
  const { gameName } = useParams();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [timeLeft, setTimeLeft] = useState({});

  const API_URL = "https://winarena-backend-1.onrender.com";
  const userEmail = localStorage.getItem("userEmail") || "";
  const userName = localStorage.getItem("userName") || "";

  const fetchGameTournaments = () => {
    fetch(`${API_URL}/api/tournaments`)
      .then((res) => res.json())
      .then((data) => {
        const allTournaments = Array.isArray(data) ? data : (data.tournaments || []);
        
        const filtered = allTournaments.filter(
          (t) => t.game && t.game.toLowerCase().replace(/\s+/g, "") === (gameName || "").toLowerCase().replace(/\s+/g, "")
        );

        if (filtered.length === 0) {
          const localTournaments = JSON.parse(localStorage.getItem("adminTournaments")) || [];
          const localFiltered = localTournaments.filter(
            (t) => t.game && t.game.toLowerCase().replace(/\s+/g, "") === (gameName || "").toLowerCase().replace(/\s+/g, "")
          );
          setTournaments(localFiltered);
        } else {
          setTournaments(filtered);
        }
      })
      .catch((err) => {
        console.error("Error fetching tournaments from backend:", err);
        const localTournaments = JSON.parse(localStorage.getItem("adminTournaments")) || [];
        const localFiltered = localTournaments.filter(
          (t) => t.game && t.game.toLowerCase().replace(/\s+/g, "") === (gameName || "").toLowerCase().replace(/\s+/g, "")
        );
        setTournaments(localFiltered);
      });
  };

  useEffect(() => {
    fetchGameTournaments();
    const interval = setInterval(fetchGameTournaments, 2000);
    return () => clearInterval(interval);
  }, [gameName]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const updatedTimes = {};
      tournaments.forEach((t) => {
        const tId = t._id || t.id;
        const startTimeMs = !isNaN(t.startTime) ? Number(t.startTime) : new Date(t.startTime).getTime();
        const diff = startTimeMs - now;
        
        if (diff <= 0) {
          updatedTimes[tId] = "MATCH STARTED";
        } else {
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          updatedTimes[tId] = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
      });
      setTimeLeft(updatedTimes);
    }, 1000);

    return () => clearInterval(timer);
  }, [tournaments]);

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box" }}>
      
      <button 
        onClick={() => navigate(-1)} 
        style={{ 
          background: "#7c3aed", 
          color: "#fff", 
          border: "none", 
          padding: "8px 14px", 
          borderRadius: "8px", 
          cursor: "pointer", 
          marginBottom: "20px",
          fontWeight: "700"
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: "20px", color: "#fbbf24", marginBottom: "4px", fontWeight: "900", textTransform: "uppercase" }}>
        {gameName} Tournaments
      </h1>
      <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "20px" }}>
        Live and upcoming tournaments for {gameName}.
      </p>

      {tournaments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
          <p>No active tournaments found for {gameName}. Check admin panel to create one!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {tournaments.map((tournament) => {
            const tournamentId = tournament._id || tournament.id;
            const registeredCount = tournament.registeredUsers?.length || 0;
            const maxSlots = tournament.slots || tournament.totalSlots || 10;
            const isFull = registeredCount >= maxSlots;
            const timerText = timeLeft[tournamentId] || "Loading...";

            // Check if user already joined this tournament
            const localJoinedIds = JSON.parse(localStorage.getItem("myJoinedTournamentIds")) || [];
            const isLocallyJoined = localJoinedIds.includes(tournamentId);
            const isRegisteredInDb = tournament.registeredUsers && (
              tournament.registeredUsers.includes(userName) || tournament.registeredUsers.includes(userEmail) || tournament.registeredUsers.some(u => u.email === userEmail || u.name === userName)
            );
            const isAlreadyJoined = isLocallyJoined || isRegisteredInDb;

            // Safely format tournament start date and time
            const parsedTime = tournament.startTime 
              ? (!isNaN(tournament.startTime) ? new Date(Number(tournament.startTime)) : new Date(tournament.startTime))
              : null;
            const formattedDateBadge = parsedTime && !isNaN(parsedTime.getTime())
              ? parsedTime.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : "TBA";

            return (
              <div 
                key={tournamentId}
                style={{ 
                  background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", 
                  borderRadius: "16px", 
                  border: "1px solid rgba(255,255,255,0.15)", 
                  padding: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#fff", fontWeight: "900", textTransform: "uppercase" }}>
                    {tournament.game} – {tournament.mode}
                  </h3>
                  {/* 🟢 Date/Time Badge placed strictly to the left of the LIVE indicator */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ background: "rgba(255,255,255,0.1)", color: "#fbbf24", fontSize: "9px", fontWeight: "800", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(251,191,36,0.3)" }}>
                      🕒 {formattedDateBadge}
                    </span>
                    <span style={{ background: "#22c55e", color: "#fff", fontSize: "9px", fontWeight: "900", padding: "4px 8px", borderRadius: "6px" }}>
                      ● LIVE
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", fontSize: "12px" }}>
                  <span style={{ color: "#9ca3af" }}>
                    Slots: <strong style={{ color: "#fff" }}>{registeredCount} / {maxSlots}</strong>
                  </span>
                  <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "4px 10px", borderRadius: "6px", color: "#fbbf24", fontWeight: "800", fontSize: "11px" }}>
                    ⏳ Starts in: {timerText}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: "#9ca3af", display: "block", fontWeight: "700" }}>ENTRY</span>
                    <strong style={{ fontSize: "16px", color: "#fbbf24" }}>₹{tournament.entry}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "9px", color: "#9ca3af", display: "block", fontWeight: "700" }}>PRIZE POOL</span>
                    <strong style={{ fontSize: "16px", color: "#22c55e" }}>₹{tournament.prize}</strong>
                  </div>
                </div>

                <button 
                  disabled={isFull || isAlreadyJoined}
                  onClick={() => navigate(`/tournament/${tournamentId}`)}
                  style={{ 
                    background: isAlreadyJoined ? "#059669" : (isFull ? "#4b5563" : "#7c3aed"), 
                    color: "#fff", 
                    border: "none", 
                    padding: "12px", 
                    borderRadius: "10px", 
                    fontWeight: "900", 
                    cursor: (isFull || isAlreadyJoined) ? "not-allowed" : "pointer",
                    width: "100%",
                    fontSize: "13px",
                    boxShadow: (isFull || isAlreadyJoined) ? "none" : "0 4px 15px rgba(124, 58, 237, 0.4)"
                  }}
                >
                  {isAlreadyJoined ? "✓ ALREADY JOINED" : (isFull ? "SLOTS FULL" : "JOIN NOW")}
                </button>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}