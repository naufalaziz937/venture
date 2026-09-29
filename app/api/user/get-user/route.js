import connectDB from "@/config/db";
import User from "@/models/user";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
        await connectDB();
        const users = await User.find({}, "_id name email").lean();
        return NextResponse.json({ success: true, users }); // ✅ PLURAL: users
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
