// app/api/voucher/list/route.js
import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDB();

        const vouchers = await Voucher.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, vouchers });
    } catch (error) {
        console.error("GET /api/voucher/list error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
