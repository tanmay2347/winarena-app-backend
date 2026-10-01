const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    mobile: { type: String, default: "" },
    walletBalance: { type: Number, default: 0.00 }, // 🟢 Naye user ke liye 0 balance set kiya gaya
    history: [
        {
            type: { type: String },
            amount: Number,
            txnId: String,
            gatewayId: String,
            status: { type: String, default: "Success" },
            time: { type: String, default: () => new Date().toLocaleString() }
        }
    ]
});

module.exports = mongoose.model('User', userSchema);