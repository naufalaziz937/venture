import connectDB from "@/config/db";
import { requireSeller } from "@/lib/requireSeller";
import Address from "@/models/address";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
        
        await connectDB();
        const orders = await Order.find({}).populate('address items.product');

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message || 'Terjadi kesalahan' });
    }
}
