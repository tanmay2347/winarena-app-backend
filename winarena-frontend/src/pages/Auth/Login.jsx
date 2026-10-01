import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // 🟢 ADMIN KA UNIQUE ID & PASSWORD
    const ADMIN_UNIQUE_ID = "admin@winarena.com";
    const ADMIN_PASSWORD = "admin@2347";

    if (email === ADMIN_UNIQUE_ID && password === ADMIN_PASSWORD) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("isAdmin", "true");
      alert("Welcome Admin!");
      navigate("/admin");
      return;
    }

    // 🛡️ Check Normal User (Local Storage Database & Single User match)
    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers")) || [];
    const singleUser = JSON.parse(localStorage.getItem("user"));

    let foundUser = registeredUsers.find(
      (user) => user.email === email && user.password === password
    );

    if (!foundUser && singleUser && singleUser.email === email && singleUser.password === password) {
      foundUser = singleUser;
    }

    if (foundUser) {
      // 🟢 Check if user changed or logged in fresh -> Reset wallet & history cache to 0 for safety
      const currentStoredEmail = localStorage.getItem("userEmail");
      if (currentStoredEmail !== foundUser.email) {
        localStorage.setItem("walletBalance", "0.00");
        localStorage.setItem("walletHistory", JSON.stringify([]));
        localStorage.setItem("arenaWalletActivated", "false");
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.removeItem("isAdmin");
      
      // Profile page ke liye data save karna
      localStorage.setItem("user", JSON.stringify(foundUser));
      localStorage.setItem("userName", foundUser.name);
      localStorage.setItem("userEmail", foundUser.email);
      localStorage.setItem("userMobile", foundUser.mobile);

      alert(`Welcome back, ${foundUser.name}! 🚀`);
      navigate("/");
    } else {
      alert("Invalid email or password! Please register first if you don't have an account.");
    }
  };

  return (
    <div style={{ padding: "30px 20px", color: "#fff", background: "#0f172a", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "400px", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* 🟢 PUBLIC FOLDER WALA LOGO IMAGE */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <img 
          src="/logo.png" 
          alt="WinArena Logo" 
          style={{ width: "110px", height: "auto", objectFit: "contain" }} 
        />
      </div>

      <h1 style={{ fontSize: "20px", color: "#fbbf24", marginBottom: "6px", fontWeight: "900", textAlign: "center" }}>
        LOGIN TO WINARENA
      </h1>
      <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "24px", textAlign: "center" }}>
        Enter your credentials to continue
      </p>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px", fontWeight: "700" }}>Email or Unique ID</label>
          <input 
            type="text" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Enter your email "
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#9ca3af", marginBottom: "4px", fontWeight: "700" }}>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter password"
            required
            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", boxSizing: "border-box" }}
          />
        </div>

        <button 
          type="submit" 
          style={{ 
            background: "#7c3aed", 
            color: "#fff", 
            border: "none", 
            padding: "12px", 
            borderRadius: "8px", 
            fontWeight: "900", 
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          LOGIN
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginTop: "20px" }}>
        Don't have an account? <Link to="/register" style={{ color: "#fbbf24", fontWeight: "700", textDecoration: "none" }}>Register</Link>
      </p>

    </div>
  );
}