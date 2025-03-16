import { inngest } from "@/config/inngest";
import Product from "@/models/product";
import User from "@/models/user";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        // Pastikan getAuth menerima request agar userId tidak undefined
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: "User not authenticated" }, { status: 401 });
        }

        // Ambil data dari request body
        const { address, items } = await request.json();
        if (!address || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: "Invalid data" }, { status: 400 });
        }

        // Hitung total harga dengan Promise.all() agar tidak ada masalah async di reduce()
        const amounts = await Promise.all(
            items.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) {
                    throw new Error(`Product with ID ${item.product} not found`);
                }
                return product.offerPrice * item.quantity;
            })
        );

        const amount = amounts.reduce((acc, price) => acc + price, 0);

        // Kirim data ke inngest
        await inngest.send({
            name: "order/created",
            data: {
                userId,
                address,
                items,
                amount: amount + Math.floor(amount * 0.02),
                date: Date.now(),
            },
        });

        // Hapus cart user hanya jika user ditemukan
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }
        user.cartItems = {};
        await user.save();

        return NextResponse.json({ success: true, message: "Order Placed" });

    } catch (error) {
        console.log("Order Creation Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
