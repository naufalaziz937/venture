import connectDB from "@/config/db";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDB();

        // Grouping order status
        const result = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusBreakdown = {};
        result.forEach(item => {
            statusBreakdown[item._id || "Tidak Diketahui"] = item.count;
        });

        return NextResponse.json({ success: true, statusBreakdown });
    } catch (error) {
        console.error("Error breakdown order status:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
