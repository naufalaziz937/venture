import connectDB from "@/config/db";
import Address from "@/models/address";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureMongoUser } from "@/lib/syncClerkUser";

export async function GET(request) {
    try {
        // ✅ Pastikan request dikirim ke getAuth() untuk mendapatkan userId
        const { userId } = getAuth(request);  
        
        if (!userId) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const user = await ensureMongoUser(userId);
        const addresses = await Address.find({ userId: user._id });

        return NextResponse.json({ success: true, addresses }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
