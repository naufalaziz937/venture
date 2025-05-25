import Order from "@/models/order";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Product from "@/models/product";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { address, items, voucherCode, discountAmount = 0 } = await request.json();
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
        let totalAmount = subtotal + Math.floor(subtotal * 0.12) - discountAmount;

        // Simpan order ke database
        const order = await Order.create({
            userId,
            address,
            items,
            amount: totalAmount,
            date: Date.now(),
            paymentType: 'Stripe',
            voucherCode, // disimpan buat tracking walau gak divalidasi di sini
            discountAmount // juga simpan total diskon
        });

        const line_items = productData.map(item => ({
            price_data: {
                currency: 'idr',
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100, // Harga dalam sen
            },
            quantity: item.quantity
        }));

        // Tambahin diskon ke Stripe line item kalau ada
        if (discountAmount > 0) {
            line_items.push({
                price_data: {
                    currency: 'idr',
                    product_data: {
                        name: `Voucher: ${voucherCode || 'Discount'}`
                    },
                    unit_amount: -discountAmount * 100, // diskon dalam sen (negatif)
                },
                quantity: 1
            });
        }

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
