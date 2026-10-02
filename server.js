const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// ==========================================
// SCHEMAS & MODELS (WINARENA ORIGINAL)
// ==========================================

const userSchema = new mongoose.Schema({
    name: { type: String, default: "Arena Player" },
    email: { type: String, unique: true },
    mobile: { type: String, default: "" },
    walletBalance: { type: Number, default: 0.00 },
    timestamp: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const withdrawalSchema = new mongoose.Schema({
    userEmail: String,
    withdrawalAmount: Number,
    commissionAmount: Number,
    finalPayout: Number,
    method: String,
    details: Object,
    status: { type: String, default: "Pending" },
    timestamp: { type: Date, default: Date.now }
});
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

const tournamentSchema = new mongoose.Schema({
    game: { type: String, required: true },
    mode: { type: String, required: true },
    entry: { type: Number, required: true },
    prize: { type: Number, required: true },
    slots: { type: Number, required: true },
    startTime: { type: String, required: true },
    roomId: { type: String, default: "" },
    roomPass: { type: String, default: "" },
    registeredUsers: { type: Array, default: [] },
    timestamp: { type: Date, default: Date.now }
});
const Tournament = mongoose.model('Tournament', tournamentSchema);


// ==========================================
// ROUTES (WINARENA ORIGINAL)
// ==========================================

app.get('/api/health', (req, res) => {
  res.send('Win Arena Backend API is active!');
});

// Get User Profile & Details API (Database Sync)
app.get('/api/user/profile', async (req, res) => {
    try {
        const { email } = req.query;
        const userEmail = email || "user@winarena.com";

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({
                name: "Paras",
                email: userEmail,
                mobile: "",
                walletBalance: 0.00
            });
            await user.save();
        }

        res.json({
            success: true,
            user: {
                name: user.name || "Paras",
                email: user.email,
                mobile: user.mobile || "",
                playerId: "WA912815",
                walletBalance: user.walletBalance || 0.00,
                totalWins: user.totalWins || 0,
                totalGames: user.totalGames || 0,
                winRate: user.winRate || "0%",
                level: user.level || 0
            }
        });
    } catch (err) {
        console.error("Fetch profile error:", err);
        res.status(500).json({ success: false, message: "Server error while fetching profile" });
    }
});

// User Balance Get API
app.get('/api/user/balance', async (req, res) => {
    try {
        const userEmail = req.query.email || "user@winarena.com";
        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
            await user.save();
        }
        res.json({ success: true, balance: user.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching balance" });
    }
});

// User Search / Verify API
app.get('/api/user/search', async (req, res) => {
    try {
        const { mobile } = req.query;
        if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

        const user = await User.findOne({ mobile: mobile.trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found with this mobile number!" });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                balance: user.walletBalance
            }
        });
    } catch (err) {
        console.error("Search user error:", err);
        res.status(500).json({ success: false, message: "Server error during user search" });
    }
});

// User Register / Sync API
app.post('/api/user/register', async (req, res) => {
    try {
        const { name, email, mobile } = req.body;
        const userEmail = email || "user@winarena.com";

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({
                name: name || "Arena Player",
                email: userEmail,
                mobile: mobile || "",
                walletBalance: 0.00
            });
            await user.save();
        } else {
            if (name) user.name = name;
            if (mobile) user.mobile = mobile;
            await user.save();
        }

        res.json({ success: true, message: "User synced successfully", balance: user.walletBalance });
    } catch (err) {
        console.error("User registration sync error:", err);
        res.status(500).json({ success: false, message: "Server error during user sync" });
    }
});

// Dedicated Add Money / Deposit API Route
app.post('/api/wallet/add', async (req, res) => {
    try {
        const { email, amount } = req.body;
        const addAmount = parseFloat(amount);
        const userEmail = email || "user@winarena.com";

        if (!addAmount || addAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount!" });
        }

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
        }

        user.walletBalance = parseFloat((user.walletBalance + addAmount).toFixed(2));
        await user.save();

        res.json({ 
            success: true, 
            message: "Money added successfully!", 
            newBalance: user.walletBalance 
        });
    } catch (err) {
        console.error("Add money error:", err);
        res.status(500).json({ success: false, message: "Server error during deposit" });
    }
});

// Dedicated Deduct / Spend Money API
app.post('/api/wallet/deduct', async (req, res) => {
    try {
        const { email, amount } = req.body;
        const deductAmount = parseFloat(amount);
        const userEmail = email || "user@winarena.com";

        if (!deductAmount || deductAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount!" });
        }

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
            await user.save();
        }

        if (user.walletBalance < deductAmount) {
            return res.status(400).json({ success: false, message: "Insufficient balance!" });
        }

        user.walletBalance = parseFloat((user.walletBalance - deductAmount).toFixed(2));
        await user.save();

        res.json({ 
            success: true, 
            message: "Amount deducted successfully!", 
            newBalance: user.walletBalance 
        });
    } catch (err) {
        console.error("Deduct money error:", err);
        res.status(500).json({ success: false, message: "Server error during deduction" });
    }
});

// Dedicated Withdrawal API Route
app.post('/api/withdraw', async (req, res) => {
    try {
        const { email, amount, method, details } = req.body;
        const amt = parseFloat(amount);
        const userEmail = email || "user@winarena.com";

        if (!amt || amt <= 0) {
            return res.status(400).json({ success: false, message: "Invalid withdrawal amount!" });
        }

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
            await user.save();
        }

        if (user.walletBalance < amt) {
            return res.status(400).json({ success: false, message: "Insufficient balance!" });
        }

        const commission = parseFloat((amt * 0.025).toFixed(2));
        const finalPayout = parseFloat((amt - commission).toFixed(2));

        user.walletBalance = parseFloat((user.walletBalance - amt).toFixed(2));
        await user.save();

        const withdrawal = new Withdrawal({
            userEmail: userEmail,
            withdrawalAmount: amt,
            commissionAmount: commission,
            finalPayout,
            method,
            details
        });
        await withdrawal.save();

        res.json({ 
            success: true, 
            message: "Withdrawal request submitted successfully!", 
            newBalance: user.walletBalance,
            commissionAmount: commission,
            finalPayout: finalPayout
        });
    } catch (err) {
        console.error("Withdrawal error:", err);
        res.status(500).json({ success: false, message: "Server error during withdrawal" });
    }
});

// Admin Get Withdrawals API
app.get('/api/admin/withdrawals', async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().sort({ timestamp: -1 });
        res.json({ success: true, withdrawals });
    } catch (err) {
        console.error("Fetch withdrawals error:", err);
        res.status(500).json({ success: false, message: "Error fetching withdrawals" });
    }
});

// Admin Approve Withdrawal API
app.post('/api/admin/approve-withdrawal', async (req, res) => {
    try {
        const { id } = req.body;
        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: "Withdrawal request not found" });
        }

        withdrawal.status = "Approved";
        await withdrawal.save();
        res.json({ success: true, message: "Withdrawal approved successfully" });
    } catch (err) {
        console.error("Approve withdrawal error:", err);
        res.status(500).json({ success: false, message: "Error approving withdrawal" });
    }
});

// ---------------- TOURNAMENT APIs ----------------
app.get('/api/tournaments', async (req, res) => {
    try {
        const tournaments = await Tournament.find().sort({ timestamp: -1 });
        res.json({ success: true, tournaments });
    } catch (err) {
        console.error("Fetch tournaments error:", err);
        res.status(500).json({ success: false, message: "Server error while fetching tournaments" });
    }
});

app.post('/api/tournaments', async (req, res) => {
    try {
        const { game, mode, entry, prize, totalSlots, slots, startTime } = req.body;
        const newTournament = new Tournament({
            game,
            mode,
            entry,
            prize,
            slots: totalSlots || slots || 10,
            startTime,
            roomId: "",
            roomPass: ""
        });
        await newTournament.save();
        res.status(201).json({ success: true, message: "Tournament created successfully!", tournament: newTournament });
    } catch (err) {
        console.error("Error creating tournament:", err);
        res.status(500).json({ success: false, message: "Server error while creating tournament" });
    }
});

// Tournament Join API
app.post('/api/tournaments/join', async (req, res) => {
    try {
        const { tournamentId, userEmail, userName, gameId, gameUsername } = req.body;
        const cleanEmail = userEmail || "user@winarena.com";

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, message: "Tournament not found!" });
        }

        const alreadyJoined = tournament.registeredUsers.some(u => u.email === cleanEmail);
        if (alreadyJoined) {
            return res.status(400).json({ success: false, message: "You have already joined this tournament!" });
        }

        if (tournament.registeredUsers.length >= tournament.slots) {
            return res.status(400).json({ success: false, message: "Tournament is full!" });
        }

        tournament.registeredUsers.push({
            email: cleanEmail,
            name: userName || "Player",
            gameId: gameId || "",
            gameUsername: gameUsername || "",
            timestamp: new Date()
        });

        await tournament.save();
        res.json({ success: true, message: "Tournament joined successfully!", tournament });
    } catch (err) {
        console.error("Join tournament error:", err);
        res.status(500).json({ success: false, message: "Server error while joining tournament" });
    }
});

// Admin Pay Winner API
app.post('/api/admin/pay-winner', async (req, res) => {
    try {
        const { userEmail, prizeAmount } = req.body;
        const winAmount = parseFloat(prizeAmount);

        if (!winAmount || winAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid prize amount!" });
        }

        let user = await User.findOne({ email: userEmail || "user@winarena.com" });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        user.walletBalance = parseFloat((user.walletBalance + winAmount).toFixed(2));
        await user.save();

        res.json({
            success: true,
            message: `Successfully added ₹${winAmount} to ${user.name}'s wallet!`,
            newBalance: user.walletBalance
        });
    } catch (err) {
        console.error("Pay winner error:", err);
        res.status(500).json({ success: false, message: "Server error while paying winner" });
    }
});

// P2P Wallet Transfer API
app.post('/api/transfer', async (req, res) => {
    try {
        const { senderEmail, recipientMobile, amount } = req.body;
        const trAmount = parseFloat(amount);
        
        if (!trAmount || trAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid transfer amount!" });
        }

        const validSenderEmail = senderEmail || "user@winarena.com";
        const cleanRecipientMobile = (recipientMobile || "").trim();

        let sender = await User.findOne({ email: validSenderEmail });
        if (!sender) {
            sender = new User({
                name: validSenderEmail.split('@')[0],
                email: validSenderEmail,
                mobile: "8857824607",
                walletBalance: 100.00
            });
            await sender.save();
        }

        let recipient = await User.findOne({ mobile: cleanRecipientMobile });
        if (!recipient) {
            recipient = new User({
                name: `User_${cleanRecipientMobile.slice(-4) || "Player"}`,
                email: `${cleanRecipientMobile || Date.now()}@winarena.com`,
                mobile: cleanRecipientMobile,
                walletBalance: 0.00
            });
            await recipient.save();
        }

        if (sender.mobile && cleanRecipientMobile && sender.mobile === cleanRecipientMobile) {
            return res.status(400).json({ success: false, message: "Cannot transfer money to your own account!" });
        }

        if (sender.walletBalance < trAmount) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance! Your balance is ₹${sender.walletBalance.toFixed(2)}` 
            });
        }

        sender.walletBalance = parseFloat((sender.walletBalance - trAmount).toFixed(2));
        recipient.walletBalance = parseFloat((recipient.walletBalance + trAmount).toFixed(2));

        await sender.save();
        await recipient.save();

        res.json({ 
            success: true, 
            message: "Transfer successful!", 
            senderNewBalance: sender.walletBalance,
            recipientNewBalance: recipient.walletBalance 
        });
    } catch (err) {
        console.error("P2P Transfer error:", err);
        res.status(500).json({ success: false, message: "Server error during P2P transfer: " + err.message });
    }
});

// ---------------- CASHFREE ORDER API ----------------
app.post('/api/create-cashfree-order', async (req, res) => {
    try {
        const { amount, customerEmail, customerPhone } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const orderId = "order_" + Date.now();
        const userEmail = customerEmail || "user@winarena.com";

        const response = await axios.post(
            'https://sandbox.cashfree.com/pg/orders',
            {
                order_id: orderId,
                order_amount: amount,
                order_currency: "INR",
                customer_details: {
                    customer_id: "cust_" + Date.now(),
                    customer_email: userEmail,
                    customer_phone: customerPhone || "9999999999"
                },
                order_meta: {
                    return_url: `https://winarena-backend-1.onrender.com/api/payment-status?order_id=${orderId}&email=${encodeURIComponent(userEmail)}&amount=${amount}`
                }
            },
            {
                headers: {
                    'x-client-id': process.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                    'x-api-version': '2022-09-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ success: true, payment_session_id: response.data.payment_session_id, order_id: orderId });
    } catch (err) {
        console.error("Cashfree Order Error:", err.response?.data || err.message);
        res.status(500).json({ success: false, message: "Failed to create Cashfree order" });
    }
});

// ---------------- CASHFREE PAYMENT STATUS ROUTE ----------------
app.get('/api/payment-status', async (req, res) => {
    try {
        const { order_id, email, amount } = req.query;

        if (email && amount) {
            const addAmount = parseFloat(amount);
            let user = await User.findOne({ email: email });
            if (user && addAmount > 0) {
                user.walletBalance = parseFloat((user.walletBalance + addAmount).toFixed(2));
                await user.save();
            }
        }

        res.send(`
            <html>
                <head>
                    <title>Payment Successful</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="background: #0f172a; color: #fff; text-align: center; padding-top: 80px; font-family: sans-serif;">
                    <div style="background: #1e1b4b; border: 2px solid #22c55e; padding: 30px; border-radius: 20px; max-width: 350px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                        <h2 style="color: #22c55e; margin-top: 0;">Payment Successful! 🎉</h2>
                        <p style="font-size: 14px; color: #cbd5e1;">Aapka payment safal ho gaya hai. Order ID: <strong>${order_id || ''}</strong></p>
                        <p style="font-size: 13px; color: #22c55e; font-weight: bold; margin-top: 15px;">Aapka wallet balance safaltapurvak update kar diya gaya hai!</p>
                        <p style="font-size: 12px; color: #fbbf24; margin-top: 20px;">Aap ab is page ko band karke apne app par wapas ja sakte hain.</p>
                    </div>
                </body>
            </html>
        `);
    } catch (err) {
        console.error("Payment status error:", err);
        res.status(500).send("Server error during payment status check");
    }
});


// ==========================================
// LUDO & SNAKE & LADDER SOCKET.IO GAME SERVER
// ==========================================

const FEES_GAME = [5, 10, 25, 50];
const GAMES = ["ludo", "snake"];
const COMMISSION = 0.1; 
const BOT_WAIT_MS = 20000; 
const START_BALANCE = 500;

const gameWallets = {}; 
const queues = {}; 
const rooms = {}; 
GAMES.forEach((g) => FEES_GAME.forEach((f) => (queues[`${g}:${f}`] = [])));

const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
const START_IDX = [0, 26]; 
const absPos = (pi, p) => (p >= 0 && p <= 50 ? (START_IDX[pi] + p) % 52 : null);

function ludoMovable(tokens, dice) {
  return tokens
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (p === -1 ? dice === 6 : p + dice <= 56))
    .map(({ i }) => i);
}

const balGame = (name) => (gameWallets[name] ??= START_BALANCE);
const publicRoom = (r) => {
  const { timers, ...rest } = r;
  return rest;
};
const emitRoom = (r) => io.to(r.id).emit("room", publicRoom(r));

function removeFromQueues(socketId) {
  for (const k in queues) {
    queues[k] = queues[k].filter((q) => {
      if (q.socketId === socketId) clearTimeout(q.timer);
      return q.socketId !== socketId;
    });
  }
}

function createRoom(game, fee, players) {
  const id = "r" + Math.random().toString(36).slice(2, 9);
  players.forEach((p) => {
    if (!p.bot) gameWallets[p.name] = balGame(p.name) - fee;
  });
  const r = {
    id, game, fee,
    prize: Math.round(fee * 2 * (1 - COMMISSION) * 100) / 100,
    players: players.map((p, i) => ({ name: p.name, socketId: p.socketId, bot: !!p.bot, color: i === 0 ? "red" : "yellow" })),
    turn: 0, dice: null, rolled: false, winner: null,
    log: ["Game started! Good luck."],
    pos: game === "snake" ? [0, 0] : null,
    tokens: game === "ludo" ? [[-1, -1, -1, -1], [-1, -1, -1, -1]] : null,
    movable: [],
  };
  rooms[id] = r;
  r.players.forEach((p) => {
    if (p.bot) return;
    const s = io.sockets.sockets.get(p.socketId);
    if (s) { s.join(id); s.data.room = id; s.emit("wallet", balGame(p.name)); }
  });
  emitRoom(r);
  scheduleBot(r);
  return r;
}

function addLog(r, msg) { r.log.unshift(msg); r.log = r.log.slice(0, 8); }

function finish(r, winnerIdx, reason) {
  if (r.winner !== null) return;
  r.winner = winnerIdx;
  const w = r.players[winnerIdx];
  if (!w.bot) gameWallets[w.name] = balGame(w.name) + r.prize;
  addLog(r, `🏆 ${w.name} wins ₹${r.prize}${reason ? " (" + reason + ")" : ""}`);
  r.players.forEach((p) => {
    if (p.bot) return;
    const s = io.sockets.sockets.get(p.socketId);
    if (s) s.emit("wallet", balGame(p.name));
  });
  emitRoom(r);
}

function nextTurn(r) { r.turn = 1 - r.turn; r.rolled = false; r.movable = []; }

function doRoll(r, pi) {
  if (r.winner !== null || r.turn !== pi || r.rolled) return;
  const dice = 1 + Math.floor(Math.random() * 6);
  r.dice = dice;
  const name = r.players[pi].name;

  if (r.game === "snake") {
    let p = r.pos[pi];
    let msg = `${name} rolled ${dice}`;
    if (p + dice > 100) msg += " – needs exact roll";
    else {
      p += dice;
      if (LADDERS[p]) { msg += ` 🪜 ladder ${p}→${LADDERS[p]}`; p = LADDERS[p]; }
      else if (SNAKES[p]) { msg += ` 🐍 snake ${p}→${SNAKES[p]}`; p = SNAKES[p]; }
      r.pos[pi] = p;
    }
    addLog(r, msg);
    if (r.pos[pi] === 100) return finish(r, pi);
    if (dice !== 6) nextTurn(r); else addLog(r, `${name} gets another turn`);
    emitRoom(r); scheduleBot(r);
    return;
  }

  const mv = ludoMovable(r.tokens[pi], dice);
  addLog(r, `${name} rolled ${dice}`);
  if (mv.length === 0) { addLog(r, `${name} has no moves`); nextTurn(r); }
  else { r.rolled = true; r.movable = mv; }
  emitRoom(r); scheduleBot(r);
  if (mv.length === 1 && !r.players[pi].bot) setTimeout(() => doMove(r, pi, mv[0]), 600);
}

function doMove(r, pi, ti) {
  if (r.game !== "ludo" || r.winner !== null || r.turn !== pi || !r.rolled || !r.movable.includes(ti)) return;
  const dice = r.dice, name = r.players[pi].name;
  const t = r.tokens[pi];
  t[ti] = t[ti] === -1 ? 0 : t[ti] + dice;
  let bonus = dice === 6;
  const a = absPos(pi, t[ti]);
  if (a !== null && !SAFE.includes(a)) {
    const oi = 1 - pi;
    r.tokens[oi].forEach((op, k) => {
      if (absPos(oi, op) === a) { r.tokens[oi][k] = -1; bonus = true; addLog(r, `💥 ${name} captured a token!`); }
    });
  }
  if (t[ti] === 56) { bonus = true; addLog(r, `🏠 ${name} brought a token home`); }
  if (t.every((p) => p === 56)) return finish(r, pi);
  if (bonus) { r.rolled = false; r.movable = []; addLog(r, `${name} gets another turn`); }
  else nextTurn(r);
  emitRoom(r); scheduleBot(r);
}

function scheduleBot(r) {
  const p = r.players[r.turn];
  if (!p.bot || r.winner !== null) return;
  setTimeout(() => {
    if (r.winner !== null || r.turn === undefined) return;
    if (!r.rolled) doRoll(r, r.turn);
    else {
      const mv = r.movable;
      const best = mv.slice().sort((x, y) => r.tokens[r.turn][y] - r.tokens[r.turn][x])[0];
      doMove(r, r.turn, best);
    }
  }, 900);
}

io.on("connection", (socket) => {
  socket.on("login", (name, cb) => {
    name = String(name || "").trim().slice(0, 16) || "Guest" + Math.floor(Math.random() * 1000);
    socket.data.name = name;
    cb?.({ name, balance: balGame(name), fees: FEES_GAME });
  });

  socket.on("search", ({ game, fee }) => {
    const name = socket.data.name;
    if (!name || !GAMES.includes(game) || !FEES_GAME.includes(fee)) return;
    if (balGame(name) < fee) return socket.emit("error_msg", "Insufficient balance");
    removeFromQueues(socket.id);
    const key = `${game}:${fee}`;
    const oppIdx = queues[key].findIndex((q) => q.name !== name && q.socketId !== socket.id);
    if (oppIdx >= 0) {
      const opp = queues[key].splice(oppIdx, 1)[0];
      clearTimeout(opp.timer);
      createRoom(game, fee, [{ name: opp.name, socketId: opp.socketId }, { name, socketId: socket.id }]);
    } else {
      const entry = { socketId: socket.id, name };
      entry.timer = setTimeout(() => {
        queues[key] = queues[key].filter((q) => q !== entry);
        if (socket.connected) createRoom(game, fee, [{ name, socketId: socket.id }, { name: "🤖 Bot", bot: true }]);
      }, BOT_WAIT_MS);
      queues[key].push(entry);
      socket.emit("searching", { game, fee, waitMs: BOT_WAIT_MS });
    }
  });

  socket.on("cancel", () => { removeFromQueues(socket.id); socket.emit("cancelled"); });

  const myRoom = () => {
    const r = rooms[socket.data.room];
    if (!r) return [];
    return [r, r.players.findIndex((p) => p.socketId === socket.id)];
  };
  socket.on("roll", () => { const [r, pi] = myRoom(); if (r) doRoll(r, pi); });
  socket.on("move", (ti) => { const [r, pi] = myRoom(); if (r) doMove(r, pi, ti); });
  socket.on("leave", () => {
    const [r, pi] = myRoom();
    if (r && r.winner === null) finish(r, 1 - pi, "opponent left");
    socket.leave(socket.data.room); socket.data.room = null;
  });

  socket.on("disconnect", () => {
    removeFromQueues(socket.id);
    const [r, pi] = myRoom();
    if (r && r.winner === null) finish(r, 1 - pi, "opponent disconnected");
  });
});

// Static frontend build serving (optional if hosted separately)
app.use(express.static(path.join(__dirname, "./winarena-frontend/dist")));
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, "./winarena-frontend/dist/index.html"));
});