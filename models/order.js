import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true, ref: 'user' },
    items: [
        {
            product: { type: String, required: true, ref: 'product' },
            quantity: { type: Number, required: true }
        }
    ],
    amount: { type: Number, required: true },
    address: { type: String, required: true, ref: 'Address' },
    date: { type: Number, required: true },

    // Status Pembayaran
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Selesai', 'Batal'],
        default: 'Pending'
    },

    // Status Pengiriman
    deliveryStatus: {
        type: String,
        enum: [
            'Pending',
            'Dalam Perjalanan ke Alamat User',
            'Sampai di User',
            'Dikembalikan ke Venture',
            'Selesai',
            'Dibatalkan'
        ],
        default: 'Pending'
    }
});

const Order = mongoose.models.order || mongoose.model('order', orderSchema);
export default Order;
