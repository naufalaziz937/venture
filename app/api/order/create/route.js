import { inngest } from "@/config/inngest";
import Product from "@/models/product";
import User from "@/models/user";
import Order from "@/models/order"; // <-- Tambahan penting
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { address, items } = await request.json();

        if (!address || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid data' });
        }

        // Hitung total amount
        let amount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);
            amount += product.offerPrice * item.quantity;
        }

        const finalAmount = amount + Math.floor(amount * 0.12);

        // Simpan order ke database
        const newOrder = await Order.create({
            userId,
            address,
            items,
            amount: finalAmount,
            date: Date.now(),
            paymentType: 'COD'
        });

        // Kirim event ke inngest
        await inngest.send({
            name: 'order/created',
            data: {
                orderId: newOrder._id, // bisa dipakai buat tracking
                userId,
                address,
                items,
                amount: finalAmount,
                date: newOrder.date
            }
        });

        // Kosongkan keranjang user
        const user = await User.findById(userId);
        user.cartItems = {};
        await user.save();

        return NextResponse.json({ success: true, message: 'Order Placed' });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ success: false, message: error.message });
    }
}
