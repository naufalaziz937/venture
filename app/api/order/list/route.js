import connectDB from "@/config/db";
import Order from "@/models/order";
import Product from "@/models/product";
import Address from "@/models/address";
import { serverErrorResponse } from "@/lib/apiError";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureMongoUser } from "@/lib/syncClerkUser";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ success: false, message: "User belum login." }, { status: 401 });
        }

        await connectDB();
        const user = await ensureMongoUser(userId);

        const orders = await Order.find({ userId: user._id, $or: [{ paymentType: 'COD'}, {paymentType: 'Stripe', isPaid: true}]}).populate('address items.product');

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        return serverErrorResponse('GET /api/order/list', error, 'Terjadi kesalahan server.');
    }
}
