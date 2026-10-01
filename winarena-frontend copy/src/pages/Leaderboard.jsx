import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Leaderboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Weekly"); // Tabs: Daily, Weekly, Monthly
  const [topUsers, setTopUsers] = useState([]);

  // 🟢 Live Backend URL Constant
  const API_URL = "https://winarena-backend-1.onrender.com";

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      const earningsMap = {};

      // 1. Fetch tournaments from Backend MongoDB Database
      try {
        const res = await fetch(`${API_URL}/api/tournaments`);
        const data = await res.json();
        const allTournaments = Array.isArray(data) ? data : (data.tournaments || []);

        allTournaments.forEach((t) => {
          if (t.registeredUsers && Array.isArray(t.registeredUsers)) {
            t.registeredUsers.forEach((user) => {
              if (!earningsMap[user]) {
                earningsMap[user] = 0;
              }
              earningsMap[user] += parseFloat(t.prize) || 500;
            });
          }
        });
      } catch (err) {
        console.error("Error fetching tournaments for leaderboard from backend, checking local storage:", err);
      }

      // 2. Fallback to LocalStorage admin tournaments if backend is empty
      if (Object.keys(earningsMap).length === 0) {
        const localTournaments = JSON.parse(localStorage.getItem("adminTournaments")) || [];
        localTournaments.forEach((t) => {
          if (t.registeredUsers && Array.isArray(t.registeredUsers)) {
            t.registeredUsers.forEach((user) => {
              if (!earningsMap[user]) {
                earningsMap[user] = 0;
              }
              earningsMap[user] += parseFloat(t.prize) || 500;
            });
          }
        });
      }

      // 3. Map earnings to users list
      let usersList = Object.keys(earningsMap).map((name) => ({
        name,
        earnings: earningsMap[name]
      }));

      // 4. Agar koi real user registered nahi hai, tabhi default players dikhayein
      if (usersList.length === 0) {
        usersList = [
          { name: "RahulGamer", earnings: 14500 },
          { name: "VickyOp", earnings: 12200 },
          { name: "KillerBoy", earnings: 9800 },
          { name: "Ajay99", earnings: 8500 },
          { name: "DevKing", earnings: 7200 },
          { name: "FireStorm", earnings: 6400 },
          { name: "AlphaWolf", earnings: 5100 },
          { name: "ShadowX", earnings: 4300 },
          { name: "Raja007", earnings: 3500 },
          { name: "TigerEye", earnings: 2900 }
        ];
      }

      // 5. Tab filters ke hisaab se earnings adjust karein
      if (activeTab === "Daily") {
        usersList = usersList.map(u => ({ ...u, earnings: Math.round(u.earnings / 7) }));
      } else if (activeTab === "Monthly") {
        usersList = usersList.map(u => ({ ...u, earnings: u.earnings * 4 }));
      }

      // Sabse zyada earn karne walon ko top par sort karein
      usersList.sort((a, b) => b.earnings - a.earnings);
      setTopUsers(usersList);
    };

    fetchLeaderboardData();
  }, [activeTab]);

  const top3 = topUsers.slice(0, 3);
  const remainingUsers = topUsers.slice(3);

  return (
    <div style={{ padding: "16px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "90px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* HEADER TITLE */}
      <h1 style={{ fontSize: "18px", color: "#fbbf24", marginBottom: "12px", fontWeight: "900", textAlign: "center" }}>
        👑 Leaderboard
      </h1>

      {/* TABS (Daily, Weekly, Monthly) */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "4px", borderRadius: "10px", marginBottom: "20px" }}>
        {["Daily", "Weekly", "Monthly"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              background: activeTab === tab ? "#7c3aed" : "transparent",
              color: activeTab === tab ? "#fff" : "#9ca3af",
              border: "none",
              padding: "8px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "800",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TOP 3 PODIUM SECTION */}
      {top3.length >= 3 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "10px", marginBottom: "24px", padding: "10px 0" }}>
          
          {/* 2nd RANK (Silver) */}
          <div style={{ flex: 1, background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(226, 232, 240, 0.3)", borderRadius: "14px", padding: "12px 8px", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "#e2e8f0", color: "#000", fontSize: "9px", fontWeight: "900", padding: "2px 6px", borderRadius: "4px" }}>#2</div>
            <div style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>🥈</div>
            <h4 style={{ margin: "0 0 2px 0", fontSize: "12px", color: "#fff", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top3[1].name}</h4>
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "900" }}>₹{top3[1].earnings.toLocaleString()}</span>
          </div>

          {/* 1st RANK (Gold) */}
          <div style={{ flex: 1, background: "linear-gradient(135deg, #311042 0%, #1e1b4b 100%)", border: "2px solid #fbbf24", borderRadius: "16px", padding: "16px 8px", textAlign: "center", position: "relative", transform: "translateY(-10px)", boxShadow: "0 6px 20px rgba(251, 191, 36, 0.25)" }}>
            <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#fbbf24", color: "#000", fontSize: "10px", fontWeight: "900", padding: "2px 8px", borderRadius: "4px" }}>#1 👑</div>
            <div style={{ fontSize: "34px", margin: "8px 0 4px 0" }}>🥇</div>
            <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#fff", fontWeight: "900", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top3[0].name}</h4>
            <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "900" }}>₹{top3[0].earnings.toLocaleString()}</span>
          </div>

          {/* 3rd RANK (Bronze) */}
          <div style={{ flex: 1, background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(217, 119, 6, 0.3)", borderRadius: "14px", padding: "12px 8px", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "#d97706", color: "#fff", fontSize: "9px", fontWeight: "900", padding: "2px 6px", borderRadius: "4px" }}>#3</div>
            <div style={{ fontSize: "28px", margin: "8px 0 4px 0" }}>🥉</div>
            <h4 style={{ margin: "0 0 2px 0", fontSize: "12px", color: "#fff", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top3[2].name}</h4>
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "900" }}>₹{top3[2].earnings.toLocaleString()}</span>
          </div>

        </div>
      )}

      {/* REMAINING USERS LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {remainingUsers.map((user, index) => {
          const actualRank = index + 4;
          return (
            <div key={index} style={{ 
              background: "rgba(255,255,255,0.03)", 
              padding: "10px 14px", 
              borderRadius: "12px", 
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: "900", color: "#9ca3af", width: "20px", textAlign: "center" }}>
                  {actualRank}
                </span>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#1e1b4b", display: "grid", placeItems: "center", fontSize: "14px" }}>
                  👤
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "800" }}>
                    {user.name}
                  </h4>
                  <span style={{ fontSize: "9px", color: "#22c55e" }}>Live User</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong style={{ color: "#22c55e", fontSize: "13px" }}>₹{user.earnings.toLocaleString()}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item"><span>⌂</span><small>Home</small></Link>
        <Link to="/games" className="nav-item"><span>🎮</span><small>Games</small></Link>
        <Link to="/tournaments" className="nav-item"><span>🏆</span><small>Tournaments</small></Link>
        <Link to="/wallet" className="nav-item"><span>₹</span><small>Wallet</small></Link>
        <Link to="/profile" className="nav-item"><span>👤</span><small>Profile</small></Link>
      </nav>

    </div>
  );
}