// app/api/order/get-recent-orders/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDB();

        // Ambil 10 order terbaru, populate nama user 
        const orders = await Order.find()
            .sort({ date: -1 })
            .limit(10)
            .populate("userId", "name")   // ambil field name dari koleksi User
            .lean();

        // Ubah ke objek plain dengan `id` unik
        const recentOrders = orders.map(o => ({
            id: o._id.toString(),               // unique key
            name: o.userId?.name || "—",        // nama customer
            amount: o.amount,
            date: o.date,
        }));

        return NextResponse.json({ success: true, recentOrders });
    } catch (error) {
        console.error("GET /api/order/get-recent-order error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
