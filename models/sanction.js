// models/sanction.js
import mongoose from 'mongoose';

const sanctionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'user'
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Completed'],
        default: 'Active'
    },
    expiresAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ensure model is only compiled once in dev
const Sanction = mongoose.models.sanction || mongoose.model('sanction', sanctionSchema);
export default Sanction;
