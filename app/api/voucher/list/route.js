// app/api/voucher/list/route.js
import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
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
