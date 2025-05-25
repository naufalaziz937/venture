// app/api/order/get-recent-orders/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import User from "@/models/user";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "5");
        const skip = (page - 1) * limit;

        const orders = await Order.find()
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .populate("userId", "name")
            .lean();

        const recentOrders = orders.map(o => ({
            id: o._id.toString(),
            name: o.userId?.name || "—",
            amount: o.amount,
            date: o.date,
            status: o.status,
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
