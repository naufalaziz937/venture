import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id:{ type : String, reqired:true},
    name:{ type : String, reqired:true},
    email:{ type : String, reqired:true, unique:true},
    imageURL:{ type : String, reqired:true},
    cartItems:{ type : Object, default:{}}
},{minimize: false})

const User = mongoose.models.user || mongoose.model('user', userSchema)

export default User