import connectDB from '@/config/db';
import { validateCheckoutKey } from '@/lib/payment.mjs';
import { requireSeller } from '@/lib/requireSeller';
import Order from '@/models/order';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request, { params }) {
    let reservationClaimed = false;
    let orderId = null;
    let amount = 0;
    const requestKey = request.headers.get('idempotency-key');
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        if (!validateCheckoutKey(requestKey)) return NextResponse.json({ success: false, message: 'A valid Idempotency-Key header is required' }, { status: 400 });
        const { id } = await params;
        orderId = id;
        if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
        const body = await request.json();
        amount = Number(body.amount);
        const reason = String(body.reason || '').trim();
        if (!Number.isInteger(amount) || amount <= 0 || !reason || reason.length > 500) {
            return NextResponse.json({ success: false, message: 'A positive integer amount and reason are required' }, { status: 400 });
        }

        await connectDB();
        const duplicate = await Order.findOne({ _id: id, 'refunds.requestKey': requestKey });
        if (duplicate) {
            const refund = duplicate.refunds.find(item => item.requestKey === requestKey);
            return NextResponse.json({ success: refund.status === 'succeeded', idempotent: true, refund, order: duplicate });
        }
        const claimed = await Order.findOneAndUpdate(
            {
                _id: id,
                paymentType: 'Stripe',
                isPaid: true,
                stripePaymentIntentId: { $ne: null },
                $expr: {
                    $lte: [
                        amount,
                        {
                            $subtract: [
                                {
                                    $cond: [
                                        { $gt: ['$rentalAmount', 0] },
                                        '$rentalAmount',
                                        { $subtract: ['$amount', { $ifNull: ['$depositAmount', 0] }] },
                                    ],
                                },
                                { $add: [{ $ifNull: ['$rentalRefundedAmount', 0] }, { $ifNull: ['$refundReservedAmount', 0] }] },
                            ],
                        },
                    ],
                },
            },
            {
                $inc: { refundReservedAmount: amount },
                $push: { refunds: { amount, reason, status: 'pending', processedBy: userId, requestKey } },
                $set: { refundStatus: 'pending' },
            },
            { new: true, runValidators: true }
        );
        if (!claimed) return NextResponse.json({ success: false, message: 'Order is not refundable or amount exceeds the refundable balance' }, { status: 409 });
        reservationClaimed = true;

        const stripeRefund = await stripe.refunds.create({
            payment_intent: claimed.stripePaymentIntentId,
            amount,
            metadata: { orderId: id, requestKey },
        }, { idempotencyKey: `refund:${id}:${requestKey}` });
        const succeeded = stripeRefund.status === 'succeeded';
        const failed = ['failed', 'canceled'].includes(stripeRefund.status);
        if (!succeeded && !failed) {
            const pendingOrder = await Order.findOneAndUpdate(
                { _id: id, 'refunds.requestKey': requestKey },
                {
                    $set: {
                        refundStatus: 'pending',
                        'refunds.$[refund].status': 'pending',
                        'refunds.$[refund].stripeRefundId': stripeRefund.id,
                    },
                },
                { new: true, arrayFilters: [{ 'refund.requestKey': requestKey }] }
            );
            reservationClaimed = false;
            return NextResponse.json({ success: true, message: 'Refund submitted and awaiting Stripe confirmation', refund: stripeRefund, order: pendingOrder });
        }
        const refundableRentalAmount = claimed.rentalAmount || Math.max(0, claimed.amount - (claimed.depositAmount || 0));
        const newRentalRefundedAmount = claimed.rentalRefundedAmount + (succeeded ? amount : 0);
        const paymentStatus = succeeded
            ? (newRentalRefundedAmount >= refundableRentalAmount ? 'refunded' : 'partially_refunded')
            : claimed.paymentStatus;
        const order = await Order.findOneAndUpdate(
            { _id: id, 'refunds.requestKey': requestKey },
            {
                $inc: {
                    refundReservedAmount: -amount,
                    ...(succeeded && { refundedAmount: amount, rentalRefundedAmount: amount }),
                },
                $set: {
                    refundStatus: succeeded ? 'succeeded' : 'failed',
                    paymentStatus,
                    'refunds.$[refund].status': succeeded ? 'succeeded' : 'failed',
                    'refunds.$[refund].stripeRefundId': stripeRefund.id,
                },
            },
            { new: true, arrayFilters: [{ 'refund.requestKey': requestKey }] }
        );
        reservationClaimed = false;
        return NextResponse.json({ success: succeeded, message: succeeded ? 'Refund completed' : 'Refund failed', refund: stripeRefund, order });
    } catch (error) {
        if (reservationClaimed && orderId) {
            await Order.updateOne(
                { _id: orderId, 'refunds.requestKey': requestKey },
                {
                    $inc: { refundReservedAmount: -amount },
                    $set: { refundStatus: 'failed', 'refunds.$[refund].status': 'failed' },
                },
                { arrayFilters: [{ 'refund.requestKey': requestKey }] }
            ).catch(() => {});
        }
        console.error('Refund failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to process refund' }, { status: 500 });
    }
}
