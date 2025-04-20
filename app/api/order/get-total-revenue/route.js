// app/api/order/get-total-revenue/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        await connectDB();

        // Agregasi: jumlahkan semua field `amount`
        const result = await Order.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]);

        const revenue = result[0]?.totalRevenue || 0;
        return NextResponse.json({ success: true, revenue });
    } catch (error) {
        console.error("GET /api/order/get-total-revenue error:", error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
