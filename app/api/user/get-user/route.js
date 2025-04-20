import connectDB from "@/config/db";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDB();
        const users = await User.find({}, "_id name email").lean();
        return NextResponse.json({ success: true, users }); // ✅ PLURAL: users
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
