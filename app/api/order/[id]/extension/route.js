import connectDB from '@/config/db';
import { validateRentalPeriod } from '@/lib/rentalAvailability.mjs';
import { extendOrderReservations, restoreOrderReservationEnd } from '@/lib/reservations';
import { ensureMongoUser } from '@/lib/syncClerkUser';
import Order from '@/models/order';
import { getAuth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    let updatedProductIds = [];
    let previousEndDate = null;
    let attemptedEndDate = null;
    let orderId = null;
    try {
        const { userId } = getAuth(request);
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
        }
        orderId = id;
        const { rentalEndDate } = await request.json();

        await connectDB();
        const user = await ensureMongoUser(userId);
        const order = await Order.findOne({ _id: id, userId: user._id }).populate('items.product');
        if (!order) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        if (order.reservationStatus !== 'confirmed' || !['reserved', 'active'].includes(order.rentalStatus)) {
            return NextResponse.json({ success: false, message: 'This rental can no longer be extended' }, { status: 409 });
        }

        const originalStart = order.rentalStartDate.toISOString().slice(0, 10);
        const period = validateRentalPeriod(originalStart, rentalEndDate);
        if (period.error) return NextResponse.json({ success: false, message: period.error }, { status: 400 });
        previousEndDate = order.rentalEndDate;
        attemptedEndDate = period.end;
        if (period.end <= previousEndDate) {
            return NextResponse.json({ success: false, message: 'The new end date must be later than the current end date' }, { status: 400 });
        }

        const productIds = order.items.map(item => String(item.product?._id || item.product));
        const additionalDays = Math.round((period.end - previousEndDate) / 86400000);
        const dailySubtotal = order.items.reduce((total, item) => total + Number(item.product.offerPrice) * item.quantity, 0);
        const extensionSubtotal = dailySubtotal * additionalDays;
        const additionalAmount = extensionSubtotal + Math.floor(extensionSubtotal * 0.12);

        try {
            await extendOrderReservations({
                orderId: id,
                productIds,
                rentalStartDate: order.rentalStartDate,
                previousEndDate,
                newEndDate: period.end,
            });
            updatedProductIds = productIds;
        } catch (error) {
            updatedProductIds = error.updatedProductIds || [];
            throw error;
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: id, userId: user._id, rentalEndDate: previousEndDate, reservationStatus: 'confirmed' },
            {
                $set: { rentalEndDate: period.end, outstandingStatus: additionalAmount > 0 ? 'pending' : order.outstandingStatus },
                $inc: { outstandingAmount: additionalAmount },
                $push: {
                    extensionHistory: {
                        previousEndDate,
                        newEndDate: period.end,
                        extendedBy: user._id,
                        additionalAmount,
                        paymentStatus: 'pending',
                    },
                },
            },
            { new: true, runValidators: true }
        );
        if (!updatedOrder) {
            const error = new Error('The rental was changed concurrently; please retry');
            error.code = 'EXTENSION_CONFLICT';
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Rental extended successfully',
            rentalEndDate: updatedOrder.rentalEndDate,
            additionalDays,
            additionalAmount,
            outstandingAmount: updatedOrder.outstandingAmount,
        });
    } catch (error) {
        if (updatedProductIds.length && previousEndDate) {
            await restoreOrderReservationEnd({
                orderId,
                productIds: updatedProductIds,
                previousEndDate,
                attemptedEndDate,
            }).catch(() => {});
        }
        if (error?.code === 'EXTENSION_UNAVAILABLE' || error?.code === 'EXTENSION_CONFLICT') {
            return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        }
        console.error('Rental extension failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to extend rental' }, { status: 500 });
    }
}
