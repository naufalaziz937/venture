import connectDB from '@/config/db';
import Order from '@/models/order';
import User from '@/models/user';
import Voucher from '@/models/voucher';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { confirmOrderReservations, releaseOrderReservations } from '@/lib/reservations';
import PaymentEvent from '@/models/paymentEvent';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            await request.text(),
            request.headers.get('stripe-signature'),
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Invalid webhook signature' }, { status: 400 });
    }

    let ledgerClaimed = false;
    try {
        await connectDB();
        try {
            await PaymentEvent.create({ eventId: event.id, type: event.type, status: 'processing' });
            ledgerClaimed = true;
        } catch (error) {
            if (error?.code !== 11000) throw error;
            const existingEvent = await PaymentEvent.findOne({ eventId: event.id });
            const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
            if (existingEvent?.status === 'failed' || (existingEvent?.status === 'processing' && existingEvent.updatedAt < staleBefore)) {
                const reclaimed = await PaymentEvent.findOneAndUpdate(
                    {
                        eventId: event.id,
                        $or: [
                            { status: 'failed' },
                            { status: 'processing', updatedAt: { $lt: staleBefore } },
                        ],
                    },
                    { $set: { status: 'processing', error: null }, $inc: { attempts: 1 } },
                    { new: true }
                );
                ledgerClaimed = Boolean(reclaimed);
            }
            if (!ledgerClaimed) return NextResponse.json({ received: true, duplicate: true });
        }

        if (!['payment_intent.succeeded', 'payment_intent.canceled', 'checkout.session.expired', 'refund.updated'].includes(event.type)) {
            await PaymentEvent.updateOne({ eventId: event.id }, { $set: { status: 'completed', processedAt: new Date() } });
            return NextResponse.json({ received: true, ignored: true });
        }

        if (event.type === 'refund.updated') {
            const refund = event.data.object;
            const { orderId, requestKey } = refund.metadata || {};
            if (!orderId || !requestKey) throw new Error('Refund metadata is missing');
            const existingOrder = await Order.findOne({ _id: orderId, 'refunds.requestKey': requestKey });
            if (!existingOrder) throw new Error('Refund order was not found');
            const existingRefund = existingOrder.refunds.find(item => item.requestKey === requestKey);
            if (existingRefund.status === 'pending' && refund.status === 'succeeded') {
                const isDepositRelease = requestKey.startsWith('deposit-release-');
                const updated = await Order.findOneAndUpdate(
                    { _id: orderId, refunds: { $elemMatch: { requestKey, status: 'pending' } } },
                    {
                        $inc: {
                            refundedAmount: refund.amount,
                            refundReservedAmount: -refund.amount,
                            ...(isDepositRelease ? { depositRefundedAmount: refund.amount } : { rentalRefundedAmount: refund.amount }),
                        },
                        $set: {
                            refundStatus: 'succeeded',
                            'refunds.$[item].status': 'succeeded',
                            'refunds.$[item].stripeRefundId': refund.id,
                        },
                    },
                    { new: true, arrayFilters: [{ 'item.requestKey': requestKey }] }
                );
                if (updated) {
                    if (!isDepositRelease) {
                        const refundableRentalAmount = updated.rentalAmount || Math.max(0, updated.amount - (updated.depositAmount || 0));
                        updated.paymentStatus = updated.rentalRefundedAmount >= refundableRentalAmount ? 'refunded' : 'partially_refunded';
                    }
                    if (isDepositRelease) {
                        const withheldAmount = updated.depositPendingWithheldAmount || 0;
                        const releaseAmount = refund.amount;
                        updated.depositStatus = withheldAmount === 0 ? 'released' : (releaseAmount === 0 ? 'withheld' : 'partially_withheld');
                        updated.depositWithheldAmount = withheldAmount;
                        updated.depositPendingWithheldAmount = 0;
                        updated.outstandingAmount = Math.max(0, updated.outstandingAmount - withheldAmount);
                        if (updated.outstandingAmount === 0) updated.outstandingStatus = 'paid';
                    }
                    await updated.save();
                }
            } else if (existingRefund.status === 'pending' && ['failed', 'canceled'].includes(refund.status)) {
                const failedUpdate = {
                    refundStatus: 'failed',
                    'refunds.$[item].status': 'failed',
                    'refunds.$[item].stripeRefundId': refund.id,
                };
                if (requestKey.startsWith('deposit-release-')) {
                    failedUpdate.depositStatus = 'held';
                    failedUpdate.depositPendingWithheldAmount = 0;
                }
                await Order.findOneAndUpdate(
                    { _id: orderId, refunds: { $elemMatch: { requestKey, status: 'pending' } } },
                    {
                        $inc: { refundReservedAmount: -refund.amount },
                        $set: failedUpdate,
                    },
                    { arrayFilters: [{ 'item.requestKey': requestKey }] }
                );
            }
            await PaymentEvent.updateOne({ eventId: event.id }, { $set: { status: 'completed', processedAt: new Date() } });
            return NextResponse.json({ received: true });
        }

        const session = event.type === 'checkout.session.expired'
            ? event.data.object
            : (await stripe.checkout.sessions.list({ payment_intent: event.data.object.id, limit: 1 })).data[0];
        if (!session?.metadata?.orderId || !session.metadata.userId) {
            return NextResponse.json({ success: false, message: 'Missing checkout metadata' }, { status: 400 });
        }

        const { orderId, userId } = session.metadata;

        if (event.type === 'payment_intent.succeeded') {
            const existingOrder = await Order.findById(orderId);
            if (!existingOrder) throw new Error('Checkout order not found');
            if (session.currency !== 'idr' || Number(session.amount_total) !== Number(existingOrder.amount)) {
                const error = new Error('Stripe amount or currency does not match the order');
                error.code = 'PAYMENT_AMOUNT_MISMATCH';
                throw error;
            }
            const order = await Order.findOneAndUpdate(
                { _id: orderId, isPaid: false },
                {
                    $set: {
                        isPaid: true,
                        paymentStatus: 'selesai',
                        reservationStatus: 'confirmed',
                        orderStatus: 'confirmed',
                        stripeSessionId: session.id,
                        stripePaymentIntentId: String(session.payment_intent || event.data.object.id),
                        depositStatus: existingOrder.depositAmount > 0 ? 'held' : 'not_required',
                    },
                },
                { new: true }
            );
            if (order) {
                await confirmOrderReservations(orderId);
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        cartItems: {},
                        cartRentalPeriod: { rentalStartDate: null, rentalEndDate: null },
                    },
                });
                if (order.voucherCode) await Voucher.updateOne({ code: order.voucherCode }, { $inc: { usedCount: 1 } });
            }
        } else {
            const order = await Order.findOneAndUpdate(
                { _id: orderId, isPaid: false },
                {
                    $set: {
                        paymentStatus: 'batal',
                        status: 'Dibatalkan',
                        reservationStatus: 'released',
                        orderStatus: 'cancelled',
                        rentalStatus: 'cancelled',
                        deliveryStatus: 'cancelled',
                    },
                },
                { new: true }
            );
            if (order) await releaseOrderReservations(orderId);
        }

        await PaymentEvent.updateOne(
            { eventId: event.id },
            { $set: { status: 'completed', processedAt: new Date(), error: null } }
        );
        return NextResponse.json({ received: true });
    } catch (error) {
        if (ledgerClaimed) {
            await PaymentEvent.updateOne(
                { eventId: event.id, status: 'processing' },
                { $set: { status: 'failed', error: String(error.message || 'Unknown error').slice(0, 500) } }
            ).catch(() => {});
        }
        console.error('Stripe webhook processing failed:', error);
        return NextResponse.json({ success: false, message: 'Webhook processing failed' }, { status: 500 });
    }
}
