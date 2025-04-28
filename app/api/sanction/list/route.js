// app/api/sanction/list/route.js
import connectDB from "@/config/db";
import Sanction from "@/models/sanction";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDB();
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
