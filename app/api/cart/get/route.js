import connectDB from "@/config/db";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureMongoUser } from "@/lib/syncClerkUser";

export async function GET(request) {
    try {
        const {userId} = getAuth(request);
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        await connectDB();
        const user = await ensureMongoUser(userId);
        const { cartItems, cartRentalPeriod } = user;
        return NextResponse.json({ success: true, cartItems, cartRentalPeriod });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            message: 'Failed to fetch cart'
        }, { status: 500 });
    }
}
