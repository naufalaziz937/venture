import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { response } = await requireSeller(req);
        if (response) return response;
        await connectDB();
        const { code, type, amount, expiresAt, usageLimit } = await req.json();
        const v = await Voucher.create({ code, type, amount, expiresAt, usageLimit });
        return NextResponse.json({ success: true, voucher: v });
    } catch (e) {
        return NextResponse.json({ success: false, message: e.message }, { status: 400 });
    }
}
