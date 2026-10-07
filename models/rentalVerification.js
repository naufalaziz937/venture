import mongoose from 'mongoose';

const asset = new mongoose.Schema({ publicId: String, format: String }, { _id: false });
const schema = new mongoose.Schema({
    userId: { type: String, ref: 'user', required: true, unique: true },
    documentType: { type: String, enum: ['KTP', 'SIM'] },
    documentImage: { type: asset, select: false },
    selfieImage: { type: asset, select: false },
    fullName: String,
    phone: String,
    billingAddress: String,
    emergencyContact: { name: String, relationship: String, phone: String },
    status: { type: String, enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'], default: 'NOT_SUBMITTED' },
    rejectionReason: String,
    submittedAt: Date,
    verifiedAt: Date,
    rejectedAt: Date,
    reviewedBy: String,
    reviewedAt: Date,
    consentAt: Date,
    submissionLock: { type: String, select: false },
    lockExpiresAt: { type: Date, select: false },
}, { timestamps: true });
export default mongoose.models.rentalVerification || mongoose.model('rentalVerification', schema);

