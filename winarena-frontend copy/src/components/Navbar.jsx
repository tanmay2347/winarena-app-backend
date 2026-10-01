import {
  Bell,
  WalletCards
} from "lucide-react";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">
        <img src="/logo.png" alt="WinArena" style={{ height: "35px" }} />
      </div>

      <div className="nav-right">
        <div className="wallet-mini" style={{ padding: "6px 12px" }}>
          <WalletCards size={19} />
          <div className="wallet-text">
            <small>Wallet</small>
            <strong>₹0.00</strong>
          </div>
        </div>

        <button className="icon-btn">
          <Bell size={21} />
          <span className="notification-dot" />
        </button>

        <div className="avatar">
          👤
        </div>
      </div>
    </header>
  );
}