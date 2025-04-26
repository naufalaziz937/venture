import connectDB from "@/config/db";
import Voucher from "@/models/voucher";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ success: false, message: "Kode voucher tidak diberikan" }, { status: 400 });
        }

        const voucher = await Voucher.findOne({ code });

        if (voucher) {
            // Hitung diskon
            let discountAmount = 0;
            if (voucher.type === 'fixed') {
                discountAmount = voucher.amount;
            } else if (voucher.type === 'percent') {
                discountAmount = voucher.amount;
            }

            return NextResponse.json({
                success: true,
                voucher: {
                    code: voucher.code,
                    type: voucher.type,
                    amount: voucher.amount, // amount untuk di frontend
                    discountAmount: discountAmount, // nilai diskon yang dihitung
                }
            });
        } else {
            return NextResponse.json({ success: false, message: 'Voucher tidak valid' }, { status: 404 });
        }
    } catch (err) {
        console.error("Voucher validation error:", err);
        return NextResponse.json({ success: false, message: "Gagal memvalidasi voucher" }, { status: 500 });
    }
}
