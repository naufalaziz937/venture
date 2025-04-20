import connectDB from "@/config/db";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        await connectDB();
        // Count all orders in the collection
        const totalOrders = await Order.countDocuments();
        return NextResponse.json({ success: true, orders: totalOrders });
    } catch (error) {
        console.error("GET /api/order/get-total-order error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
