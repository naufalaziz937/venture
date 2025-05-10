import Order from "@/models/order";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Product from "@/models/product";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { address, items, voucherCode } = await request.json(); // ambil voucherCode juga
        const origin = request.headers.get('origin');

        if (!address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid data' });
        }

        let productData = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) continue;

            productData.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity
            });

            subtotal += product.offerPrice * item.quantity;
        }

        // Pajak 12%
        let totalAmount = subtotal + Math.floor(subtotal * 0.12);

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

        // Simpan order ke database
        const order = await Order.create({
            userId,
            address,
            items,
            amount: totalAmount,
            date: Date.now(),
            paymentType: 'Stripe'
        });

        const line_items = productData.map(item => ({
            price_data: {
                currency: 'idr',
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100, // Harga harus dalam sen
            },
            quantity: item.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url: `${origin}/order-placed`,
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId
            }
        });

        return NextResponse.json({ success: true, url: session.url });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: error.message });
    }
}
