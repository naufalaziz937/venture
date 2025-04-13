import connectDB from "@/config/db";
import Address from "@/models/address";
import Order from "@/models/order";
import Product from "@/models/product";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ success: false, message: "User belum login." });
        }

        await connectDB();

        // Pastikan Address dan Product sudah ke-load
        await Promise.all([
            Address.findOne(),
            Product.findOne()
        ]);

        const orders = await Order.find({ userId }).populate('address items.product');

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message || "Terjadi kesalahan server." });
    }
}
