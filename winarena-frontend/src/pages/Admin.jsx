import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      alert("Access Denied! Only admin can access this page.");
      navigate("/login");
    }
  }, [navigate]);

  const [tournaments, setTournaments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState("tournaments"); // "tournaments" or "transactions"

  const [game, setGame] = useState("FREE FIRE");
  const [mode, setMode] = useState("SOLO");
  const [entry, setEntry] = useState("10");
  const [prize, setPrize] = useState("500");
  const [totalSlots, setTotalSlots] = useState("10");
  const [startTime, setStartTime] = useState("");
  const [image, setImage] = useState("/freefire.png");

  const [roomData, setRoomData] = useState({});

  // 🟢 Live Backend URL Constant
  const API_URL = "https://winarena-backend-1.onrender.com";

  useEffect(() => {
    fetchTournaments();
    fetchWithdrawals();
  }, []);

  // 🟢 Fetch Tournaments from Backend MongoDB
  const fetchTournaments = () => {
    fetch(`${API_URL}/api/tournaments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTournaments(data);
        } else if (data.tournaments) {
          setTournaments(data.tournaments);
        }
      })
      .catch((err) => console.error("Error fetching tournaments:", err));
  };

  const fetchWithdrawals = () => {
    fetch(`${API_URL}/api/admin/withdrawals`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWithdrawals(data.withdrawals);
        }
      })
      .catch((err) => console.error("Error fetching withdrawals:", err));
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/approve-withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        alert("Withdrawal Approved Successfully! ✅");
        fetchWithdrawals();
      } else {
        alert(data.message || "Failed to approve");
      }
    } catch (err) {
      console.error("Approval error:", err);
      alert("Server error during approval");
    }
  };

  // 🟢 Admin Pay Winner Handler
  const handlePayWinner = async (userEmail) => {
    const amount = prompt("Enter prize amount to send to this player's wallet (₹):");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/pay-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, prizeAmount: Number(amount) })
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message || "Prize sent successfully! 🏆");
      } else {
        alert(data.message || "Failed to send prize.");
      }
    } catch (err) {
      console.error("Pay winner error:", err);
      alert("Server error while paying winner.");
    }
  };

  // 🟢 Create Tournament via Backend API
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    const matchTimestamp = startTime ? new Date(startTime).getTime() : Date.now() + 3600000;

    const newTournament = {
      game,
      mode,
      entry: Number(entry),
      prize: Number(prize),
      slots: parseInt(totalSlots) || 10,
      registeredUsers: [],
      roomId: "",
      roomPass: "",
      image,
      startTime: matchTimestamp
    };

    try {
      const res = await fetch(`${API_URL}/api/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTournament)
      });
      const data = await res.json();
      
      if (res.ok) {
        alert("Tournament Successfully Created & Live in Database! 🚀");
        fetchTournaments();
        setMode("SOLO");
        setEntry("10");
        setPrize("500");
        setTotalSlots("10");
        setStartTime("");
      } else {
        alert(data.message || "Failed to create tournament");
      }
    } catch (err) {
      console.error("Create tournament error:", err);
      alert("Server error while creating tournament");
    }
  };

  // 🟢 Publish Room Credentials via Backend API
  const handlePublishRoom = async (id) => {
    const { roomId, roomPass } = roomData[id] || {};
    if (!roomId || !roomPass) {
      alert("Please enter both Room ID and Password!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, roomPass })
      });
      const data = await res.json();

      if (res.ok || data.success) {
        alert("Room ID & Password Published Successfully! 🚀");
        fetchTournaments();
      } else {
        alert(data.message || "Failed to publish room details");
      }
    } catch (err) {
      console.error("Publish room error:", err);
      alert("Server error while publishing room details");
    }
  };

  // 🟢 Delete Tournament via Backend API
  const handleDeleteTournament = async (id) => {
    if (window.confirm("Are you sure you want to delete this tournament?")) {
      try {
        const res = await fetch(`${API_URL}/api/tournaments/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          alert("Tournament Deleted Successfully!");
          fetchTournaments();
        } else {
          alert("Failed to delete tournament");
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("Server error during deletion");
      }
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", maxWidth: "650px", margin: "0 auto", paddingBottom: "60px" }}>
      
      {/* TOP NAVIGATION BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button 
          onClick={() => navigate("/")} 
          style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
        >
          ← Home
        </button>

        {/* SIDE BUTTON FOR USER TRANSACTIONS */}
        <button 
          onClick={() => setActiveTab(activeTab === "tournaments" ? "transactions" : "tournaments")}
          style={{ background: activeTab === "tournaments" ? "#fbbf24" : "#22c55e", color: "#000", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "900", cursor: "pointer", fontSize: "12px" }}
        >
          {activeTab === "tournaments" ? "📊 View User Transactions" : "🏆 Manage Tournaments"}
        </button>
      </div>

      <h1 style={{ fontSize: "22px", color: "#fbbf24", marginBottom: "6px", fontWeight: "900" }}>
        {activeTab === "tournaments" ? "ADMIN PANEL - MANAGE TOURNAMENTS" : "ADMIN PANEL - USER WITHDRAWALS"}
      </h1>
      <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "20px" }}>
        {activeTab === "tournaments" ? "Naye tournaments banayein, Room ID publish karein aur winner ko payout dein." : "Users dwara bheje gaye withdrawals ki date, time aur amount yahan dekhein aur approve karein."}
      </p>

      {/* CONDITIONAL RENDERING BASED ON TAB */}
      {activeTab === "tournaments" ? (
        <>
          {/* CREATE TOURNAMENT FORM */}
          <form onSubmit={handleCreateTournament} style={{ display: "flex", flexDirection: "column", gap: "14px", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "30px" }}>
            <h3 style={{ fontSize: "14px", color: "#22c55e", margin: 0 }}>+ Create New Tournament</h3>
            
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Select Game</label>
              <select 
                value={game} 
                onChange={(e) => {
                  setGame(e.target.value);
                  if(e.target.value === "FREE FIRE") setImage("/freefire.png");
                  else if(e.target.value === "CARROM") setImage("/carrom.png");
                  else setImage("/ludo.png");
                }}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <option value="FREE FIRE">FREE FIRE</option>
                <option value="CARROM">CARROM</option>
                <option value="LUDO">LUDO</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Tournament Mode</label>
              <input type="text" value={mode} onChange={(e) => setMode(e.target.value)} placeholder="e.g. SOLO" required style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Entry Fee (₹)</label>
                <input type="number" value={entry} onChange={(e) => setEntry(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Prize Pool (₹)</label>
                <input type="number" value={prize} onChange={(e) => setPrize(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Total Slots</label>
              <input type="number" value={totalSlots} onChange={(e) => setTotalSlots(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>Start Date & Time</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }} />
            </div>

            <button type="submit" style={{ background: "#22c55e", color: "#000", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "900", cursor: "pointer" }}>
              PUBLISH TOURNAMENT 🚀
            </button>
          </form>

          {/* PUBLISHED TOURNAMENTS */}
          <h2 style={{ fontSize: "16px", color: "#fbbf24", marginBottom: "12px" }}>Manage Active Tournaments & Players</h2>
          {tournaments.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "12px" }}>No tournaments created yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {tournaments.map((t) => {
                const tournamentId = t._id || t.id;
                return (
                  <div key={tournamentId} style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.15)" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <h4 style={{ margin: 0, fontSize: "13px", color: "#fff" }}>{t.game} - {t.mode}</h4>
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>Slots: {t.registeredUsers?.length || 0}/{t.slots || t.totalSlots}</span>
                    </div>

                    <div style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", display: "inline-block", marginBottom: "10px" }}>
                      📅 Match Time: {new Date(Number(t.startTime) || t.startTime).toLocaleString()}
                    </div>

                    {/* 🟢 REGISTERED PLAYERS LIST WITH PAY WINNER BUTTON */}
                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "8px", marginBottom: "12px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                      <span style={{ fontSize: "11px", color: "#c084fc", fontWeight: "900", display: "block", marginBottom: "6px" }}>👥 Registered Players & Winners Payout:</span>
                      {(!t.registeredUsers || t.registeredUsers.length === 0) ? (
                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>No players joined yet.</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {t.registeredUsers.map((u, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "6px 8px", borderRadius: "6px" }}>
                              <div style={{ fontSize: "11px" }}>
                                <strong style={{ color: "#fff" }}>{u.name || "Player"}</strong> ({u.email})
                                <div style={{ fontSize: "9px", color: "#9ca3af" }}>Game ID: <span style={{ color: "#38bdf8" }}>{u.gameId || "N/A"}</span> | Username: <span style={{ color: "#38bdf8" }}>{u.gameUsername || "N/A"}</span></div>
                              </div>
                              <button 
                                onClick={() => handlePayWinner(u.email)}
                                style={{ background: "#22c55e", color: "#000", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "900", cursor: "pointer" }}
                              >
                                🏆 Pay Winner
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <input 
                        type="text" placeholder="Room ID" defaultValue={t.roomId || ""}
                        onChange={(e) => setRoomData({ ...roomData, [tournamentId]: { ...roomData[tournamentId], roomId: e.target.value } })}
                        style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "11px", boxSizing: "border-box" }}
                      />
                      <input 
                        type="text" placeholder="Password" defaultValue={t.roomPass || ""}
                        onChange={(e) => setRoomData({ ...roomData, [tournamentId]: { ...roomData[tournamentId], roomPass: e.target.value } })}
                        style={{ padding: "8px", borderRadius: "6px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "11px", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                      <button 
                        onClick={() => handlePublishRoom(tournamentId)}
                        style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontWeight: "800", cursor: "pointer", fontSize: "11px" }}
                      >
                        PUBLISH ROOM CREDENTIALS 🔑
                      </button>
                      <button 
                        onClick={() => handleDeleteTournament(tournamentId)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", fontWeight: "800", cursor: "pointer", fontSize: "11px" }}
                      >
                        🗑️ DELETE
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* TRANSACTIONS VIEW TAB */
        <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "16px" }}>
          <h3 style={{ fontSize: "15px", color: "#fbbf24", marginBottom: "14px", fontWeight: "900" }}>
            User Withdrawal Requests (MongoDB Database)
          </h3>

          {withdrawals.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "12px", padding: "20px 0" }}>No withdrawal transactions found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {withdrawals.map((item) => (
                <div 
                  key={item._id} 
                  style={{ 
                    background: "rgba(255,255,255,0.03)", 
                    border: "1px solid rgba(255,255,255,0.08)", 
                    borderRadius: "12px", 
                    padding: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <span style={{ fontSize: "11px", color: "#9ca3af", display: "block", fontWeight: "700" }}>
                      User: <strong style={{ color: "#fff" }}>{item.userEmail || "N/A"}</strong>
                    </span>
                    <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "900", display: "block", marginTop: "2px" }}>
                      Method: {item.method} | Payout: ₹{item.finalPayout?.toFixed(2)} 
                      <small style={{ color: "#22c55e", marginLeft: "6px" }}>(Fee: ₹{item.commissionAmount?.toFixed(2)})</small>
                    </span>

                    {/* USER BANK / UPI / PAYTM DETAILS SHOWN TO ADMIN */}
                    {item.details && (
                      <div style={{ background: "rgba(0,0,0,0.4)", padding: "8px 10px", borderRadius: "8px", marginTop: "8px", border: "1px dashed rgba(251,191,36,0.4)" }}>
                        {item.method === "UPI" && <span style={{ fontSize: "11px", color: "#fbbf24" }}>UPI ID: <b>{item.details.upiId}</b></span>}
                        {item.method === "Paytm" && <span style={{ fontSize: "11px", color: "#fbbf24" }}>Paytm No: <b>{item.details.paytmNumber}</b></span>}
                        {item.method === "Bank" && (
                          <div style={{ fontSize: "11px", color: "#fbbf24", display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>Name: <b>{item.details.name}</b></span>
                            <span>A/C No: <b>{item.details.accNo}</b></span>
                            <span>IFSC: <b>{item.details.ifsc}</b></span>
                          </div>
                        )}
                      </div>
                    )}

                    <span style={{ fontSize: "10px", color: "#9ca3af", display: "block", marginTop: "6px" }}>
                      🕒 Date & Time: {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#ef4444", fontWeight: "900", display: "block" }}>
                      -₹{item.withdrawalAmount}
                    </span>
                    {item.status === "Approved" ? (
                      <span style={{ fontSize: "10px", background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "4px 10px", borderRadius: "6px", fontWeight: "900" }}>
                        ✓ Approved
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleApprove(item._id)}
                        style={{ background: "#22c55e", color: "#000", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: "900", fontSize: "11px", cursor: "pointer" }}
                      >
                        Approve ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}