import connectDB from "@/config/db";
import User from "@/models/user"; // Tambahkan import model User
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) { // ✅ Ubah 'Post' jadi 'POST'
    try {
        const { userId } = getAuth(request); // ✅ Ambil userId dengan benar
        const { cartData } = await request.json(); // ✅ Pastikan data diambil dengan benar
        
        await connectDB(); // ✅ Koneksi ke database

        const user = await User.findById(userId); // ✅ Pakai 'await' untuk ambil user

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        user.cartItems = cartData; // ✅ Simpan cartData ke user
        await user.save(); // ✅ Simpan perubahan

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
