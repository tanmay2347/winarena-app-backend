import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const API_URL = "https://winarena-backend-1.onrender.com";

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !mobile || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (mobile.length !== 10) {
      alert("Enter a valid 10 digit mobile number");
      return;
    }

    try {
      // 🟢 1. Backend database mein user sync karein taaki balance 0.00 rahe
      const res = await fetch(`${API_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, mobile })
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Registration failed on server!");
        return;
      }

      // 🟢 2. Save into registeredUsers database array for local Login matching
      const userData = { name, email, mobile, password };
      const existingUsers = JSON.parse(localStorage.getItem("registeredUsers")) || [];
      
      const userExists = existingUsers.some((u) => u.email === email);
      if (userExists) {
        alert("Email already registered! Please login.");
        navigate("/login");
        return;
      }

      existingUsers.push(userData);
      localStorage.setItem("registeredUsers", JSON.stringify(existingUsers));

      // 🟢 3. Reset local wallet cache for new account
      localStorage.setItem("walletBalance", "0.00");
      localStorage.setItem("walletHistory", JSON.stringify([]));
      localStorage.setItem("arenaWalletActivated", "false");

      // Save active session & profile details
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("userName", name);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userMobile", mobile);

      alert("Account created successfully! 🚀");
      navigate("/");
    } catch (err) {
      console.error("Registration network error:", err);
      alert("Network error during registration. Please check your internet connection.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" style={{ textAlign: "center", marginBottom: "16px" }}>
          <img 
            src="/logo.png" 
            alt="WinArena Logo" 
            style={{ width: "110px", height: "auto", objectFit: "contain" }} 
          />
        </div>

        <h1>Create Account</h1>
        <p className="login-subtitle">
          Join WinArena and start your gaming journey
        </p>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Mobile Number</label>
            <input
              type="tel"
              placeholder="Enter 10 digit mobile number"
              maxLength="10"
              value={mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setMobile(value);
              }}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-button">
            CREATE ACCOUNT
          </button>
        </form>

        <div className="create-account">
          <span>Already have an account?</span>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}