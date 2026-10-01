import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { Camera, CameraResultType } from "@capacitor/camera";

export default function ArenaWallet() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("walletBalance");
    return saved !== null ? parseFloat(saved) : 0;
  });
  const [history, setHistory] = useState([]);
  const [userArenaInfo, setUserArenaInfo] = useState(null);
  
  const [isActivated, setIsActivated] = useState(false);
  const [lockAmount] = useState(29);

  const [showQrModal, setShowQrModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanTargetUser, setScanTargetUser] = useState(null);
  const [scanAmount, setScanAmount] = useState("");
  const [manualMobile, setManualMobile] = useState("");
  const videoRef = useRef(null);

  const [actionType, setActionType] = useState(null);
  const [amount, setAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankDetails, setBankDetails] = useState({ accNo: "", ifsc: "", name: "" });
  const [paytmNumber, setPaytmNumber] = useState("");

  const API_URL = "https://winarena-backend-1.onrender.com";
  const userEmail = localStorage.getItem("userEmail") || "user@winarena.com";
  const userMobile = localStorage.getItem("userMobile") || "9999999999";

  const BUSINESS_UPI_ID = "winarena@ptyes"; 
  const BUSINESS_NAME = "Win Arena";

  // 🟢 Load Cashfree SDK script on mount
  useEffect(() => {
    if (!window.Cashfree) {
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isLoggedIn && !isAdmin) {
      alert("Please login first!");
      navigate("/login");
      return;
    }

    const activatedStatus = localStorage.getItem("arenaWalletActivated") === "true";
    setIsActivated(activatedStatus);

    fetch(`${API_URL}/api/user/balance?email=${encodeURIComponent(userEmail)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.balance !== undefined) {
          setBalance(data.balance);
          localStorage.setItem("walletBalance", data.balance.toFixed(2));
        }
      })
      .catch((err) => {
        console.error("Balance fetch error:", err);
      });

    const profileName = localStorage.getItem("userName") || "Player";
    const profileMobile = localStorage.getItem("userMobile") || "9876543210";

    setUserArenaInfo({ name: profileName, mobile: profileMobile, qrCodeText: profileMobile, email: userEmail });

    const savedHistory = JSON.parse(localStorage.getItem("walletHistory")) || [];
    setHistory(savedHistory);
  }, [navigate, userEmail]);

  const handleActivateWallet = async () => {
    const activationFee = 29;

    if (balance < activationFee) {
      alert(`⚠️ Insufficient Balance!\n\nYou need ₹${activationFee} to activate Arena Wallet, but your balance is ₹${balance.toFixed(2)}. Please add money to your wallet first.`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/wallet/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          amount: activationFee
        })
      });
      const data = await res.json();

      if (data.success) {
        const newBalance = data.newBalance !== undefined ? data.newBalance : (balance - activationFee);
        setBalance(newBalance);
        localStorage.setItem("walletBalance", newBalance.toFixed(2));
        localStorage.setItem("arenaWalletActivated", "true");
        setIsActivated(true);
        alert(`🎉 Arena Wallet Activated Successfully!\n\n₹${activationFee} deducted from your wallet.`);
      } else {
        alert(data.message || "Activation failed from server!");
      }
    } catch (err) {
      console.error("Activation network error:", err);
      alert("Network error during wallet activation.");
    }
  };

  const processScannedData = async (scannedText) => {
    const targetMobile = (scannedText && scannedText.length >= 10) ? scannedText.trim() : "";
    
    if (!targetMobile || targetMobile.length < 10) {
      alert("⚠️ Kripya 10 anko ka valid mobile number dalein!");
      return;
    }

    const myMobile = localStorage.getItem("userMobile") || "";
    if (targetMobile === myMobile) {
      alert("⚠️ Aap khud ke account par paise transfer nahi kar sakte!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/user/search?mobile=${encodeURIComponent(targetMobile)}`);
      const data = await res.json();

      if (data.success && data.user) {
        setScanTargetUser({
          name: data.user.name,
          mobile: data.user.mobile,
          upiId: `${data.user.mobile}@winarena`
        });
      } else {
        alert("⚠️ Yeh mobile number WinArena par registered nahi hai!");
        setScanTargetUser(null);
      }
    } catch (err) {
      console.error("User search error:", err);
      alert("Server error while searching user.");
    }
    setManualMobile("");
  };

  const handleOpenScanner = async () => {
    setShowScannerModal(true);
    setScanTargetUser(null);
    setCameraError(false);

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri
      });
      
      if (image && image.webPath) {
        processScannedData("9988776655");
      }
    } catch (error) {
      console.log("Native camera cancelled:", error);
    }
  };

  useEffect(() => {
    let currentStream = null;
    if (showScannerModal && !scanTargetUser) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          currentStream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch((e) => console.log("Play error:", e));
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError(true);
        });
    }
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showScannerModal, scanTargetUser]);

  const handleExecuteScanTransfer = async (e) => {
    e.preventDefault();
    const trAmt = parseFloat(scanAmount);
    if (!trAmt || trAmt <= 0) {
      alert("Please enter valid amount to transfer!");
      return;
    }

    const usableBalance = balance - lockAmount;
    if (trAmt > usableBalance) {
      alert(`⚠️ Transaction Failed!\n\nYou must maintain a minimum locked balance of ₹${lockAmount}. Your usable balance is ₹${Math.max(0, usableBalance)}.`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: userEmail,
          recipientMobile: scanTargetUser.mobile,
          amount: trAmt
        })
      });
      const data = await res.json();

      if (data.success) {
        const newBalance = data.senderNewBalance !== undefined ? data.senderNewBalance : (balance - trAmt);
        setBalance(newBalance);
        localStorage.setItem("walletBalance", newBalance.toFixed(2));

        const uniqueTxnId = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
        const currentDateTime = new Date().toLocaleString();

        const historyItem = { 
          type: `Paid to ${scanTargetUser.name}`, 
          amount: -trAmt, 
          time: currentDateTime, 
          txnId: uniqueTxnId,
          recipientMobile: scanTargetUser.mobile,
          status: "Success" 
        };

        const updatedHistory = [historyItem, ...history];
        setHistory(updatedHistory);
        localStorage.setItem("walletHistory", JSON.stringify(updatedHistory));

        alert(`Successfully transferred ₹${trAmt} to ${scanTargetUser.name}!\nTxn ID: ${uniqueTxnId} ⚡`);
        setShowScannerModal(false);
        setScanTargetUser(null);
        setScanAmount("");
      } else {
        alert(data.message || "Transfer failed from server!");
      }
    } catch (err) {
      console.error("Transfer network error:", err);
      alert("Server error during P2P transfer process.");
    }
  };

  // 🟢 ADD MONEY VIA CASHFREE PAYMENT GATEWAY
  const handleAddMoney = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    try {
      // 1. Backend se Cashfree order session create karein
      const res = await fetch(`${API_URL}/api/create-cashfree-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, customerEmail: userEmail, customerPhone: userMobile })
      });
      const data = await res.json();

      if (!data.success) {
        alert("Failed to initialize Cashfree payment!");
        return;
      }

      if (!window.Cashfree) {
        alert("Cashfree SDK is loading. Please try again.");
        return;
      }

      // 2. Cashfree SDK Initialize (Sandbox mode)
      const cashfree = window.Cashfree({
        mode: "sandbox" 
      });

      let checkoutOptions = {
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal"
      };

      cashfree.checkout(checkoutOptions).then(async function(result){
        if(result.error){
          alert("Payment failed: " + result.error.message);
        }
        if(result.paymentDetails){
          // Payment successful hone par wallet balance update karein
          const addRes = await fetch(`${API_URL}/api/wallet/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, amount: amt })
          });
          const addData = await addRes.json();

          if (addData.success) {
            setBalance(addData.newBalance);
            localStorage.setItem("walletBalance", addData.newBalance.toFixed(2));

            const uniqueTxnId = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
            const newHistoryItem = { 
              type: "Add Money via Cashfree", 
              amount: amt, 
              time: new Date().toLocaleString(), 
              txnId: uniqueTxnId,
              status: "Success" 
            };
            const updatedHistory = [newHistoryItem, ...history];
            setHistory(updatedHistory);
            localStorage.setItem("walletHistory", JSON.stringify(updatedHistory));

            alert("Money added successfully via Cashfree! 🎉");
            setActionType(null);
            setAmount("");
          }
        }
      });

    } catch (err) {
      console.error("Cashfree error:", err);
      alert("Network error during payment initialization.");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    const usableBalance = balance - lockAmount;
    if (amt > usableBalance) {
      alert(`⚠️ Withdrawal Failed!\n\nYou must maintain a minimum locked balance of ₹${lockAmount}. Your usable balance is ₹${Math.max(0, usableBalance)}.`);
      return;
    }

    let withdrawalDetails = {};
    if (withdrawMethod === "UPI") withdrawalDetails = { upiId };
    else if (withdrawMethod === "Paytm") withdrawalDetails = { paytmNumber };
    else if (withdrawMethod === "Bank") withdrawalDetails = bankDetails;

    try {
      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          amount: amt,
          method: withdrawMethod,
          details: withdrawalDetails
        })
      });
      const data = await res.json();

      if (data.success) {
        const newBalance = data.newBalance;
        setBalance(newBalance);
        localStorage.setItem("walletBalance", newBalance.toFixed(2));

        const uniqueTxnId = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
        const newHistoryItem = { 
          type: `Withdrawal via ${withdrawMethod}`, 
          amount: -amt, 
          time: new Date().toLocaleString(), 
          txnId: uniqueTxnId,
          status: "Pending" 
        };

        const updatedHistory = [newHistoryItem, ...history];
        setHistory(updatedHistory);
        localStorage.setItem("walletHistory", JSON.stringify(updatedHistory));

        setAmount("");
        setActionType(null);
        alert(`Withdrawal Request Submitted via ${withdrawMethod}!\nTxn ID: ${uniqueTxnId}`);
      } else {
        alert(data.message || "Withdrawal failed!");
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      alert("Network error during withdrawal.");
    }
  };

  const filteredHistory = history.filter((item) => {
    const query = searchQuery.toLowerCase();
    const typeMatch = item.type?.toLowerCase().includes(query);
    const txnMatch = item.txnId?.toLowerCase().includes(query);
    return typeMatch || txnMatch;
  });

  if (!isActivated) {
    return (
      <div style={{ padding: "20px", color: "#fff", background: "#0f172a", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", border: "2px solid #fbbf24", borderRadius: "20px", padding: "28px", maxWidth: "380px", width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "45px", marginBottom: "12px" }}>🔒</div>
          <h2 style={{ color: "#fbbf24", fontSize: "20px", fontWeight: "900", marginBottom: "8px" }}>Arena Wallet Locked</h2>
          <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "20px" }}>
            To unlock instant P2P transfers, QR code scanning, and zero-fee gaming payouts, you need to pay a one-time activation fee of <strong style={{ color: "#22c55e" }}>₹29</strong>.
          </p>
          <div style={{ background: "rgba(251,191,36,0.1)", border: "1px dashed #fbbf24", padding: "10px", borderRadius: "10px", marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "800" }}>⚡ Activation Fee: ₹29.00 Only</span>
          </div>
          <button 
            onClick={handleActivateWallet}
            style={{ background: "#fbbf24", color: "#000", border: "none", padding: "12px 20px", borderRadius: "10px", fontWeight: "900", fontSize: "13px", cursor: "pointer", width: "100%", marginBottom: "10px" }}
          >
            Pay ₹29 & Activate Now 🚀
          </button>
          <button 
            onClick={() => navigate("/")}
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "900", fontSize: "12px", cursor: "pointer", width: "100%" }}
          >
            Back to Home 🏠
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", color: "#fff", background: "#0f172a", minHeight: "100vh", paddingBottom: "110px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* TOP BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div 
            onClick={() => setShowQrModal(true)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              background: "rgba(124, 58, 237, 0.2)", 
              border: "1px solid #fbbf24", 
              padding: "4px 10px 4px 4px", 
              borderRadius: "24px", 
              cursor: "pointer" 
            }}
            title="Click to view QR"
          >
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#7c3aed", display: "grid", placeItems: "center", fontSize: "15px", color: "#fff" }}>
              🔲
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: "900", lineHeight: "1" }}>Show QR</span>
              <span style={{ fontSize: "8px", color: "#9ca3af" }}>Receive</span>
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: "16px", color: "#fbbf24", margin: 0, fontWeight: "900" }}>Win Arena Wallet</h1>
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>Balance: ₹{balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* BANNER */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)", borderRadius: "16px", border: "1px solid rgba(251,191,36,0.3)", padding: "24px 20px", marginBottom: "20px", textAlign: "center" }}>
        <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: "800", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>WIN ARENA DIGITAL WALLET (ACTIVATED ✓)</span>
        <h2 style={{ fontSize: "36px", color: "#fff", margin: "0 0 4px 0", fontWeight: "900" }}>₹{balance.toFixed(2)}</h2>
        <div style={{ fontSize: "11px", color: "#fbbf24", background: "rgba(251, 191, 36, 0.1)", padding: "4px 10px", borderRadius: "8px", display: "inline-block", marginBottom: "12px" }}>
          🔒 Locked Minimum Reserve: ₹{lockAmount}
        </div>
        <p style={{ fontSize: "11px", color: "#cbd5e1", margin: "0 0 16px 0" }}>Fast, secure P2P transfers & tournament payouts</p>
        
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button 
            onClick={() => { setActionType("add"); setAmount(""); }}
            style={{ background: "#fbbf24", color: "#000", border: "none", padding: "10px 22px", borderRadius: "10px", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}
          >
            + Add Money
          </button>
          <button 
            onClick={() => { setActionType("withdraw"); setAmount(""); }}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "10px", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}
          >
            ↗ Withdraw
          </button>
        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "14px", color: "#fbbf24", margin: 0, fontWeight: "900" }}>📜 Transaction History {searchQuery && `(Filtered)`}</h3>
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "10px", fontWeight: "800", cursor: "pointer" }}>Clear Filter</button>
        )}
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {filteredHistory.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", marginTop: "10px" }}>No transactions found yet.</p>
        ) : (
          filteredHistory.map((item, idx) => {
            const isPositive = item.amount > 0;
            return (
              <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", color: "#fff", fontWeight: "800" }}>{item.type}</h4>
                  <span style={{ fontSize: "9px", color: "#9ca3af", display: "block" }}>{item.time}</span>
                  {item.txnId && <span style={{ fontSize: "8px", color: "#fbbf24", fontFamily: "monospace" }}>ID: {item.txnId}</span>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "14px", color: isPositive ? "#22c55e" : "#ef4444", fontWeight: "900" }}>
                    {isPositive ? `+₹${item.amount}` : `-₹${Math.abs(item.amount)}`}
                  </strong>
                  <span style={{ fontSize: "8px", display: "block", color: item.status === "Pending" ? "#fbbf24" : "#22c55e", background: item.status === "Pending" ? "rgba(251,191,36,0.1)" : "rgba(34,197,94,0.1)", padding: "1px 4px", borderRadius: "4px", marginTop: "2px" }}>{item.status}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

     {/* QR MODAL */}
      {showQrModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 10px 0", fontSize: "16px" }}>🔲 Win Arena QR Code</h3>
            
            <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", textAlign: "center", display: "inline-block", marginBottom: "12px" }}>
              <img 
                src="/assets/winarena_qr.jpg" 
                alt="Win Arena QR Code" 
                style={{ width: "150px", height: "150px", objectFit: "contain" }} 
              />
              <span style={{ fontSize: "9px", color: "#000", fontWeight: "900", display: "block", marginTop: "6px" }}>SCAN TO PAY</span>
            </div>

            <p style={{ fontSize: "11px", color: "#cbd5e1", margin: "0 0 4px 0" }}>Name: {BUSINESS_NAME}</p>
            <p style={{ fontSize: "11px", color: "#cbd5e1", margin: "0 0 14px 0" }}>UPI ID: {BUSINESS_UPI_ID}</p>
            <button onClick={() => setShowQrModal(false)} style={btnPrimaryStyle}>Close</button>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {showScannerModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ color: "#fbbf24", margin: 0, fontSize: "16px" }}>📷 P2P Transfer & Scanner</h3>
              <button onClick={() => { setShowScannerModal(false); setScanTargetUser(null); }} style={{ background: "transparent", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer", fontWeight: "900" }}>✕</button>
            </div>

            {!scanTargetUser ? (
              <div>
                <div style={{ width: "100%", height: "160px", background: "#000", borderRadius: "10px", overflow: "hidden", position: "relative", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {!cameraError ? (
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ color: "#ef4444", fontSize: "11px", textAlign: "center", padding: "10px" }}>
                      ⚠️ Camera unavailable in WebView. Use mobile number below:
                    </div>
                  )}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100px", height: "100px", border: "2px dashed #fbbf24", borderRadius: "10px", pointerEvents: "none" }}></div>
                </div>

                <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "6px", textAlign: "left" }}>Or enter recipient mobile number:</p>
                <input 
                  type="text" 
                  placeholder="Enter 10-digit Mobile No." 
                  value={manualMobile}
                  onChange={(e) => setManualMobile(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(251,191,36,0.4)", fontSize: "12px", marginBottom: "10px", boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button onClick={() => processScannedData(manualMobile)} style={btnPrimaryStyle}>Verify & Proceed 🚀</button>
                  <button onClick={() => processScannedData("9988776655")} style={{ ...btnPrimaryStyle, background: "#7c3aed", color: "#fff" }}>Test Simulation (Quick Pay) ⚡</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteScanTransfer} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", padding: "10px", borderRadius: "8px", textAlign: "left" }}>
                  <span style={{ fontSize: "9px", color: "#22c55e", fontWeight: "900" }}>✓ RECIPIENT VERIFIED</span>
                  <h4 style={{ margin: "2px 0", color: "#fff", fontSize: "14px" }}>{scanTargetUser.name}</h4>
                  <p style={{ margin: 0, fontSize: "10px", color: "#9ca3af" }}>Mobile: {scanTargetUser.mobile}</p>
                </div>

                <label style={{ fontSize: "10px", color: "#9ca3af", textAlign: "left" }}>Enter Transfer Amount</label>
                <input type="number" placeholder="0.00" value={scanAmount} onChange={(e) => setScanAmount(e.target.value)} style={inputStyle} required />

                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button type="submit" style={btnPrimaryStyle}>PAY NOW 🚀</button>
                  <button type="button" onClick={() => setScanTargetUser(null)} style={btnSecondaryStyle}>Back</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD/WITHDRAW MODAL */}
      {actionType && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ color: "#fbbf24", margin: 0, fontSize: "15px", fontWeight: "900" }}>
                {actionType === "add" ? "💰 Add Money via Cashfree" : "📤 Withdraw Funds"}
              </h3>
              <button onClick={() => setActionType(null)} style={{ background: "transparent", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer", fontWeight: "900" }}>✕</button>
            </div>

            <form onSubmit={actionType === "add" ? handleAddMoney : handleWithdraw}>
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#fbbf24", fontSize: "16px", fontWeight: "900" }}>₹</span>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: "100%", padding: "10px 10px 10px 30px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "15px", fontWeight: "900", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "12px" }}>
                {[100, 500, 1000, 5000].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    style={{ background: "rgba(255,255,255,0.05)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", padding: "6px", borderRadius: "6px", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              {actionType === "withdraw" && (
                <div style={{ marginBottom: "12px", textAlign: "left" }}>
                  <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "800", display: "block", marginBottom: "6px" }}>SELECT METHOD</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px" }}>
                    {["UPI", "Bank", "Paytm"].map((m) => (
                      <div
                        key={m}
                        onClick={() => setWithdrawMethod(m)}
                        style={{
                          background: withdrawMethod === m ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.03)",
                          border: withdrawMethod === m ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          padding: "6px",
                          textAlign: "center",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: "900",
                          color: "#fff"
                        }}
                      >
                        {m}
                      </div>
                    ))}
                  </div>

                  {withdrawMethod === "UPI" && (
                    <input type="text" placeholder="Enter UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={inputStyle} required />
                  )}
                  {withdrawMethod === "Paytm" && (
                    <input type="text" placeholder="Enter Paytm Number" value={paytmNumber} onChange={(e) => setPaytmNumber(e.target.value)} style={inputStyle} required />
                  )}
                  {withdrawMethod === "Bank" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input type="text" placeholder="Holder Name" value={bankDetails.name} onChange={(e) => setBankDetails({...bankDetails, name: e.target.value})} style={inputStyle} required />
                      <input type="text" placeholder="Account Number" value={bankDetails.accNo} onChange={(e) => setBankDetails({...bankDetails, accNo: e.target.value})} style={inputStyle} required />
                      <input type="text" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={(e) => setBankDetails({...bankDetails, ifsc: e.target.value})} style={inputStyle} required />
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                style={{ 
                  background: actionType === "add" ? "#22c55e" : "#fbbf24", 
                  color: "#000", 
                  border: "none", 
                  padding: "10px", 
                  borderRadius: "8px", 
                  fontWeight: "900", 
                  cursor: "pointer", 
                  width: "100%",
                  fontSize: "12px"
                }}
              >
                {actionType === "add" ? "PAY VIA CASHFREE ⚡" : "CONFIRM WITHDRAWAL →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {showSearchModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ color: "#fbbf24", margin: "0 0 10px 0", fontSize: "16px" }}>🔍 Search Transactions</h3>
            <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "10px" }}>Enter user name or unique Transaction ID:</p>
            <input 
              type="text" 
              placeholder="e.g. Rahul or TXN1029..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(251,191,36,0.4)", fontSize: "12px", marginBottom: "14px", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowSearchModal(false)} style={btnPrimaryStyle}>Search / Filter</button>
              <button onClick={() => { setSearchQuery(""); setShowSearchModal(false); }} style={btnSecondaryStyle}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        background: "#090d16",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 0 16px 0",
        zIndex: 999
      }}>
        <Link to="/" style={navItemStyle}>
          <span style={{ fontSize: "18px" }}>🏠</span>
          <small style={{ fontSize: "10px", color: "#9ca3af" }}>Home</small>
        </Link>

        <div onClick={() => setShowSearchModal(true)} style={{ ...navItemStyle, cursor: "pointer" }}>
          <span style={{ fontSize: "18px" }}>🔍</span>
          <small style={{ fontSize: "10px", color: "#fbbf24", fontWeight: "900" }}>Search</small>
        </div>

        {/* SCAN BUTTON */}
        <div 
          onClick={handleOpenScanner}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            marginTop: "-20px"
          }}
        >
          <div style={{
            width: "50px",
            height: "50px",
            background: "#7c3aed",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 15px rgba(124, 58, 237, 0.5)",
            border: "3px solid #0f172a"
          }}>
            <span style={{ fontSize: "20px" }}>🔲</span>
          </div>
          <small style={{ fontSize: "10px", color: "#fbbf24", fontWeight: "900", marginTop: "2px" }}>Scan</small>
        </div>

        <div onClick={() => alert("No new alerts.")} style={{ ...navItemStyle, cursor: "pointer" }}>
          <span style={{ fontSize: "18px" }}>🔔</span>
          <small style={{ fontSize: "10px", color: "#9ca3af" }}>Alerts</small>
        </div>

        <div onClick={() => navigate("/wallet-details")} style={{ ...navItemStyle, cursor: "pointer" }}>
          <span style={{ fontSize: "18px" }}>⏱️</span>
          <small style={{ fontSize: "10px", color: "#9ca3af" }}>History</small>
        </div>
      </nav>

    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  background: "#0f172a",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  fontSize: "12px",
  boxSizing: "border-box"
};

const navItemStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textDecoration: "none",
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
  maxWidth: "340px",
  textAlign: "center",
  boxSizing: "border-box"
};

const btnPrimaryStyle = {
  background: "#fbbf24",
  color: "#000",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "12px",
  width: "100%"
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