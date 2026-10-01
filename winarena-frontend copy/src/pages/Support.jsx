import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Support() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hello! Main WinArena AI Support hoon. Aapko kis tarah ki problem aa rahi hai? Kripya neeche diye gaye options mein se chunein ya apna sawal puchein.\n\nHello! I am WinArena AI Support. What problem are you facing? Please select an option below or type your query." }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [lang, setLang] = useState("hinglish"); // hinglish/english

  // Pre-defined quick problem options
  const options = [
    { id: "withdraw", textHi: "1. Withdrawal mein problem aa rahi hai", textEn: "1. Problem with Withdrawal" },
    { id: "tournament", textHi: "2. Tournament join nahi ho raha hai", textEn: "2. Unable to join Tournament" },
    { id: "roomid", textHi: "3. Room ID aur Password nahi mila", textEn: "3. Didn't get Room ID & Password" },
    { id: "wallet", textHi: "4. Wallet balance update nahi hua", textEn: "4. Wallet balance not updated" }
  ];

  const handleOptionClick = (optId) => {
    let userText = "";
    let aiResponse = "";

    if (optId === "withdraw") {
      userText = "Withdrawal mein problem aa rahi hai";
      aiResponse = lang === "hinglish" 
        ? "Withdrawal mein problem ke mukhy karan yeh ho sakte hain:\n• Aapka minimum withdrawal amount ₹10 se kam hai.\n• Aapne galat UPI ID enter ki hai.\n• Gateway issue ki wajah se 24 ghante ka samay lag sakta hai.\n\nKya aapko iske alawa koi aur sahayata chahiye?"
        : "Common withdrawal issues:\n• Minimum withdrawal amount is less than ₹10.\n• Incorrect UPI ID entered.\n• Gateway delays can take up to 24 hours.\n\nDo you need further assistance?";
    } else if (optId === "tournament") {
      userText = "Tournament join nahi ho raha hai";
      aiResponse = lang === "hinglish"
        ? "Tournament join na hone ke karan:\n• Aapke wallet mein sufficient balance (Entry Fee) nahi hai.\n• Tournament ke saare slots full ho chuke hain.\n• Aap pehle hi us tournament ko join kar chuke hain.\n\nPehle wallet check karein!"
        : "Reasons for joining failure:\n• Insufficient wallet balance for Entry Fee.\n• All slots are full.\n• You have already joined this tournament.\n\nPlease check your wallet first!";
    } else if (optId === "roomid") {
      userText = "Room ID aur Password nahi mila";
      aiResponse = lang === "hinglish"
        ? "Room ID aur Password match shuru hone se 10 minute pehle aapke 'My Joined Tournaments' page par live publish kar diya jata hai. Wahan check karein!"
        : "Room ID and Password are published on your 'My Joined Tournaments' page 10 minutes before the match starts. Please check there!";
    } else if (optId === "wallet") {
      userText = "Wallet balance update nahi hua";
      aiResponse = lang === "hinglish"
        ? "Agar paise add karne ke baad balance update nahi hua, toh thoda wait karein ya app ko restart karein. Transaction ID ke sath support ko screenshot bhejein."
        : "If balance didn't update after adding money, please wait or restart the app. Contact support with your transaction screenshot.";
    }

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userText },
      { sender: "ai", text: aiResponse }
    ]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const query = inputQuery.toLowerCase();
    let aiReply = lang === "hinglish"
      ? "Aapke sawal ke liye shukriya! Hamare support executive jald hi aapse sampark karenge. Tab tak aap FAQ ya options check kar sakte hain."
      : "Thank you for your query! Our support executive will contact you soon. Meanwhile, you can check our FAQs or options.";

    if (query.includes("withdraw") || query.includes("paisa") || query.includes("money") || query.includes("nikalna")) {
      aiReply = lang === "hinglish"
        ? "Withdrawal ke liye minimum limit ₹10 hai aur 2.5% charges lagte hain. UPI ID check karke dobara try karein."
        : "Minimum withdrawal limit is ₹10 with a 2.5% platform fee. Please verify your UPI ID and try again.";
    } else if (query.includes("join") || query.includes("match") || query.includes("slot")) {
      aiReply = lang === "hinglish"
        ? "Tournament join karne ke liye wallet mein balance hona zaroori hai aur slots khali hone chahiye."
        : "To join a tournament, ensure you have enough wallet balance and available slots.";
    }

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: inputQuery },
      { sender: "ai", text: aiReply }
    ]);
    setInputQuery("");
  };

  return (
    <div style={{ padding: "20px", background: "#0f172a", minHeight: "100vh", color: "#fff", paddingBottom: "90px", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", color: "#fbbf24", margin: "0 0 4px 0", fontWeight: "900" }}>
            🤖 AI SUPPORT ASSISTANT
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            Aapki har problem ka turant samadhan (English & Hindi)
          </p>
        </div>

        {/* Language Switcher */}
        <button 
          onClick={() => setLang(lang === "hinglish" ? "english" : "hinglish")}
          style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", cursor: "pointer" }}
        >
          Lang: {lang.toUpperCase()} 🌐
        </button>
      </div>

      {/* CHAT CONTAINER */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px", height: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
            background: msg.sender === "user" ? "#7c3aed" : "#1e1b4b",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "12px",
            maxWidth: "80%",
            fontSize: "12px",
            lineHeight: "1.4",
            whiteSpace: "pre-line",
            border: msg.sender === "ai" ? "1px solid rgba(255,255,255,0.1)" : "none"
          }}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* QUICK PROBLEM OPTIONS BUTTONS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "700" }}>Common Issues (Tap to ask):</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {options.map((opt) => (
            <button 
              key={opt.id}
              onClick={() => handleOptionClick(opt.id)}
              style={{ background: "#1e1b4b", color: "#fbbf24", border: "1px solid rgba(251, 191, 36, 0.3)", padding: "8px 10px", borderRadius: "8px", fontSize: "10px", fontWeight: "700", cursor: "pointer", textAlign: "left" }}
            >
              {lang === "hinglish" ? opt.textHi : opt.textEn}
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGE INPUT FORM */}
      <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "8px" }}>
        <input 
          type="text" 
          placeholder="Apni problem yahan type karein... / Type here..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", background: "#1e1b4b", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", fontSize: "12px", boxSizing: "border-box" }}
        />
        <button type="submit" style={{ background: "#22c55e", color: "#000", border: "none", padding: "0 16px", borderRadius: "8px", fontWeight: "900", cursor: "pointer", fontSize: "12px" }}>
          SEND 🚀
        </button>
      </form>

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