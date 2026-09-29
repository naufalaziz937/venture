import connectDB from "@/config/db";
import Address from "@/models/address";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureMongoUser } from "@/lib/syncClerkUser";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const { address } = await request.json();
        if (!address || typeof address !== 'object') return NextResponse.json({ success: false, message: 'Invalid address' }, { status: 400 });

        await connectDB();
        const user = await ensureMongoUser(userId);
        const newAddress = await Address.create({...address, userId: user._id})

        return NextResponse.json({ success: true, message: "Address added successfully", newAddress });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to add address' }, { status: 500 });
    }
}
