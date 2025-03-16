import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    pinCode: { type: Number, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
});

// Perbaikan pada deklarasi model
const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);

export default Address;
