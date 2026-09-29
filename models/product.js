import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    userId: {type: String, required: true, ref: "user"},
    name: {type: String, required: true},
    description: {type: String, required: true},
    price: {type: Number, required: true},
    offerPrice: {type: Number, required: true},
    image: {type: Array, required: true},
    category: {type: String, required: true},
    date: {type: Number, required: true},
    stock: { type: Number, required: true, min: 0, default: 1 },
    depositAmount: { type: Number, required: true, min: 0, default: 0 },
    movements: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    reservations: { type: [{
        orderId: { type: String, required: true },
        kind: { type: String, enum: ['rental', 'maintenance'], default: 'rental' },
        unitId: String,
        reason: String,
        rentalStartDate: { type: Date, required: true },
        rentalEndDate: { type: Date, required: true },
        quantity: { type: Number, required: true, min: 1 },
        status: { type: String, enum: ['pending', 'confirmed'], default: 'pending' },
        expiresAt: { type: Date, default: null },
    }], select: false, default: [] }
})

const Product = mongoose.models.product || mongoose.model('product',productSchema)
export default Product
