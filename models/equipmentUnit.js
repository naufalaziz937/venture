import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
    action: { type: String, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, required: true },
    orderId: { type: String, default: null },
    notes: { type: String, default: '' },
    actorId: { type: String, required: true },
    at: { type: Date, default: Date.now },
}, { _id: false });

const equipmentUnitSchema = new mongoose.Schema({
    product: { type: String, ref: 'product', required: true, index: true },
    serialNumber: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    status: { type: String, enum: ['available', 'reserved', 'rented', 'damaged', 'lost', 'retired'], default: 'available', index: true },
    condition: { type: String, enum: ['excellent', 'good', 'fair', 'damaged', 'lost'], default: 'good' },
    currentOrder: { type: String, ref: 'order', default: null, index: true },
    maintenanceReference: { type: String, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
    history: { type: [historySchema], default: [] },
}, { timestamps: true });

export default mongoose.models.equipmentUnit || mongoose.model('equipmentUnit', equipmentUnitSchema);
