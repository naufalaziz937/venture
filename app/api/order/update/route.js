import { inngest } from "@/config/inngest";
import { getAuth } from "@clerk/nextjs/server";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function PUT(request) {
    try {
        const { userId } = getAuth(request);
        const { orderId, paymentStatus, deliveryStatus } = await request.json();

        // Validate input data
        if (!orderId || !paymentStatus || !deliveryStatus) {
            return NextResponse.json({ success: false, message: "Invalid data" });
        }

        // Check if the user is an admin or seller (Assuming this logic is already set in your authentication middleware)
        const userRole = req.user?.role; // Assuming user role is attached in req.user (admin or seller)
        if (userRole !== 'admin' && userRole !== 'seller') {
            return NextResponse.json({ success: false, message: "Unauthorized to update order status" });
        }

        // Send event to Inngest for order status update
        await inngest.send({
            name: 'order/status.updated',
            data: {
                userId,
                orderId,
                paymentStatus,
                deliveryStatus
            }
        });

        return NextResponse.json({ success: true, message: 'Order status updated' });

    } catch (error) {
        console.error("Error updating order status:", error);
        return NextResponse.json({ success: false, message: "Failed to update order status" });
    }
}
