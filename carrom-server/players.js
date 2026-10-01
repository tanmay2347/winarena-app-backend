import mongoose from 'mongoose';

// Main Server wala User schema reference
const userSchema = new mongoose.Schema({
    name: { type: String, default: "Arena Player" },
    email: { type: String, unique: true },
    mobile: { type: String, default: "" },
    walletBalance: { type: Number, default: 0.00 },
    timestamp: { type: Date, default: Date.now },
    stats: {
        games: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        pots: { type: Number, default: 0 },
        coinsPocketed: { type: Number, default: 0 },
        fouls: { type: Number, default: 0 }
    }
});

// Avoid OverwriteModelError if already compiled
const User = mongoose.models.User || mongoose.model('User', userSchema);

const START_BALANCE = 100;
const PLATFORM_FEE_PCT = 0.05;

export const FEE_TIERS = [2, 5, 10, 25];
export const PLATFORM_PCT = PLATFORM_FEE_PCT;

export async function getOrCreate(id, name) {
  try {
    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    
    if (!user) {
      user = await User.create({
        name: (name || 'Player').slice(0, 16),
        email: `player_${Math.random().toString(36).slice(2, 8)}@winarena.com`,
        walletBalance: START_BALANCE
      });
    } else if (name && name !== user.name) {
      user.name = name.slice(0, 16);
      await user.save();
    }

    return {
      id: user._id.toString(),
      name: user.name,
      balance: user.walletBalance,
      stats: user.stats || { games: 0, wins: 0, pots: 0, coinsPocketed: 0, fouls: 0 }
    };
  } catch (e) {
    console.warn('[players] getOrCreate error:', e.message);
    return {
      id: id || 'temp_user',
      name: name || 'Player',
      balance: START_BALANCE,
      stats: { games: 0, wins: 0, pots: 0, coinsPocketed: 0, fouls: 0 }
    };
  }
}

export function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    balance: p.balance,
    stats: p.stats
  };
}

export async function addBalance(player, amount) {
  try {
    const user = await User.findById(player.id);
    if (user) {
      user.walletBalance = Math.max(0, Math.round((user.walletBalance + amount) * 100) / 100);
      player.balance = user.walletBalance;
      await user.save();
    }
  } catch (e) {
    console.warn('[players] addBalance error:', e.message);
    player.balance = Math.max(0, Math.round((player.balance + amount) * 100) / 100);
  }
  return player.balance;
}

export function canAfford(player, fee) {
  return player.balance >= fee;
}

export function settle(pot) {
  const platformFee = Math.round(pot * PLATFORM_FEE_PCT * 100) / 100;
  return { payout: Math.round((pot - platformFee) * 100) / 100, platformFee };
}

export async function leaderboard(n = 10) {
  try {
    const users = await User.find({})
      .sort({ 'stats.wins': -1, walletBalance: -1 })
      .limit(n);
    
    return users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      balance: u.walletBalance,
      stats: u.stats || { games: 0, wins: 0, pots: 0, coinsPocketed: 0, fouls: 0 }
    }));
  } catch (e) {
    return [];
  }
}

export async function recordResult(player, { won, payout, pocketed, fouls, isBot }) {
  if (isBot) return;
  try {
    const user = await User.findById(player.id);
    if (!user) return;

    if (!user.stats) user.stats = { games: 0, wins: 0, pots: 0, coinsPocketed: 0, fouls: 0 };
    
    user.stats.games += 1;
    if (won) {
      user.stats.wins += 1;
      user.stats.pots += payout;
    }
    user.stats.coinsPocketed += pocketed || 0;
    user.stats.fouls += fouls || 0;

    await user.save();
  } catch (e) {
    console.warn('[players] recordResult error:', e.message);
  }
}