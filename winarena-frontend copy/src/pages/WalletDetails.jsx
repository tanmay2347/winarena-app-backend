import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function WalletDetails() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isLoggedIn && !isAdmin) {
      alert("Please login first!");
      navigate("/login");
      return;
    }

    const savedBalance = localStorage.getItem("walletBalance");
    if (savedBalance) setBalance(parseFloat(savedBalance));

    // 🟢 Clean history fallback for new users (No dummy data)
    const savedHistory = JSON.parse(localStorage.getItem("walletHistory")) || [];
    setHistory(savedHistory);
  }, [navigate]);

  return (
    <div style={{ padding: "16px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "90px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box" }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => navigate("/wallet")} style={{ background: "transparent", border: "none", color: "#fbbf24", fontSize: "18px", cursor: "pointer", fontWeight: "900" }}>←</button>
        <h1 style={{ fontSize: "18px", color: "#fbbf24", margin: 0, fontWeight: "900" }}>📊 WinArena Wallet & History</h1>
      </div>

      <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "1px solid rgba(251,191,36,0.3)" }}>
        <span style={{ fontSize: "10px", color: "#cbd5e1", fontWeight: "800", display: "block" }}>TOTAL AVAILABLE BALANCE</span>
        <h2 style={{ fontSize: "32px", color: "#fff", margin: "6px 0 14px 0", fontWeight: "900" }}>₹{balance.toFixed(2)}</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/wallet")} style={{ flex: 1, background: "#fbbf24", color: "#000", border: "none", padding: "10px", borderRadius: "10px", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}>+ Add Money</button>
          <button onClick={() => navigate("/wallet")} style={{ flex: 1, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", padding: "10px", borderRadius: "10px", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}>↗ Withdraw</button>
        </div>
      </div>

      <h3 style={{ fontSize: "14px", color: "#fbbf24", marginBottom: "12px", fontWeight: "900" }}>📜 Transaction & Transfer History</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {history.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", marginTop: "20px" }}>No transactions found yet.</p>
        ) : (
          history.map((item, idx) => {
            const isPositive = item.amount > 0;
            return (
              <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#fff", fontWeight: "800" }}>{item.type}</h4>
                  <span style={{ fontSize: "9px", color: "#9ca3af" }}>{item.time}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "14px", color: isPositive ? "#22c55e" : "#ef4444", fontWeight: "900" }}>
                    {isPositive ? `+₹${Math.abs(item.amount).toFixed(2)}` : `-₹${Math.abs(item.amount).toFixed(2)}`}
                  </strong>
                  <span style={{ fontSize: "8px", display: "block", color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "1px 4px", borderRadius: "4px", marginTop: "2px" }}>{item.status || "Success"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <nav className="bottom-nav">
        <Link to="/" className="nav-item"><span>⌂</span><small>Home</small></Link>
        <Link to="/games" className="nav-item"><span>🎮</span><small>Games</small></Link>
        <Link to="/tournaments" className="nav-item"><span>🏆</span><small>Tournaments</small></Link>
        <Link to="/wallet" className="nav-item active"><span>₹</span><small>Wallet</small></Link>
        <Link to="/profile" className="nav-item"><span>👤</span><small>Profile</small></Link>
      </nav>
    </div>
  );
}