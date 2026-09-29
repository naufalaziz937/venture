import connectDB from "@/config/db";
import Order from "@/models/order";
import { requireSeller } from "@/lib/requireSeller";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
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
