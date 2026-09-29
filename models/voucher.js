import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },   // misal “WELCOME10”
    type: { type: String, required: true, enum: ['fixed', 'percent'] },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
        validate: {
            validator(value) { return this.type !== 'percent' || value <= 100; },
            message: 'Percent voucher amount cannot exceed 100',
        },
    },
    expiresAt: { type: Date, required: false },                 // optional
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Voucher
    || mongoose.model('Voucher', voucherSchema);
