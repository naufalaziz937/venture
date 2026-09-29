import mongoose from 'mongoose';

const paymentEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['processing', 'completed', 'failed'], required: true },
    attempts: { type: Number, min: 1, default: 1 },
    error: { type: String, default: null },
    processedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.paymentEvent || mongoose.model('paymentEvent', paymentEventSchema);
