import mongoose from "mongoose";
import { ORDER_STATUSES } from "@/lib/orderStatus.mjs";
import { DELIVERY_STATUSES, ORDER_LIFECYCLE_STATUSES, RENTAL_STATUSES } from '@/lib/rentalLifecycle.mjs';

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true, ref: 'user' },
    items: [{
        product: { type: String, required: true, ref: 'product' },
        quantity: { type: Number, required: true },
        equipmentUnits: [{ type: String, ref: 'equipmentUnit' }],
    }],
    amount: { type: Number, required: true },
    // Optional for compatibility with orders created before rental/deposit accounting.
    rentalAmount: { type: Number, min: 0, default: 0 },
    depositAmount: { type: Number, min: 0, default: 0 },
    depositStatus: {
        type: String,
        enum: ['not_required', 'pending', 'held', 'release_pending', 'released', 'partially_withheld', 'withheld'],
        default: 'not_required',
    },
    depositWithheldAmount: { type: Number, min: 0, default: 0 },
    depositPendingWithheldAmount: { type: Number, min: 0, default: 0 },
    address: { type: String, ref: 'Address', required: true },
    status: { type: String, required: true, enum: ORDER_STATUSES, default: 'Pending' },
    date: { type: Number, required: true },
    beforeRentalImage: { type: String, required: false }, // Foto sebelum dirental
    afterRentalImage: { type: String, required: false },  // Foto setelah dirental
    discountAmount: { type: Number, default: 0 },
    voucherCode: { type: String, default: null },
    paymentType: {type: String, required: true},
    isPaid: { type: Boolean, required: true, default: false},
    paymentStatus: { type: String, enum: ['pending', 'selesai', 'batal', 'partially_refunded', 'refunded'], default: 'pending' },
    checkoutKey: { type: String, unique: true, sparse: true, index: true },
    stripeSessionId: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null },
    refundedAmount: { type: Number, min: 0, default: 0 },
    rentalRefundedAmount: { type: Number, min: 0, default: 0 },
    depositRefundedAmount: { type: Number, min: 0, default: 0 },
    refundReservedAmount: { type: Number, min: 0, default: 0 },
    refundStatus: { type: String, enum: ['none', 'pending', 'succeeded', 'failed'], default: 'none' },
    refunds: [{
        amount: { type: Number, min: 1, required: true },
        reason: { type: String, required: true },
        status: { type: String, enum: ['pending', 'succeeded', 'failed'], required: true },
        stripeRefundId: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
        processedBy: { type: String, required: true },
        requestKey: { type: String, required: true },
    }],
    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    reservationStatus: { type: String, enum: ['pending', 'confirmed', 'released'], required: true },
    orderStatus: { type: String, enum: ORDER_LIFECYCLE_STATUSES, default: 'placed', required: true },
    rentalStatus: { type: String, enum: RENTAL_STATUSES, default: 'reserved', required: true },
    deliveryStatus: { type: String, enum: DELIVERY_STATUSES, default: 'pending', required: true },
    outstandingAmount: { type: Number, min: 0, default: 0 },
    outstandingStatus: { type: String, enum: ['none', 'pending', 'paid', 'waived'], default: 'none' },
    lateFeePerDay: { type: Number, min: 0, default: 0 },
    returnRequest: {
        requestedAt: { type: Date, default: null },
        notes: { type: String, default: '' },
    },
    returnInspectionStatus: { type: String, enum: ['none', 'processing', 'completed'], default: 'none' },
    returnInspection: {
        receivedAt: { type: Date, default: null },
        inspectedAt: { type: Date, default: null },
        inspectedBy: { type: String, default: null },
        notes: { type: String, default: '' },
        evidenceImages: { type: [String], default: [] },
        items: [{
            product: { type: String, ref: 'product', required: true },
            quantity: { type: Number, min: 1, required: true },
            condition: { type: String, enum: ['normal', 'damaged', 'lost'], required: true },
            notes: { type: String, default: '' },
            charge: { type: Number, min: 0, default: 0 },
        }],
        lateDays: { type: Number, min: 0, default: 0 },
        lateFee: { type: Number, min: 0, default: 0 },
        conditionCharges: { type: Number, min: 0, default: 0 },
        totalAdditionalCharge: { type: Number, min: 0, default: 0 },
    },
    extensionHistory: [{
        previousEndDate: { type: Date, required: true },
        newEndDate: { type: Date, required: true },
        extendedAt: { type: Date, default: Date.now },
        extendedBy: { type: String, required: true },
        additionalAmount: { type: Number, min: 0, required: true },
        paymentStatus: { type: String, enum: ['pending', 'paid', 'waived'], default: 'pending' },
    }],
});

const Order = mongoose.models.order || mongoose.model('order', orderSchema);
export default Order;
