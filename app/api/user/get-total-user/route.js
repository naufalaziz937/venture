// app/api/user/get-total-user/route.js
import connectDB from "@/config/db";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        await connectDB();
        // Hitung total user
        const totalUsers = await User.countDocuments();
        return NextResponse.json({ success: true, users: totalUsers });
    } catch (error) {
        console.error("GET /api/user/get-total-user error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
