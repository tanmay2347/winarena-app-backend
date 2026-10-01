import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Wallet() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [activeTab, setActiveTab] = useState("add"); 
  const [amount, setAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("UPI");

  const [upiId, setUpiId] = useState("");
  const [bankDetails, setBankDetails] = useState({ accNo: "", ifsc: "", name: "" });
  const [paytmNumber, setPaytmNumber] = useState("");
  const [hasArenaAccount, setHasArenaAccount] = useState(false);

  const [popupData, setPopupData] = useState(null);
  const userEmail = localStorage.getItem("userEmail") || "user@winarena.com";
  const API_URL = "https://winarena-backend-1.onrender.com";

  useEffect(() => {
    // 🟢 Bulletproof dynamic Razorpay SDK loader for APK & Web
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (!isLoggedIn && !isAdmin) {
      alert("Please login first to access your wallet!");
      navigate("/login");
      return;
    }

    const savedBalance = localStorage.getItem("walletBalance");
    if (savedBalance !== null) {
      setBalance(parseFloat(savedBalance));
    } else {
      // 🟢 Admin ya user ke liye default 500 trial balance set kar diya hai
      localStorage.setItem("walletBalance", "500.00");
      setBalance(500.00);
    }

    const history = JSON.parse(localStorage.getItem("walletHistory")) || [];
    let withdrawnSum = 0;
    history.forEach(item => {
      if (item.type && item.type.includes("Withdrawal") && item.amount < 0) {
        withdrawnSum += Math.abs(item.amount);
      }
    });
    setTotalWithdrawn(withdrawnSum);

    const savedArena = localStorage.getItem("arenaWalletAccount");
    if (savedArena) {
      setHasArenaAccount(true);
    }
  }, [navigate]);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    const completeDeposit = (methodName, refId) => {
      const newBalance = balance + amt;
      setBalance(newBalance);
      localStorage.setItem("walletBalance", newBalance.toFixed(2));
      
      const uniqueTxnId = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
      const history = JSON.parse(localStorage.getItem("walletHistory")) || [];
      history.unshift({ 
        type: `Deposit via ${methodName}`, 
        amount: amt, 
        time: new Date().toLocaleString(), 
        txnId: uniqueTxnId, 
        gatewayId: refId,
        status: "Success" 
      });
      localStorage.setItem("walletHistory", JSON.stringify(history));

      setAmount("");
      setPopupData({
        title: "Deposit Successful! 🎉",
        message: `Successfully added ₹${amt} to your wallet.`,
        txnId: uniqueTxnId,
        subtext: "Funds updated instantly."
      });
    };

    try {
      const res = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();

      if (!data.success) {
        alert("Order creation failed from backend!");
        return;
      }

      if (!window.Razorpay) {
        alert("Razorpay SDK is loading. Please try again in 2 seconds.");
        return;
      }

      const options = {
        key: "rzp_test_TZydNSxzH1KSjl",
        amount: data.order.amount,
        currency: "INR",
        name: "Win Arena",
        description: "Wallet Deposit via Gateway",
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_URL}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              completeDeposit("Razorpay", response.razorpay_payment_id);
            } else {
              alert("Payment verification failed!");
            }
          } catch (err) {
            console.error("Verification error:", err);
            completeDeposit("Razorpay", response.razorpay_payment_id);
          }
        },
        prefill: {
          name: localStorage.getItem("userName") || "WinArena User",
          email: userEmail,
          contact: "8857824607"
        },
        theme: { color: "#7c3aed" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Network error during payment initialization.");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
      alert("Please enter a valid withdrawal amount!");
      return;
    }

    if (amt < 10) {
      alert("Minimum withdrawal limit is ₹10!");
      return;
    }

    if (amt > balance) {
      alert("Insufficient wallet balance!");
      return;
    }

    if (withdrawMethod === "Wallet" && !hasArenaAccount) {
      alert("Please activate your Arena Wallet first!");
      return;
    }

    let payoutDetails = {};
    if (withdrawMethod === "UPI") {
      payoutDetails = { upiId };
    } else if (withdrawMethod === "Bank") {
      payoutDetails = bankDetails;
    } else if (withdrawMethod === "Paytm") {
      payoutDetails = { paytmNumber };
    }

    try {
      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: "user_123",
          userEmail: userEmail,
          amount: amt,
          method: withdrawMethod,
          details: payoutDetails
        })
      });
      const data = await res.json();

      if (data.success) {
        const newBalance = balance - amt;
        setBalance(newBalance);
        localStorage.setItem("walletBalance", newBalance.toFixed(2));

        const updatedWithdrawn = totalWithdrawn + amt;
        setTotalWithdrawn(updatedWithdrawn);

        const uniqueTxnId = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
        const history = JSON.parse(localStorage.getItem("walletHistory")) || [];
        history.unshift({ type: `Withdrawal via ${withdrawMethod}`, amount: -amt, time: new Date().toLocaleString(), txnId: uniqueTxnId, status: "Processing" });
        localStorage.setItem("walletHistory", JSON.stringify(history));

        setAmount("");
        setPopupData({
          title: "Withdrawal Request Submitted! 🚀",
          message: `Requested: ₹${amt} (Fee: ₹${data.commissionDeducted?.toFixed(2) || 0})`,
          payout: `Final Payout: ₹${data.payoutToUser?.toFixed(2) || amt}`,
          txnId: uniqueTxnId,
          subtext: "Money will be credited to your account within 24 hours!"
        });
      } else {
        alert(data.message || "Withdrawal failed from backend!");
      }
    } catch (err) {
      console.error("Withdrawal network error:", err);
      alert("Server error during withdrawal process.");
    }
  };

  return (
    <div style={{ padding: "16px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "90px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box", position: "relative" }}>
      
      {popupData && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "2px solid #fbbf24", borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "380px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
            <h2 style={{ color: "#fbbf24", fontSize: "18px", fontWeight: "900", marginBottom: "12px" }}>{popupData.title}</h2>
            <p style={{ fontSize: "14px", color: "#fff", margin: "6px 0", fontWeight: "700" }}>{popupData.message}</p>
            {popupData.payout && <p style={{ fontSize: "15px", color: "#22c55e", fontWeight: "900", margin: "6px 0" }}>{popupData.payout}</p>}
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "8px 0" }}>Txn ID: {popupData.txnId}</p>
            <div style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px dashed #fbbf24", padding: "10px", borderRadius: "10px", margin: "14px 0" }}>
              <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "800" }}>⏳ {popupData.subtext}</span>
            </div>
            <button 
              onClick={() => setPopupData(null)}
              style={{ background: "#fbbf24", color: "#000", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "900", fontSize: "13px", cursor: "pointer", width: "100%" }}
            >
              Okay, Got It 👍
            </button>
          </div>
        </div>
      )}

      {/* HEADER TOP BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", color: "#fbbf24", margin: 0, fontWeight: "900" }}>
          💳 Withdraw / Deposit
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button 
            onClick={() => navigate("/wallet-details")}
            style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "16px", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}
          >
            📊 History
          </button>
          <div style={{ background: "rgba(251, 191, 36, 0.15)", border: "1px solid #fbbf24", padding: "6px 14px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#fbbf24", fontSize: "13px" }}>₹</span>
            <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "14px" }}>{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", padding: "6px", borderRadius: "14px", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => { setActiveTab("add"); setAmount(""); }}
          style={{ flex: 1, background: activeTab === "add" ? "#7c3aed" : "transparent", color: activeTab === "add" ? "#fff" : "#9ca3af", border: "none", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: "900", cursor: "pointer" }}
        >
          + Add Money (Razorpay)
        </button>
        <button
          onClick={() => { setActiveTab("withdraw"); setAmount(""); }}
          style={{ flex: 1, background: activeTab === "withdraw" ? "#7c3aed" : "transparent", color: activeTab === "withdraw" ? "#fff" : "#9ca3af", border: "none", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: "900", cursor: "pointer" }}
        >
          ↗ Withdraw
        </button>
      </div>

      {/* BALANCE CARD */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <span style={{ fontSize: "10px", color: "#9ca3af", display: "block", fontWeight: "800" }}>AVAILABLE BALANCE</span>
          <h2 style={{ fontSize: "26px", color: "#fff", margin: "4px 0 0 0", fontWeight: "900" }}>₹{balance.toFixed(2)}</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "10px", color: "#9ca3af", display: "block", fontWeight: "800" }}>TOTAL WITHDRAWN</span>
          <strong style={{ fontSize: "14px", color: "#22c55e", fontWeight: "800" }}>₹{totalWithdrawn.toFixed(2)}</strong>
        </div>
      </div>

      {/* WITHDRAW METHOD SELECTION */}
      {activeTab === "withdraw" && (
        <div style={{ marginBottom: "20px" }}>
          <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "900", display: "block", marginBottom: "10px" }}>⚡ Select Withdrawal Method</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {[
              { id: "UPI", name: "UPI", icon: "📱", time: "24 Hrs" },
              { id: "Bank", name: "Bank", icon: "🏦", time: "24 Hrs" },
              { id: "Paytm", name: "Paytm", icon: "💳", time: "24 Hrs" },
              { id: "Wallet", name: "Arena Wallet", icon: "⚡", time: "Instant" }
            ].map((m) => (
              <div 
                key={m.id}
                onClick={() => {
                  setWithdrawMethod(m.id);
                  if (m.id === "Wallet") navigate("/arena-wallet");
                }}
                style={{
                  background: withdrawMethod === m.id ? "linear-gradient(135deg, #1e1b4b 0%, #171238 100%)" : "rgba(255,255,255,0.02)",
                  border: withdrawMethod === m.id ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px", padding: "10px 4px", textAlign: "center", cursor: "pointer", position: "relative"
                }}
              >
                {withdrawMethod === m.id && <span style={{ position: "absolute", top: "4px", right: "6px", color: "#fbbf24", fontSize: "10px", fontWeight: "900" }}>✓</span>}
                <div style={{ fontSize: "16px", marginBottom: "2px" }}>{m.icon}</div>
                <div style={{ fontSize: "11px", fontWeight: "900", color: "#fff", marginBottom: "2px" }}>{m.name}</div>
                <span style={{ fontSize: "8px", color: "#22c55e", fontWeight: "800", background: "rgba(34,197,94,0.15)", padding: "1px 4px", borderRadius: "4px", display: "inline-block" }}>{m.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AMOUNT INPUT & FORM */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.15)", padding: "18px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", color: "#fbbf24", margin: "0 0 12px 0", fontWeight: "900" }}>
          {activeTab === "add" ? "Add Money via Razorpay Gateway" : `Withdraw via ${withdrawMethod}`}
        </h3>

        <form onSubmit={activeTab === "add" ? handleAddMoney : handleWithdraw}>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#fbbf24", fontSize: "18px", fontWeight: "900" }}>₹</span>
            <input 
              type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", padding: "14px 14px 14px 34px", borderRadius: "12px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "16px", fontWeight: "900", boxSizing: "border-box" }}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
            {[500, 1000, 2000, 5000].map((val) => (
              <button
                type="button" key={val} onClick={() => setAmount(val.toString())}
                style={{ background: "rgba(255,255,255,0.05)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "900", cursor: "pointer" }}
              >
                ₹{val}
              </button>
            ))}
          </div>

          {activeTab === "withdraw" && withdrawMethod === "UPI" && (
            <div style={{ marginBottom: "16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(124,58,237,0.5)", borderRadius: "14px", padding: "14px" }}>
              <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "900", display: "block", marginBottom: "6px" }}>ENTER UPI ID</span>
              <input type="text" placeholder="username@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={inputStyle} required />
            </div>
          )}

          {activeTab === "withdraw" && withdrawMethod === "Bank" && (
            <div style={{ marginBottom: "16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(124,58,237,0.5)", borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "900" }}>BANK DETAILS</span>
              <input type="text" placeholder="Account Holder Name" value={bankDetails.name} onChange={(e) => setBankDetails({...bankDetails, name: e.target.value})} style={inputStyle} required />
              <input type="text" placeholder="Account Number" value={bankDetails.accNo} onChange={(e) => setBankDetails({...bankDetails, accNo: e.target.value})} style={inputStyle} required />
              <input type="text" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={(e) => setBankDetails({...bankDetails, ifsc: e.target.value})} style={inputStyle} required />
            </div>
          )}

          {activeTab === "withdraw" && withdrawMethod === "Paytm" && (
            <div style={{ marginBottom: "16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,186,255,0.5)", borderRadius: "14px", padding: "14px" }}>
              <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "900", display: "block", marginBottom: "6px" }}>PAYTM NUMBER</span>
              <input type="text" placeholder="Enter Paytm Number" value={paytmNumber} onChange={(e) => setPaytmNumber(e.target.value)} style={inputStyle} required />
            </div>
          )}

          <button 
            type="submit" 
            style={{ background: activeTab === "add" ? "#22c55e" : "#fbbf24", color: "#000", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "900", cursor: "pointer", width: "100%", fontSize: "14px" }}
          >
            {activeTab === "add" ? "PAY VIA RAZORPAY GATEWAY ⚡" : "Withdraw Now →"}
          </button>
        </form>
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

const inputStyle = {
  width: "100%", padding: "10px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "12px", boxSizing: "border-box"
};