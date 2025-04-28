// app/api/voucher/validate/route.js
import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        if (!code) {
            return NextResponse.json({ success: false, message: "Kode voucher tidak diberikan" }, { status: 400 });
        }
        const voucher = await Voucher.findOne({ code });
        if (!voucher) {
            return NextResponse.json({ success: false, message: "Voucher tidak valid" }, { status: 404 });
        }
        // Jangan hitung diskon di sini, cukup kirim type & amount
        return NextResponse.json({
            success: true,
            voucher: {
                code: voucher.code,
                type: voucher.type,    // 'fixed' atau 'percent'
                amount: voucher.amount // nominal (Rp) atau persen (0–100)
            }
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ success: false, message: "Gagal memvalidasi voucher" }, { status: 500 });
    }
}
