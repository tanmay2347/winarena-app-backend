import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);

  // 🟢 Game ID & Username State
  const [gameId, setGameId] = useState("");
  const [gameUsername, setGameUsername] = useState("");

  // 🟢 Live Backend URL Constant
  const API_URL = "https://winarena-backend-1.onrender.com";
  const userEmail = localStorage.getItem("userEmail") || "user@winarena.com";
  const userName = localStorage.getItem("userName") || "Player";

  useEffect(() => {
    // Load saved Game ID and Username from localStorage if available
    const savedGameId = localStorage.getItem("userGameId") || "";
    const savedGameUsername = localStorage.getItem("userGameUsername") || "";
    setGameId(savedGameId);
    setGameUsername(savedGameUsername);

    // Fetch live tournaments from MongoDB Backend
    fetch(`${API_URL}/api/tournaments`)
      .then((res) => res.json())
      .then((data) => {
        const allTournaments = Array.isArray(data) ? data : (data.tournaments || []);
        const found = allTournaments.find((t) => (t._id || t.id).toString() === id);
        if (found) {
          setTournament(found);
        } else {
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

  const handleJoinConfirm = async () => {
    // 🟢 Validation for Game ID and Username
    if (!gameId.trim() || !gameUsername.trim()) {
      alert("⚠️ Kripya apni Game ID aur Game Username enter karein!");
      return;
    }

    // Save permanently in localStorage so user doesn't need to type again
    localStorage.setItem("userGameId", gameId.trim());
    localStorage.setItem("userGameUsername", gameUsername.trim());

    const entryFee = parseFloat(tournament.entry) || 0;

    try {
      // 🟢 Pehle server se live balance check karein taaki sync error na aaye
      const balanceRes = await fetch(`${API_URL}/api/user/balance?email=${encodeURIComponent(userEmail)}`);
      const balanceData = await balanceRes.json();

      let liveBalance = (balanceData.success && balanceData.balance !== undefined) 
        ? balanceData.balance 
        : parseFloat(localStorage.getItem("walletBalance") || "0");

      // 🔴 1. Insufficient Balance Protection
      if (liveBalance < entryFee) {
        alert(`⚠️ Insufficient Balance!\n\nYou need ₹${entryFee} to join this tournament, but your live balance is ₹${liveBalance}. Please add money.`);
        navigate("/wallet");
        return;
      }

      // Deduct entry fee from backend wallet database
      const deductRes = await fetch(`${API_URL}/api/wallet/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, amount: entryFee })
      });
      const deductData = await deductRes.json();

      if (!deductData.success) {
        alert(deductData.message || "Failed to deduct entry fee from wallet!");
        return;
      }

      // Update local wallet balance state & storage
      liveBalance = deductData.newBalance;
      localStorage.setItem("walletBalance", liveBalance.toFixed(2));

      const tournamentId = tournament._id || tournament.id;

      // 🟢 Send join details to backend with Game ID & Username for Admin panel list
      const joinRes = await fetch(`${API_URL}/api/tournaments/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournamentId,
          userEmail: userEmail,
          userName: userName,
          gameId: gameId.trim(),
          gameUsername: gameUsername.trim()
        })
      });
      const joinData = await joinRes.json();

      if (joinData.success) {
        // Save joined tournament ID locally
        const myJoinedIds = JSON.parse(localStorage.getItem("myJoinedTournamentIds")) || [];
        if (!myJoinedIds.includes(tournamentId)) {
          myJoinedIds.push(tournamentId);
          localStorage.setItem("myJoinedTournamentIds", JSON.stringify(myJoinedIds));
        }

        alert(`🎉 Successfully Registered!\n\n₹${entryFee} has been deducted from your wallet. Good luck! 🚀`);
        navigate("/tournaments");
      } else {
        alert(joinData.message || "Failed to join tournament on server!");
      }
    } catch (err) {
      console.error("Join tournament network error:", err);
      alert("Server error during tournament registration.");
    }
  };

  if (!tournament) {
    return (
      <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", textAlign: "center", paddingTop: "100px" }}>
        <h2>Tournament not found or loading...</h2>
        <button onClick={() => navigate(-1)} style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", marginTop: "10px", cursor: "pointer" }}>← Back</button>
      </div>
    );
  }

  const isFull = tournament.registeredUsers && tournament.registeredUsers.length >= (tournament.totalSlots || tournament.slots);

  // Safely parse start time for display
  const parsedStartTime = tournament.startTime 
    ? (!isNaN(tournament.startTime) ? new Date(Number(tournament.startTime)) : new Date(tournament.startTime))
    : null;
  const formattedDateTime = parsedStartTime && !isNaN(parsedStartTime.getTime())
    ? parsedStartTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : "TBA";

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
          {/* 🟢 Live Green Box with Date & Time Side Box */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ background: "rgba(255,255,255,0.1)", color: "#fbbf24", fontSize: "9px", fontWeight: "800", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(251,191,36,0.3)" }}>
              🕒 {formattedDateTime}
            </span>
            <span style={{ background: isFull ? "#ef4444" : "#22c55e", color: "#fff", fontSize: "9px", fontWeight: "800", padding: "4px 8px", borderRadius: "6px" }}>
              {isFull ? "● FULL" : "● LIVE"}
            </span>
          </div>
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
            <strong style={{ color: "#fff", fontSize: "13px" }}>{tournament.registeredUsers ? tournament.registeredUsers.length : 0} / {tournament.totalSlots || tournament.slots}</strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af", fontSize: "10px", display: "block" }}>MATCH TIME</span>
            <strong style={{ color: "#cbd5e1", fontSize: "12px" }}>{formattedDateTime}</strong>
          </div>
        </div>

      </div>

      {/* 🟢 Game ID & Username Input Section */}
      <div style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.4)", padding: "16px", borderRadius: "14px", marginBottom: "20px" }}>
        <h3 style={{ color: "#c084fc", fontSize: "13px", margin: "0 0 10px 0", fontWeight: "900" }}>
          🎮 ENTER YOUR GAME DETAILS (Saved for Future)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>Game Character ID / UID</label>
            <input 
              type="text" 
              placeholder="e.g. 582910293" 
              value={gameId} 
              onChange={(e) => setGameId(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "12px", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>In-Game Username</label>
            <input 
              type="text" 
              placeholder="e.g. ꧁#LEGEND#꧂" 
              value={gameUsername} 
              onChange={(e) => setGameUsername(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "12px", boxSizing: "border-box" }}
            />
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