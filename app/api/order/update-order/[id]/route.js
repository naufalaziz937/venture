// app/api/order/update-status/[id]/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
    const { id } = params;

    try {
        await connectDB();

        // Ambil data yang dikirimkan dari frontend
        const { paymentStatus, status } = await req.json();

        // Update order dengan status dan paymentStatus
        const updated = await Order.findByIdAndUpdate(
            id,
            { paymentStatus, status },
            { new: true } // Pastikan data terbaru dikembalikan
        );

        if (!updated) {
            return NextResponse.json(
                { success: false, message: "Order tidak ditemukan" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Status pesanan berhasil diperbarui",
            order: updated,
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, message: err.message },
            { status: 500 }
        );
    }
}
