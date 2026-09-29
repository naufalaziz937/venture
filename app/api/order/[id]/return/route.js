import connectDB from '@/config/db';
import { legacyStatusFor } from '@/lib/rentalLifecycle.mjs';
import { ensureMongoUser } from '@/lib/syncClerkUser';
import Order from '@/models/order';
import { getAuth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { userId } = getAuth(request);
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
        const { notes = '' } = await request.json();
        if (typeof notes !== 'string' || notes.length > 1000) {
            return NextResponse.json({ success: false, message: 'Return notes cannot exceed 1000 characters' }, { status: 400 });
        }

        await connectDB();
        const user = await ensureMongoUser(userId);
        const existing = await Order.findOne({ _id: id, userId: user._id });
        if (!existing) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        if (existing.rentalStatus === 'return_pending') {
            return NextResponse.json({ success: true, message: 'Return already requested', order: existing });
        }
        if (existing.rentalStatus !== 'active' || !['delivered', 'picked_up'].includes(existing.deliveryStatus)) {
            return NextResponse.json({ success: false, message: 'Only active delivered or picked-up rentals can be returned' }, { status: 409 });
        }

        const lifecycle = {
            orderStatus: existing.orderStatus,
            rentalStatus: 'return_pending',
            deliveryStatus: 'return_in_transit',
        };
        const order = await Order.findOneAndUpdate(
            { _id: id, userId: user._id, rentalStatus: 'active', deliveryStatus: existing.deliveryStatus },
            {
                $set: {
                    ...lifecycle,
                    status: legacyStatusFor(lifecycle),
                    returnRequest: { requestedAt: new Date(), notes: notes.trim() },
                },
            },
            { new: true, runValidators: true }
        );
        if (!order) return NextResponse.json({ success: false, message: 'Rental status changed; please refresh' }, { status: 409 });
        return NextResponse.json({ success: true, message: 'Return requested', order });
    } catch (error) {
        console.error('Return request failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to request return' }, { status: 500 });
    }
}
