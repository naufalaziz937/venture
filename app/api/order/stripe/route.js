import connectDB from "@/config/db";
import Order from "@/models/order";
import Product from "@/models/product";
import Voucher from "@/models/voucher"; // <- pastikan model ini ada
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        await connectDB(); // konek DB dulu

        const { userId } = getAuth(request);
        const { address, items, voucherCode } = await request.json();
        const origin = request.headers.get("origin");

        if (!address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: "Invalid data" });
        }

        let productData = [];
        let subtotal = 0;

        // Ambil info produk
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

        let totalAmount = subtotal;

        // Kalau ada voucher
        let voucher;
        if (voucherCode) {
            voucher = await Voucher.findOne({ code: voucherCode });

            if (voucher) {
                if (voucher.type === "percent") {
                    const diskon = Math.floor(subtotal * voucher.amount / 100);
                    totalAmount -= diskon;
                } else if (voucher.type === "fixed") {
                    totalAmount -= voucher.amount;
                }

                // Naikin counter usage voucher
                voucher.usedCount = (voucher.usedCount || 0) + 1;
                await voucher.save();
            }
        }

        // Pajak 12%
        totalAmount += Math.floor(totalAmount * 0.12);

        // Simpan order ke DB
        const order = await Order.create({
            userId,
            address,
            items,
            amount: totalAmount,
            date: Date.now(),
            paymentType: "Stripe"
        });

        // Buat line_items dengan diskon langsung di potong
        const line_items = productData.map((item) => {
            let unitPrice = item.price;

            if (voucher) {
                if (voucher.type === "percent") {
                    unitPrice = Math.floor(unitPrice - (unitPrice * voucher.amount / 100));
                } else if (voucher.type === "fixed") {
                    const potonganPerItem = Math.floor(voucher.amount / productData.length);
                    unitPrice = Math.max(unitPrice - potonganPerItem, 0);
                }
            }

            return {
                price_data: {
                    currency: "idr",
                    product_data: {
                        name: item.name
                    },
                    unit_amount: unitPrice * 100 // dalam sen
                },
                quantity: item.quantity
            };
        });

        // Buat sesi Stripe
        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: "payment",
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
