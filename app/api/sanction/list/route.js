// app/api/sanction/list/route.js
import connectDB from "@/config/db";
import Sanction from "@/models/sanction";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
        await connectDB();
        await Sanction.updateMany({ status: 'Active', expiresAt: { $lte: new Date() } }, { $set: { status: 'Completed' } });
        const sanctions = await Sanction.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, sanctions });
    } catch (error) {
        console.error("GET /api/sanction/list error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
