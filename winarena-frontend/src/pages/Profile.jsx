import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaTrophy, FaGamepad, FaPercent, FaWallet, FaUserEdit, FaTelegramPlane, FaShieldAlt, FaGift, FaHistory, FaHeadset, FaInfoCircle, FaSignOutAlt, FaTimes } from 'react-icons/fa';

export default function Profile() {
    const navigate = useNavigate();
    
    const [user, setUser] = useState({
        name: "Paras",
        email: "paras@gmail.com",
        mobile: "",
        playerId: "WA912815",
        telegramLinked: false,
        telegramUsername: "",
        level: 0,
        xpCurrent: 0,
        xpMax: 50,
        totalWins: 0,
        totalGames: 0,
        winRate: "0%",
        walletBalance: 0.00
    });

    const [activeModal, setActiveModal] = useState(null);
    const [tempName, setTempName] = useState("");
    const [tempEmail, setTempEmail] = useState("");
    const [tempMobile, setTempMobile] = useState("");
    const [telegramInput, setTelegramInput] = useState("");
    const [copied, setCopied] = useState(false);

    // Fetch live user profile and balance from backend database
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const storedEmail = localStorage.getItem('userEmail') || "paras@gmail.com";
                const response = await axios.get(`https://winarena-backend-1.onrender.com/api/user/profile?email=${storedEmail}`);
                if (response.data.success) {
                    setUser(response.data.user);
                    setTempName(response.data.user.name);
                    setTempEmail(response.data.user.email);
                    setTempMobile(response.data.user.mobile || "");
                }
            } catch (err) {
                console.error("Error fetching user profile from database:", err);
            }
        };

        fetchUserProfile();
    }, []);

    const handleCopyId = () => {
        navigator.clipboard.writeText(user.playerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.post('https://winarena-backend-1.onrender.com/api/user/register', {
                name: tempName,
                email: tempEmail,
                mobile: tempMobile
            });

            setUser(prev => ({ ...prev, name: tempName, email: tempEmail, mobile: tempMobile }));
            localStorage.setItem('userName', tempName);
            localStorage.setItem('userEmail', tempEmail);
            localStorage.setItem('userMobile', tempMobile);
            setActiveModal(null);
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Failed to update profile");
        }
    };

    const handleLinkTelegram = (e) => {
        e.preventDefault();
        setUser(prev => ({ ...prev, telegramLinked: true, telegramUsername: telegramInput }));
        setActiveModal(null);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div style={{ background: '#0b0f19', color: '#fff', minHeight: '100vh', padding: '15px 15px 90px 15px', fontFamily: 'sans-serif', position: 'relative' }}>
            
            {/* Top Header Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '20px', fontWeight: 'bold' }}>
                    <span>👤</span> My Profile
                </div>
                <div style={{ background: '#131c31', border: '1px solid #1f2937', padding: '8px 15px', borderRadius: '20px', color: '#facc15', fontWeight: 'bold', fontSize: '15px' }}>
                    ₹{user.walletBalance.toFixed(2)}
                </div>
            </div>

            {/* Profile User Info Card */}
            <div style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '18px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ width: '65px', height: '65px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', border: '2px solid #facc15' }}>
                        👦
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.name} <span style={{ fontSize: '14px', cursor: 'pointer' }} onClick={() => setActiveModal('edit')}>✏️</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Player ID: {user.playerId} 
                            <span onClick={handleCopyId} style={{ cursor: 'pointer', color: '#38bdf8' }}>📋</span>
                        </div>
                        <div style={{ fontSize: '12px', color: user.telegramLinked ? '#22c55e' : '#ef4444', marginTop: '4px', cursor: 'pointer' }} onClick={() => setActiveModal('telegram')}>
                            {user.telegramLinked ? `Telegram: ${user.telegramUsername}` : "Telegram: Not Linked (Click to link)"}
                        </div>
                    </div>
                </div>

                {copied && <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '8px' }}>Player ID copied!</div>}

                {/* Level Progress */}
                <div style={{ background: '#1a233a', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ background: '#7c3aed', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>👑 Level {user.level}</span>
                    <div style={{ flex: 1, margin: '0 15px', background: '#334155', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(user.xpCurrent / user.xpMax) * 100}%`, background: '#facc15', height: '100%' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{user.xpCurrent} / {user.xpMax}</span>
                </div>
            </div>

            {/* Top 4 Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '12px', padding: '12px 5px', textAlign: 'center' }}>
                    <FaTrophy color="#facc15" size={18} style={{ marginBottom: '5px' }} />
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Wins</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>{user.totalWins}</div>
                </div>
                <div style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '12px', padding: '12px 5px', textAlign: 'center' }}>
                    <FaGamepad color="#38bdf8" size={18} style={{ marginBottom: '5px' }} />
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Games</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>{user.totalGames}</div>
                </div>
                <div style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '12px', padding: '12px 5px', textAlign: 'center' }}>
                    <FaPercent color="#facc15" size={18} style={{ marginBottom: '5px' }} />
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Win Rate</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>{user.winRate}</div>
                </div>
                <div style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '12px', padding: '12px 5px', textAlign: 'center' }}>
                    <FaWallet color="#facc15" size={18} style={{ marginBottom: '5px' }} />
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Balance</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e', marginTop: '4px' }}>₹{user.walletBalance.toFixed(2)}</div>
                </div>
            </div>

            {/* Menu Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div onClick={() => setActiveModal('edit')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaUserEdit color="#38bdf8" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>Edit Profile</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Update your name, email, mobile number</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                <div onClick={() => setActiveModal('telegram')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaTelegramPlane color="#38bdf8" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>Telegram Account</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Link your Telegram for updates & room IDs</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                <div onClick={() => setActiveModal('security')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaShieldAlt color="#38bdf8" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>Account Security</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Change password, 2FA, linked accounts</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                <div onClick={() => setActiveModal('rewards')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaGift color="#ef4444" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>My Rewards</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>View your bonuses & cashback</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                <div onClick={() => setActiveModal('history')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaHistory color="#38bdf8" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>Transaction History</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>View deposits, withdrawals & game history</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                {/* Help & Support Button connected to /support page */}
                <div onClick={() => navigate('/support')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaHeadset color="#38bdf8" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>Help & Support</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>FAQs, contact us, raise a ticket</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                <div onClick={() => setActiveModal('about')} style={{ background: '#131c31', border: '1px solid #1f2937', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaInfoCircle color="#38bdf8" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>About WinArena</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Terms, Privacy, Responsible Gaming</div>
                        </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '18px' }}>›</span>
                </div>

                <div onClick={handleLogout} style={{ background: '#1a131b', border: '1px solid #451a1a', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <FaSignOutAlt color="#ef4444" size={20} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#ef4444' }}>Log Out</div>
                        </div>
                    </div>
                    <span style={{ color: '#ef4444', fontSize: '18px' }}>›</span>
                </div>
            </div>

            {/* --- ALL MODALS --- */}
            {activeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
                    <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '25px', width: '100%', maxWidth: '400px', position: 'relative', color: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#38bdf8' }}>
                                {activeModal === 'edit' && 'Edit Profile'}
                                {activeModal === 'telegram' && 'Telegram Account'}
                                {activeModal === 'security' && 'Account Security'}
                                {activeModal === 'rewards' && 'My Rewards'}
                                {activeModal === 'history' && 'Transaction History'}
                                {activeModal === 'about' && 'About WinArena'}
                            </h3>
                            <FaTimes color="#94a3b8" size={20} style={{ cursor: 'pointer' }} onClick={() => setActiveModal(null)} />
                        </div>

                        {activeModal === 'edit' && (
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Name</label>
                                    <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px' }} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Email</label>
                                    <input type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px' }} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Mobile Number</label>
                                    <input type="text" value={tempMobile} onChange={(e) => setTempMobile(e.target.value)} style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px' }} required />
                                </div>
                                <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Save Changes</button>
                            </form>
                        )}

                        {activeModal === 'telegram' && (
                            <form onSubmit={handleLinkTelegram} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Enter your Telegram username to get tournament room IDs and updates directly.</p>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Telegram Username (@username)</label>
                                    <input type="text" placeholder="@yourusername" value={telegramInput} onChange={(e) => setTelegramInput(e.target.value)} style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px' }} required />
                                </div>
                                <button type="submit" style={{ background: '#38bdf8', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Link Telegram</button>
                            </form>
                        )}

                        {activeModal === 'security' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#cbd5e1' }}>
                                <div style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Password Status</span>
                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Secure</span>
                                </div>
                                <button onClick={() => alert("Password reset link sent to email!")} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Change Password</button>
                            </div>
                        )}

                        {activeModal === 'rewards' && (
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎁</div>
                                <p style={{ color: '#94a3b8', fontSize: '14px' }}>You currently have no active bonuses or cashbacks.</p>
                                <button onClick={() => setActiveModal(null)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Okay</button>
                            </div>
                        )}

                        {activeModal === 'history' && (
                            <div>
                                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>Recent transactions:</p>
                                <div style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                    No recent transactions found.
                                </div>
                            </div>
                        )}

                        {activeModal === 'about' && (
                            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#fff' }}>WinArena v1.0.0</strong> is India's ultimate eSports tournament platform.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}