import connectDB from '@/config/db';
import Product from '@/models/product';
import User from '@/models/user';
import { inngest } from '@/config/inngest';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        await connectDB();

        const { userId } = getAuth(request);
        const { address, items, voucherCode } = await request.json();

        if (!userId || !address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
        }

        // Hitung total amount
        let subtotal = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return NextResponse.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
            }
            subtotal += product.offerPrice * item.quantity;
        }

        let tax = Math.floor(subtotal * 0.12); // Pajak 12%
        let totalAmount = subtotal + tax;

        // Kalau ada voucher
        if (voucherCode) {
            const Voucher = (await import('@/models/voucher')).default;
            const voucher = await Voucher.findOne({ code: voucherCode });

            if (voucher) {
                if (voucher.type === 'percent') {
                    const diskon = Math.floor(subtotal * voucher.amount / 100);
                    totalAmount -= diskon;
                } else if (voucher.type === 'fixed') {
                    totalAmount -= voucher.amount;
                }

                // Naikin counter usage voucher
                voucher.usedCount = (voucher.usedCount || 0) + 1;
                await voucher.save();
            }
        }

        // Kirim event ke inngest buat create order async
        await inngest.send({
            name: 'order/created',
            data: {
                userId,
                address,
                items,
                amount: totalAmount,
                date: Date.now(),
            },
        });

        // Clear cart user
        const user = await User.findById(userId);
        if (user) {
            user.cartItems = {};
            await user.save();
        }

        return NextResponse.json({ success: true, message: 'Order berhasil dibuat' });

    } catch (error) {
        console.error('Create Order Error:', error);
        return NextResponse.json({ success: false, message: 'Gagal membuat order' }, { status: 500 });
    }
}
