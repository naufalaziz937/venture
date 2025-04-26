import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        await connectDB();
        const { code, type, amount, expiresAt, usageLimit } = await req.json();
        const v = await Voucher.create({ code, type, amount, expiresAt, usageLimit });
        return NextResponse.json({ success: true, voucher: v });
    } catch (e) {
        return NextResponse.json({ success: false, message: e.message }, { status: 400 });
    }
}
