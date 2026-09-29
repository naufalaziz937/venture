import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import { releaseOrderReservations } from '@/lib/reservations';
import { calculateReturnCharges, RETURN_CONDITIONS } from '@/lib/returnFlow.mjs';
import { validateImageFiles } from '@/lib/uploads.mjs';
import Order from '@/models/order';
import Product from '@/models/product';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { completeEquipmentUnitReturn } from '@/lib/equipmentUnits';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request, { params }) {
    let claimedOrder = null;
    let finalized = false;
    const reducedStock = [];
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });

        const formData = await request.formData();
        let submittedItems;
        try {
            submittedItems = JSON.parse(formData.get('items') || '[]');
        } catch {
            return NextResponse.json({ success: false, message: 'Invalid inspection items' }, { status: 400 });
        }
        const notes = String(formData.get('notes') || '').trim();
        if (notes.length > 2000) return NextResponse.json({ success: false, message: 'Inspection notes cannot exceed 2000 characters' }, { status: 400 });
        const receivedAt = formData.get('receivedAt') ? new Date(`${formData.get('receivedAt')}T00:00:00.000Z`) : new Date();
        if (Number.isNaN(receivedAt.getTime()) || receivedAt > new Date()) {
            return NextResponse.json({ success: false, message: 'Received date is invalid' }, { status: 400 });
        }
        const files = formData.getAll('evidenceImages').filter(file => file?.size > 0);
        if (files.length) {
            const fileError = validateImageFiles(files, { maxCount: 4 });
            if (fileError) return NextResponse.json({ success: false, message: fileError }, { status: 400 });
        }

        await connectDB();
        const existing = await Order.findById(id);
        if (!existing) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        if (existing.returnInspectionStatus === 'completed') {
            await completeEquipmentUnitReturn(existing, existing.returnInspection.items, userId);
            if (existing.reservationStatus !== 'released') {
                await releaseOrderReservations(id);
                existing.reservationStatus = 'released';
                await existing.save();
            }
            return NextResponse.json({ success: true, message: 'Return was already inspected', order: existing });
        }
        if (!['active', 'return_pending'].includes(existing.rentalStatus)) {
            return NextResponse.json({ success: false, message: 'This rental is not awaiting return inspection' }, { status: 409 });
        }
        if (!Array.isArray(submittedItems) || submittedItems.length !== existing.items.length) {
            return NextResponse.json({ success: false, message: 'Every rented product must be inspected' }, { status: 400 });
        }
        const orderItems = new Map(existing.items.map(item => [String(item.product), item]));
        const inspectedItems = [];
        const seen = new Set();
        for (const item of submittedItems) {
            const productId = String(item?.product || '');
            const orderItem = orderItems.get(productId);
            if (!orderItem || seen.has(productId) || !RETURN_CONDITIONS.includes(item.condition)) {
                return NextResponse.json({ success: false, message: 'Inspection items do not match the order' }, { status: 400 });
            }
            const charge = Number(item.charge || 0);
            if (!Number.isFinite(charge) || charge < 0 || (item.condition === 'normal' && charge !== 0)) {
                return NextResponse.json({ success: false, message: 'Inspection charge is invalid' }, { status: 400 });
            }
            const itemNotes = String(item.notes || '').trim();
            if (itemNotes.length > 1000) return NextResponse.json({ success: false, message: 'Item notes cannot exceed 1000 characters' }, { status: 400 });
            seen.add(productId);
            inspectedItems.push({ product: productId, quantity: orderItem.quantity, condition: item.condition, notes: itemNotes, charge });
        }

        claimedOrder = await Order.findOneAndUpdate(
            {
                _id: id,
                rentalStatus: { $in: ['active', 'return_pending'] },
                $or: [{ returnInspectionStatus: 'none' }, { returnInspectionStatus: { $exists: false } }],
            },
            { $set: { returnInspectionStatus: 'processing' } },
            { new: true }
        );
        if (!claimedOrder) return NextResponse.json({ success: false, message: 'Inspection is already being processed' }, { status: 409 });

        const evidenceImages = await Promise.all(files.map(async file => {
            const buffer = Buffer.from(await file.arrayBuffer());
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'return_inspections', resource_type: 'image' },
                    (error, result) => error ? reject(error) : resolve(result.secure_url)
                );
                stream.end(buffer);
            });
        }));

        for (const item of inspectedItems.filter(item => item.condition === 'lost')) {
            const product = await Product.findOneAndUpdate(
                { _id: item.product, $expr: { $gte: [{ $ifNull: ['$stock', 1] }, item.quantity] } },
                { $inc: { stock: -item.quantity } },
                { new: true }
            );
            if (!product) {
                const error = new Error('Lost quantity exceeds recorded product stock');
                error.code = 'STOCK_CONFLICT';
                throw error;
            }
            reducedStock.push({ product: item.product, quantity: item.quantity });
        }

        const charges = calculateReturnCharges({
            rentalEndDate: claimedOrder.rentalEndDate,
            receivedAt,
            lateFeePerDay: claimedOrder.lateFeePerDay,
            inspectedItems,
        });
        const inspectedAt = new Date();
        const order = await Order.findOneAndUpdate(
            { _id: id, returnInspectionStatus: 'processing' },
            {
                $set: {
                    returnInspectionStatus: 'completed',
                    rentalStatus: 'returned',
                    deliveryStatus: 'returned',
                    status: 'Dikembalikan ke Venture',
                    returnInspection: {
                        receivedAt,
                        inspectedAt,
                        inspectedBy: userId,
                        notes,
                        evidenceImages,
                        items: inspectedItems,
                        ...charges,
                    },
                    ...(charges.totalAdditionalCharge > 0 && { outstandingStatus: 'pending' }),
                },
                $inc: { outstandingAmount: charges.totalAdditionalCharge },
            },
            { new: true, runValidators: true }
        );
        if (!order) throw new Error('Inspection finalization failed');
        finalized = true;

        await releaseOrderReservations(id);
        await completeEquipmentUnitReturn(order, inspectedItems, userId);
        order.reservationStatus = 'released';
        await order.save();
        return NextResponse.json({ success: true, message: 'Return inspection completed', order, charges });
    } catch (error) {
        if (!finalized) for (const item of reducedStock) {
            await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }).catch(() => {});
        }
        if (!finalized && claimedOrder?._id) {
            await Order.updateOne(
                { _id: claimedOrder._id, returnInspectionStatus: 'processing' },
                { $set: { returnInspectionStatus: 'none' } }
            ).catch(() => {});
        }
        if (error?.code === 'STOCK_CONFLICT') {
            return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        }
        console.error('Return inspection failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to complete return inspection' }, { status: 500 });
    }
}
