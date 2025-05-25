import connectDB from "@/config/db";
import Order from "@/models/order";
import User from "@/models/user";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const body = await request.text();
        const sig = request.headers.get("stripe-signature");

        const event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        const handlePayment = async (paymentIntentId, isPaid) => {
            const sessionList = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId,
            });

            const session = sessionList.data[0];
            const { orderId, userId } = session.metadata;

            await connectDB();

            if (isPaid) {
                // Tandai order sebagai paid
                await Order.findByIdAndUpdate(orderId, { isPaid: true });

                // Kosongkan cart user
                await User.findByIdAndUpdate(userId, { cartItems: {} });

                // Cek dan update penggunaan voucher jika ada
                const order = await Order.findById(orderId);
                if (order?.voucherCode) {
                    const Voucher = (await import('@/models/voucher')).default;
                    const voucher = await Voucher.findOne({ code: order.voucherCode });

                    if (voucher) {
                        voucher.usedCount = (voucher.usedCount || 0) + 1;
                        await voucher.save();
                    }
                }

            } else {
                // Hapus order kalau pembayaran gagal/batal
                await Order.findByIdAndDelete(orderId);
            }
        };

        switch (event.type) {
            case "payment_intent.succeeded":
                await handlePayment(event.data.object.id, true);
                break;
            case "payment_intent.canceled":
                await handlePayment(event.data.object.id, false);
                break;
            default:
                console.error(`Unhandled event type: ${event.type}`);
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: error.message });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
