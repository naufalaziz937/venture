// app/api/order/update-order/[id]/route.js
import connectDB from "@/config/db";
import Order from "@/models/order";
import { requireSeller } from "@/lib/requireSeller";
import { validateImageFiles } from "@/lib/uploads.mjs";
import {
    canTransitionLifecycle,
    DELIVERY_STATUSES,
    legacyStatusFor,
    ORDER_LIFECYCLE_STATUSES,
    RENTAL_STATUSES,
} from '@/lib/rentalLifecycle.mjs';
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { releaseOrderReservations } from '@/lib/reservations';
import { assignEquipmentUnits, releaseEquipmentUnits } from '@/lib/equipmentUnits';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PUT(req, { params }) {
    try {
        const { userId, response } = await requireSeller(req);
        if (response) return response;
        const { id } = await params;
        await connectDB();

        const formData = await req.formData();
        const nextOrderStatus = formData.get('orderStatus');
        const nextRentalStatus = formData.get('rentalStatus');
        const nextDeliveryStatus = formData.get('deliveryStatus');
        const outstandingResolution = formData.get('outstandingResolution');
        const beforeImageFile = formData.get("beforeImage");
        const afterImageFile = formData.get("afterImage");

        let beforeImageUrl = null;
        let afterImageUrl = null;

        const suppliedImages = [beforeImageFile, afterImageFile].filter(file => file && file.size > 0);
        if (suppliedImages.length > 0) {
            const fileError = validateImageFiles(suppliedImages, { maxCount: 2 });
            if (fileError) return NextResponse.json({ success: false, message: fileError }, { status: 400 });
        }

        const existingOrder = await Order.findById(id);
        if (!existingOrder) {
            return NextResponse.json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
        }
        const proposed = {
            orderStatus: nextOrderStatus || existingOrder.orderStatus,
            rentalStatus: nextRentalStatus || existingOrder.rentalStatus,
            deliveryStatus: nextDeliveryStatus || existingOrder.deliveryStatus,
        };
        if (!ORDER_LIFECYCLE_STATUSES.includes(proposed.orderStatus)
            || !RENTAL_STATUSES.includes(proposed.rentalStatus)
            || !DELIVERY_STATUSES.includes(proposed.deliveryStatus)) {
            return NextResponse.json({ success: false, message: 'Invalid lifecycle status' }, { status: 400 });
        }
        if (outstandingResolution && !['paid', 'waived'].includes(outstandingResolution)) {
            return NextResponse.json({ success: false, message: 'Invalid outstanding balance resolution' }, { status: 400 });
        }
        if (proposed.orderStatus === 'cancelled') {
            proposed.rentalStatus = 'cancelled';
            proposed.deliveryStatus = 'cancelled';
        }
        if (proposed.rentalStatus === 'returned' || proposed.rentalStatus === 'completed') {
            proposed.deliveryStatus = 'returned';
        }
        for (const [kind, field] of [['order', 'orderStatus'], ['rental', 'rentalStatus'], ['delivery', 'deliveryStatus']]) {
            if (!canTransitionLifecycle(kind, existingOrder[field], proposed[field])) {
                return NextResponse.json({ success: false, message: `Invalid ${kind} status transition` }, { status: 409 });
            }
        }
        if (proposed.orderStatus === 'completed' && proposed.rentalStatus !== 'completed') {
            return NextResponse.json({ success: false, message: 'The rental must be completed before the order can be completed' }, { status: 409 });
        }
        if (proposed.orderStatus === 'completed' && existingOrder.outstandingAmount > 0 && !outstandingResolution) {
            return NextResponse.json({ success: false, message: 'Resolve the outstanding balance before completing the order' }, { status: 409 });
        }
        if (proposed.rentalStatus === 'active'
            && (proposed.orderStatus !== 'confirmed' || !['delivered', 'picked_up'].includes(proposed.deliveryStatus))) {
            return NextResponse.json({ success: false, message: 'The order must be confirmed and equipment delivered or picked up before rental activation' }, { status: 409 });
        }

        if (['returned', 'completed'].includes(proposed.rentalStatus)
            && existingOrder.returnInspectionStatus !== 'completed') {
            return NextResponse.json({ success: false, message: 'Complete the return inspection before closing the rental' }, { status: 409 });
        }

        if (beforeImageFile && beforeImageFile.size > 0) {
            const arrayBuffer = await beforeImageFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const upload = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "rental_orders", resource_type: "image" },
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
                    { folder: "rental_orders", resource_type: "image" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            });
            afterImageUrl = upload.secure_url;
        }

        if (proposed.rentalStatus === 'active' && existingOrder.rentalStatus !== 'active') {
            await assignEquipmentUnits(existingOrder, userId);
        }

        // Update order
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: id, status: existingOrder.status },
            {
                ...proposed,
                status: legacyStatusFor(proposed),
                ...(outstandingResolution && {
                    outstandingAmount: 0,
                    outstandingStatus: outstandingResolution,
                }),
                ...(beforeImageUrl && { beforeRentalImage: beforeImageUrl }),
                ...(afterImageUrl && { afterRentalImage: afterImageUrl }),
            },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return NextResponse.json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
        }

        if ((proposed.orderStatus === 'cancelled'
            || ['returned', 'completed', 'cancelled'].includes(proposed.rentalStatus))
            && updatedOrder.reservationStatus !== 'released') {
            await releaseOrderReservations(id);
            if (proposed.rentalStatus === 'cancelled') await releaseEquipmentUnits(id, userId);
            updatedOrder.reservationStatus = 'released';
            await updatedOrder.save();
        }

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (err) {
        console.error("Update order error:", err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
