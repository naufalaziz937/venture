import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },   // misal “WELCOME10”
    type: { type: String, required: true, enum: ['fixed', 'percent'] },
    amount: { type: Number, required: true },                  // fixed → Rp, percent → 0–100
    expiresAt: { type: Date, required: false },                 // optional
    usageLimit: { type: Number, default: null },                   // null = unlimited
    usedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Voucher
    || mongoose.model('Voucher', voucherSchema);
