import { inngest } from "@/config/inngest";
import Product from "@/models/product";
import User from "@/models/user";
import Voucher from "@/models/voucher";  // Import model Voucher
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { address, items, voucherCode } = await request.json();  // Ambil kode voucher dari body

        if (!address || items.length === 0) {
            return NextResponse.json({ success: false, message: "Invalid data" });
        }

        // Hitung total order sebelum diskon
        let amount = await items.reduce(async (acc, item) => {
            const product = await Product.findById(item.product);
            return await acc + product.offerPrice * item.quantity;
        }, 0);

        let discountAmount = 0;

        // Validasi voucher jika ada
        if (voucherCode) {
            const voucher = await Voucher.findOne({ code: voucherCode });

            if (voucher) {
                if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
                    return NextResponse.json({ success: false, message: "Voucher expired" }, { status: 400 });
                }

                // Cek penggunaan voucher
                if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
                    return NextResponse.json({ success: false, message: "Voucher usage limit exceeded" }, { status: 400 });
                }

                // Hitung diskon berdasarkan tipe voucher
                if (voucher.type === 'fixed') {
                    discountAmount = voucher.amount;
                } else if (voucher.type === 'percent') {
                    discountAmount = (amount * voucher.amount) / 100;
                }

                // Update jumlah penggunaan voucher
                voucher.usedCount += 1;
                await voucher.save();
            } else {
                return NextResponse.json({ success: false, message: "Voucher not found" }, { status: 400 });
            }
        }

        // Tambahkan diskon ke total amount
        const totalAmount = amount + Math.floor(amount * 0.12) - discountAmount;  // Termasuk tax 12%

        // Kirim event ke inngest
        await inngest.send({
            name: 'order/created',
            data: {
                userId,
                address,
                items,
                amount: totalAmount,  // Kirim total amount setelah diskon
                discountAmount,  // Kirim jumlah diskon yang diterapkan
                voucherCode,  // Kirim kode voucher yang diterapkan
                date: Date.now(),
            },
        });

        // Clear user cart
        const user = await User.findById(userId);
        user.cartItems = {};
        await user.save();

        return NextResponse.json({ success: true, message: 'Order Placed' });
    } catch (error) {
        console.error("Inngest send error:", error);
        return NextResponse.json({ success: false, message: "Failed to send order event" });
    }
}
