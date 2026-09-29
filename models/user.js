import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id:{ type : String, required:true},
    clerkId:{ type: String, unique:true, sparse:true, index:true },
    name:{ type : String, required:true},
    email:{ type : String, required:true, unique:true},
    imageUrl:{ type : String, default:""},
    cartItems:{ type : Object, default:{}},
    cartRentalPeriod: {
        rentalStartDate: { type: Date, default: null },
        rentalEndDate: { type: Date, default: null },
    }
},{minimize: false, timestamps: true})

const User = mongoose.models.user || mongoose.model('user', userSchema)

export default User
