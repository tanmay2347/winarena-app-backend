import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);

  // 🟢 Live Backend URL Constant
  const API_URL = "https://winarena-backend-1.onrender.com";

  useEffect(() => {
    // Fetch live tournaments from MongoDB Backend
    fetch(`${API_URL}/api/tournaments`)
      .then((res) => res.json())
      .then((data) => {
        const allTournaments = Array.isArray(data) ? data : (data.tournaments || []);
        const found = allTournaments.find((t) => (t._id || t.id).toString() === id);
        if (found) {
          setTournament(found);
        } else {
          // Fallback to local storage if not found on server
          const localStored = JSON.parse(localStorage.getItem("adminTournaments")) || [];
          const localFound = localStored.find((t) => t.id.toString() === id);
          if (localFound) setTournament(localFound);
        }
      })
      .catch((err) => {
        console.error("Error fetching tournament details:", err);
        const localStored = JSON.parse(localStorage.getItem("adminTournaments")) || [];
        const localFound = localStored.find((t) => t.id.toString() === id);
        if (localFound) setTournament(localFound);
      });
  }, [id]);

  const handleJoinConfirm = () => {
    const currentUserName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || "Gamer";
    
    // Strict Wallet Balance Check
    let walletBalance = parseFloat(localStorage.getItem("walletBalance"));
    if (isNaN(walletBalance)) {
      walletBalance = 0;
      localStorage.setItem("walletBalance", "0");
    }

    const entryFee = parseFloat(tournament.entry) || 0;

    // 🔴 1. Insufficient Balance Protection
    if (walletBalance < entryFee) {
      alert(`⚠️ Insufficient Balance!\n\nYou need ₹${entryFee} to join this tournament, but your wallet has ₹${walletBalance}. Please add money.`);
      navigate("/wallet");
      return;
    }

    // 🔴 2. Already Joined Check
    const registeredUsers = tournament.registeredUsers || [];
    if (registeredUsers.includes(currentUserName)) {
      alert("⚠️ You have already joined this tournament!");
      return;
    }

    if (registeredUsers.length >= tournament.totalSlots) {
      alert("⚠️ Sorry, slots are full!");
      return;
    }

    // Deduct entry fee safely BEFORE saving
    walletBalance -= entryFee;
    localStorage.setItem("walletBalance", walletBalance.toFixed(2));

    // Save joined tournament ID locally so 'Tournaments.jsx' can track it easily
    const myJoinedIds = JSON.parse(localStorage.getItem("myJoinedTournamentIds")) || [];
    const tournamentId = tournament._id || tournament.id;
    if (!myJoinedIds.includes(tournamentId)) {
      myJoinedIds.push(tournamentId);
      localStorage.setItem("myJoinedTournamentIds", JSON.stringify(myJoinedIds));
    }

    // Also support legacy local storage array
    const myJoined = JSON.parse(localStorage.getItem("myJoinedTournaments")) || [];
    if (!myJoined.some((item) => (item._id || item.id).toString() === id)) {
      myJoined.push(tournament);
      localStorage.setItem("myJoinedTournaments", JSON.stringify(myJoined));
    }

    alert(`🎉 Successfully Registered!\n\n₹${entryFee} has been deducted from your wallet. Good luck! 🚀`);
    navigate("/tournaments");
  };

  if (!tournament) {
    return (
      <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", textAlign: "center", paddingTop: "100px" }}>
        <h2>Tournament not found or loading...</h2>
        <button onClick={() => navigate(-1)} style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", marginTop: "10px", cursor: "pointer" }}>← Back</button>
      </div>
    );
  }

  const isFull = tournament.registeredUsers && tournament.registeredUsers.length >= tournament.totalSlots;

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto" }}>
      
      <button 
        onClick={() => navigate(-1)} 
        style={{ 
          background: "#7c3aed", 
          color: "#fff", 
          border: "none", 
          padding: "8px 14px", 
          borderRadius: "6px", 
          cursor: "pointer", 
          marginBottom: "20px",
          fontWeight: "700"
        }}
      >
        ← Back
      </button>

      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.15)", marginBottom: "20px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h1 style={{ fontSize: "18px", color: "#fff", margin: 0, fontWeight: "900" }}>
            {tournament.game} - {tournament.mode}
          </h1>
          <span style={{ background: isFull ? "#ef4444" : "#22c55e", color: "#fff", fontSize: "9px", fontWeight: "800", padding: "4px 10px", borderRadius: "6px" }}>
            {isFull ? "● FULL" : "● LIVE"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", margin: "16px 0", background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "10px" }}>
          <div>
            <span style={{ color: "#9ca3af", fontSize: "10px", display: "block" }}>ENTRY FEE</span>
            <strong style={{ color: "#fbbf24", fontSize: "15px" }}>₹{tournament.entry}</strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af", fontSize: "10px", display: "block" }}>PRIZE POOL</span>
            <strong style={{ color: "#22c55e", fontSize: "15px" }}>₹{tournament.prize}</strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af", fontSize: "10px", display: "block" }}>SLOTS FILLED</span>
            <strong style={{ color: "#fff", fontSize: "13px" }}>{tournament.registeredUsers ? tournament.registeredUsers.length : 0} / {tournament.totalSlots}</strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af", fontSize: "10px", display: "block" }}>MATCH TIME</span>
            <strong style={{ color: "#cbd5e1", fontSize: "12px" }}>{new Date(tournament.startTime).toLocaleString()}</strong>
          </div>
        </div>

      </div>

      <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "16px", borderRadius: "14px", marginBottom: "20px" }}>
        <h3 style={{ color: "#ef4444", fontSize: "14px", margin: "0 0 8px 0", fontWeight: "900" }}>
          ⚠️ TERMS & CONDITIONS / FAIR PLAY RULES
        </h3>
        <ul style={{ color: "#cbd5e1", fontSize: "11px", margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px", lineHeight: "1.4" }}>
          <li>Strictly **No Cheating, Hacking, or Panel** allowed during the tournament.</li>
          <li>Agar koi player hack ya illegal tool use karte hue pakda gaya, toh uska **account/ID ban** kar diya jayega.</li>
          <li>Cheating ya hack use karne par winning prize ya entry fee ke **paise wapas nahi milenge** aur winnings cancel kar di jayengi.</li>
          <li>Match shuru hone se 10 minute pehle Room ID & Password app par mil jayega.</li>
        </ul>
      </div>

      <button 
        disabled={isFull}
        onClick={handleJoinConfirm}
        style={{ 
          background: isFull ? "#4b5563" : "#22c55e", 
          color: isFull ? "#fff" : "#000", 
          border: "none", 
          padding: "14px", 
          borderRadius: "10px", 
          fontWeight: "900", 
          cursor: isFull ? "not-allowed" : "pointer",
          width: "100%",
          fontSize: "14px",
          boxShadow: isFull ? "none" : "0 4px 14px rgba(34, 197, 94, 0.4)"
        }}
      >
        {isFull ? "TEAM FULL" : "CONFIRM & JOIN TOURNAMENT 🚀"}
      </button>

    </div>
  );
}