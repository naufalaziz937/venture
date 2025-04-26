// app/api/order/update-order/[id]/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PUT(req, { params }) {
    const { id } = params;

    try {
        await connectDB();

        const formData = await req.formData();
        const status = formData.get("status");
        const beforeImageFile = formData.get("beforeImage");
        const afterImageFile = formData.get("afterImage");

        let beforeImageUrl = null;
        let afterImageUrl = null;

        if (beforeImageFile && beforeImageFile.size > 0) {
            const arrayBuffer = await beforeImageFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const upload = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "rental_orders" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            });
            beforeImageUrl = upload.secure_url;
        }

        if (afterImageFile && afterImageFile.size > 0) {
            const arrayBuffer = await afterImageFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const upload = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "rental_orders" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            });
            afterImageUrl = upload.secure_url;
        }

        // Update order
        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            {
                status,
                ...(beforeImageUrl && { beforeRentalImage: beforeImageUrl }),
                ...(afterImageUrl && { afterRentalImage: afterImageUrl }),
            },
            { new: true }
        );

        if (!updatedOrder) {
            return NextResponse.json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (err) {
        console.error("Update order error:", err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
