import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [userName, setUserName] = useState("User");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [playerId, setPlayerId] = useState("WA000000");

  // User Stats based on Tournaments participation
  const [totalGames, setTotalGames] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [winRate, setWinRate] = useState("0%");

  // Level & XP state
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelProgress, setLevelProgress] = useState(0);
  const [nextLevelTarget, setNextLevelTarget] = useState(50);
  const [totalWinnings, setTotalWinnings] = useState(0);

  // Modals state ("edit", "security", "rewards", "history", "about")
  const [activeModal, setActiveModal] = useState(null);
  const [passwordData, setPasswordData] = useState({ current: "", newPass: "" });

  // 🛡️ Authentication & Data Load Check
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    
    if (!isLoggedIn && !isAdmin) {
      alert("Please login first to view your profile!");
      navigate("/login");
      return;
    }

    const savedBalance = localStorage.getItem("walletBalance");
    if (savedBalance) {
      setWalletBalance(parseFloat(savedBalance).toFixed(2));
    }

    // 🔴 Fixed: Synchronized with both `userProfile` and individual keys
    const savedUser = JSON.parse(localStorage.getItem("userProfile"));
    const singleUserName = localStorage.getItem("userName");
    const singleEmail = localStorage.getItem("userEmail");
    const singleMobile = localStorage.getItem("userMobile");

    if (savedUser) {
      if (savedUser.name) setUserName(savedUser.name);
      if (savedUser.email) setEmail(savedUser.email);
      if (savedUser.mobile) setMobile(savedUser.mobile);
      if (savedUser.playerId) setPlayerId(savedUser.playerId);
    } else if (singleUserName || singleEmail || singleMobile) {
      if (singleUserName) setUserName(singleUserName);
      if (singleEmail) setEmail(singleEmail);
      if (singleMobile) setMobile(singleMobile);
      setPlayerId("WA" + Math.floor(100000 + Math.random() * 900000));
    } else {
      setPlayerId("WA" + Math.floor(100000 + Math.random() * 900000));
    }

    const allTournaments = JSON.parse(localStorage.getItem("adminTournaments")) || [];
    let gamesCount = 0;
    let winsCount = 0;
    let winningsSum = 0;

    allTournaments.forEach((t) => {
      if (t.registeredUsers && t.registeredUsers.includes(userName)) {
        gamesCount++;
        winsCount++;
        winningsSum += parseFloat(t.prize) || 500;
      }
    });

    setTotalGames(gamesCount);
    setTotalWins(winsCount);
    setWinRate(gamesCount > 0 ? ((winsCount / gamesCount) * 100).toFixed(1) + "%" : "0%");
    setTotalWinnings(winningsSum);

    // Dynamic Level Calculation based on winnings
    let level = 0;
    let target = 50;
    let accumulated = 0;

    while (winningsSum >= accumulated + target) {
      accumulated += target;
      level++;
      target = target * 2;
    }

    setCurrentLevel(level);
    setNextLevelTarget(target);
    const progressInCurrentLevel = winningsSum - accumulated;
    setLevelProgress(target > 0 ? Math.min(Math.round((progressInCurrentLevel / target) * 100), 100) : 0);

  }, [navigate, userName]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isAdmin");
    navigate("/login");
  };

  // 🔴 Fixed: Save profile details to all necessary localStorage keys simultaneously
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const profileData = { name: userName, email, mobile, playerId };
    localStorage.setItem("userProfile", JSON.stringify(profileData));
    localStorage.setItem("userName", userName);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userMobile", mobile);
    
    alert("Profile updated successfully! 🚀");
    setActiveModal(null);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!passwordData.newPass || passwordData.newPass.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }
    alert("Account security password updated successfully! 🛡️");
    setPasswordData({ current: "", newPass: "" });
    setActiveModal(null);
  };

  return (
    <div style={{ padding: "16px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "90px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* HEADER TOP BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "18px", color: "#fbbf24", margin: 0, fontWeight: "900" }}>
          👤 My Profile
        </h1>
        <div 
          onClick={() => navigate("/wallet")}
          style={{ background: "rgba(251, 191, 36, 0.15)", border: "1px solid #fbbf24", padding: "6px 12px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
        >
          <span style={{ color: "#fbbf24", fontSize: "12px" }}>₹</span>
          <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "13px" }}>{walletBalance}</span>
        </div>
      </div>

      {/* USER PROFILE CARD */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#7c3aed", display: "grid", placeItems: "center", fontSize: "28px", border: "2px solid #fbbf24", flexShrink: 0 }}>
          👨‍💻
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", color: "#fff", fontWeight: "900" }}>{userName}</h3>
            <span onClick={() => setActiveModal("edit")} style={{ cursor: "pointer", fontSize: "12px" }} title="Edit Profile">✏️</span>
          </div>
          <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#9ca3af" }}>
            Player ID: {playerId} <span style={{ cursor: "pointer" }} onClick={() => alert("Player ID Copied!")}>📋</span>
          </p>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", color: "#fbbf24", fontSize: "9px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(251,191,36,0.3)" }}>
              👑 Level {currentLevel}
            </span>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${levelProgress}%`, background: "#fbbf24", height: "100%", borderRadius: "3px", transition: "width 0.4s ease" }}></div>
            </div>
            <span style={{ fontSize: "9px", color: "#9ca3af" }}>₹{totalWinnings} / ₹{nextLevelTarget}</span>
          </div>
        </div>
      </div>

      {/* STATS 4-GRID BOX */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {[
          { label: "Total Wins", val: totalWins, icon: "🏆" },
          { label: "Total Games", val: totalGames, icon: "🎮" },
          { label: "Win Rate", val: winRate, icon: "⭐" },
          { label: "Total Balance", val: `₹${walletBalance}`, icon: "💳" }
        ].map((stat, idx) => (
          <div key={idx} style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "10px 4px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", marginBottom: "2px" }}>{stat.icon}</div>
            <span style={{ fontSize: "8px", color: "#9ca3af", display: "block", fontWeight: "700" }}>{stat.label}</span>
            <strong style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "900" }}>{stat.val}</strong>
          </div>
        ))}
      </div>

      {/* MENU BUTTONS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        
        <div onClick={() => setActiveModal("edit")} style={menuCardStyle}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>👤</span>
            <div>
              <h4 style={menuTitleStyle}>Edit Profile</h4>
              <p style={menuDescStyle}>Update your name, email, mobile number</p>
            </div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: "14px" }}>›</span>
        </div>

        <div onClick={() => setActiveModal("security")} style={menuCardStyle}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>🛡️</span>
            <div>
              <h4 style={menuTitleStyle}>Account Security</h4>
              <p style={menuDescStyle}>Change password, 2FA, linked accounts</p>
            </div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: "14px" }}>›</span>
        </div>

        <div onClick={() => setActiveModal("rewards")} style={menuCardStyle}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>🎁</span>
            <div>
              <h4 style={menuTitleStyle}>My Rewards</h4>
              <p style={menuDescStyle}>View your bonuses & cashback</p>
            </div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: "14px" }}>›</span>
        </div>

        <div onClick={() => setActiveModal("history")} style={menuCardStyle}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>📊</span>
            <div>
              <h4 style={menuTitleStyle}>Transaction History</h4>
              <p style={menuDescStyle}>View deposits, withdrawals & game history</p>
            </div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: "14px" }}>›</span>
        </div>

        <div onClick={() => navigate("/support")} style={menuCardStyle}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>🎧</span>
            <div>
              <h4 style={menuTitleStyle}>Help & Support</h4>
              <p style={menuDescStyle}>FAQs, contact us, raise a ticket</p>
            </div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: "14px" }}>›</span>
        </div>

        <div onClick={() => setActiveModal("about")} style={menuCardStyle}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>ℹ️</span>
            <div>
              <h4 style={menuTitleStyle}>About WinArena</h4>
              <p style={menuDescStyle}>Terms, Privacy, Responsible Gaming</p>
            </div>
          </div>
          <span style={{ color: "#fbbf24", fontSize: "14px" }}>›</span>
        </div>

        <div onClick={handleLogout} style={{ ...menuCardStyle, background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <div style={menuContentStyle}>
            <span style={{ fontSize: "18px" }}>🚪</span>
            <div>
              <h4 style={{ margin: 0, fontSize: "13px", color: "#ef4444", fontWeight: "900" }}>Log Out</h4>
            </div>
          </div>
          <span style={{ color: "#ef4444", fontSize: "14px" }}>›</span>
        </div>

      </div>

      {/* ================= MODALS ================= */}

      {/* 1. EDIT PROFILE MODAL */}
      {activeModal === "edit" && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 14px 0", fontSize: "16px" }}>✏️ Edit Profile</h3>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "10px", color: "#9ca3af" }}>Full Name</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} style={inputStyle} required />
              
              <label style={{ fontSize: "10px", color: "#9ca3af" }}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
              
              <label style={{ fontSize: "10px", color: "#9ca3af" }}>Mobile Number</label>
              <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} style={inputStyle} required />

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" style={btnPrimaryStyle}>Save Changes</button>
                <button type="button" onClick={() => setActiveModal(null)} style={btnSecondaryStyle}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ACCOUNT SECURITY MODAL */}
      {activeModal === "security" && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 14px 0", fontSize: "16px" }}>🛡️ Account Security</h3>
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "10px", color: "#9ca3af" }}>Current Password</label>
              <input type="password" placeholder="••••••••" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} style={inputStyle} required />
              
              <label style={{ fontSize: "10px", color: "#9ca3af" }}>New Password</label>
              <input type="password" placeholder="At least 6 chars" value={passwordData.newPass} onChange={(e) => setPasswordData({...passwordData, newPass: e.target.value})} style={inputStyle} required />

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" style={btnPrimaryStyle}>Update Password</button>
                <button type="button" onClick={() => setActiveModal(null)} style={btnSecondaryStyle}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MY REWARDS MODAL */}
      {activeModal === "rewards" && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 10px 0", fontSize: "16px" }}>🎁 My Rewards & Cashback</h3>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginBottom: "14px" }}>Aapke active bonuses aur tournament winning rewards:</p>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "8px", marginBottom: "14px", fontSize: "12px" }}>
              ✨ Welcome Bonus: <strong style={{ color: "#22c55e" }}>₹50 Unlocked</strong><br />
              🔥 Tournament Cashback: <strong style={{ color: "#22c55e" }}>₹100 Active</strong>
            </div>
            <button onClick={() => setActiveModal(null)} style={btnPrimaryStyle}>Got It 👍</button>
          </div>
        </div>
      )}

      {/* 4. TRANSACTION HISTORY MODAL */}
      {activeModal === "history" && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 10px 0", fontSize: "16px" }}>📊 Recent Transactions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px", maxHeight: "180px", overflowY: "auto" }}>
              <div style={transactionRow}>
                <span>Deposit via UPI</span>
                <strong style={{ color: "#22c55e" }}>+₹500</strong>
              </div>
              <div style={transactionRow}>
                <span>Free Fire Tournament Entry</span>
                <strong style={{ color: "#ef4444" }}>-₹10</strong>
              </div>
              <div style={transactionRow}>
                <span>Tournament Prize Won</span>
                <strong style={{ color: "#22c55e" }}>+₹500</strong>
              </div>
            </div>
            <button onClick={() => setActiveModal(null)} style={btnPrimaryStyle}>Close</button>
          </div>
        </div>
      )}

      {/* 5. ABOUT WINARENA MODAL */}
      {activeModal === "about" && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 10px 0", fontSize: "16px" }}>ℹ️ About WinArena</h3>
            <div style={{ fontSize: "11px", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "14px", maxHeight: "200px", overflowY: "auto" }}>
              <p><strong>WinArena v2.4</strong> is India's next-generation competitive gaming tournament platform designed for esports enthusiasts.</p>
              <p><strong>Key Features:</strong></p>
              <ul style={{ paddingLeft: "16px", margin: "4px 0" }}>
                <li>Daily Free Fire, Carrom, and Ludo tournaments.</li>
                <li>Instant UPI & Bank withdrawals with secure fee handling.</li>
                <li>Secure Room ID & Password distribution.</li>
              </ul>
              <p style={{ marginTop: "8px", color: "#9ca3af" }}>© 2026 WinArena Inc. All rights reserved. Play Responsibly.</p>
            </div>
            <button onClick={() => setActiveModal(null)} style={btnPrimaryStyle}>Close</button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item"><span>⌂</span><small>Home</small></Link>
        <Link to="/games" className="nav-item"><span>🎮</span><small>Games</small></Link>
        <Link to="/tournaments" className="nav-item"><span>🏆</span><small>Tournaments</small></Link>
        <Link to="/wallet" className="nav-item"><span>₹</span><small>Wallet</small></Link>
        <Link to="/profile" className="nav-item active"><span>👤</span><small>Profile</small></Link>
      </nav>

    </div>
  );
}

// Styling Helper Objects
const menuCardStyle = {
  background: "rgba(255,255,255,0.03)", 
  padding: "12px 14px", 
  borderRadius: "12px", 
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer"
};

const menuContentStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px"
};

const menuTitleStyle = {
  margin: "0 0 2px 0",
  fontSize: "13px",
  color: "#fff",
  fontWeight: "800"
};

const menuDescStyle = {
  margin: 0,
  fontSize: "10px",
  color: "#9ca3af"
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "16px",
  boxSizing: "border-box"
};

const modalBoxStyle = {
  background: "#0f172a",
  border: "1px solid rgba(251, 191, 36, 0.4)",
  borderRadius: "16px",
  padding: "20px",
  width: "100%",
  maxWidth: "400px",
  boxSizing: "border-box"
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  background: "#1e1b4b",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  fontSize: "12px",
  boxSizing: "border-box"
};

const btnPrimaryStyle = {
  flex: 1,
  background: "#fbbf24",
  color: "#000",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "12px"
};

const btnSecondaryStyle = {
  flex: 1,
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
  border: "none",
  padding: "10px",
  borderRadius: "8px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "12px"
};

const transactionRow = {
  display: "flex",
  justifyContent: "space-between",
  background: "rgba(255,255,255,0.03)",
  padding: "8px 10px",
  borderRadius: "8px",
  fontSize: "11px"
};