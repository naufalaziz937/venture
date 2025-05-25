// app/api/order/get-order-status-breakdown/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDB();

        const orders = await Order.find({}, "status").lean();

        const statusBreakdown = {};

        for (let order of orders) {
            const status = order.status || "Unknown";
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        }

        return NextResponse.json({ success: true, statusBreakdown });
    } catch (err) {
        console.error("GET /api/order/get-order-status-breakdown error:", err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
