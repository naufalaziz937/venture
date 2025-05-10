import Order from "@/models/order";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Product from "@/models/product";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { address, items } = await request.json();
        const origin = request.headers.get('origin');

        if (!address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid data' });
        }

        let productData = [];
        let amount = 0;

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) continue;

            productData.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity
            });

            amount += product.offerPrice * item.quantity;
        }

        const finalAmount = amount + Math.floor(amount * 0.12);

        // Simpan order ke database
        const order = await Order.create({
            userId,
            address,
            items,
            amount: finalAmount,
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
