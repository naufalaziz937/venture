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
            .populate("userId", "name")
            .lean();

        // Sertakan status di payload
        const recentOrders = orders.map(o => ({
            id: o._id.toString(),
            name: o.userId?.name || "—",
            amount: o.amount,
            date: o.date,
            status: o.status,             // <— tambahkan status
        }));

        return NextResponse.json({ success: true, recentOrders });
    } catch (error) {
        console.error("GET /api/order/get-recent-orders error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
