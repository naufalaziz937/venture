import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import Order from '@/models/order';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request, { params }) {
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
        const { action, withheldAmount: rawWithheldAmount = 0 } = await request.json();
        const withheldAmount = Number(rawWithheldAmount);
        if (!['collect', 'settle'].includes(action) || !Number.isInteger(withheldAmount) || withheldAmount < 0) {
            return NextResponse.json({ success: false, message: 'Invalid deposit action' }, { status: 400 });
        }

        await connectDB();
        const order = await Order.findById(id);
        if (!order || order.depositAmount <= 0) return NextResponse.json({ success: false, message: 'Order has no security deposit' }, { status: 404 });

        if (action === 'collect') {
            if (order.paymentType !== 'COD' || order.depositStatus !== 'pending') {
                return NextResponse.json({ success: false, message: 'Only pending COD deposits can be collected manually' }, { status: 409 });
            }
            const updated = await Order.findOneAndUpdate(
                { _id: id, depositStatus: 'pending' },
                { $set: { depositStatus: 'held' } },
                { new: true }
            );
            return NextResponse.json({ success: true, message: 'Deposit marked as collected', order: updated });
        }

        if (order.depositStatus !== 'held' || order.returnInspectionStatus !== 'completed') {
            return NextResponse.json({ success: false, message: 'Deposit can be settled only after return inspection' }, { status: 409 });
        }
        if (withheldAmount > order.depositAmount || withheldAmount > order.outstandingAmount) {
            return NextResponse.json({ success: false, message: 'Withheld amount exceeds deposit or outstanding charges' }, { status: 400 });
        }
        const releaseAmount = order.depositAmount - withheldAmount;
        let stripeRefund = null;
        const depositRequestKey = `deposit-release-${id}`;
        if (order.paymentType === 'Stripe' && releaseAmount > 0) {
            if (!order.stripePaymentIntentId) return NextResponse.json({ success: false, message: 'Stripe payment reference is missing' }, { status: 409 });
            stripeRefund = await stripe.refunds.create({
                payment_intent: order.stripePaymentIntentId,
                amount: releaseAmount,
                metadata: { orderId: id, type: 'deposit_release', requestKey: depositRequestKey },
            }, { idempotencyKey: `deposit-release:${id}` });
            if (!['succeeded', 'pending', 'requires_action'].includes(stripeRefund.status)) {
                return NextResponse.json({ success: false, message: 'Stripe deposit refund failed' }, { status: 409 });
            }
            if (stripeRefund.status !== 'succeeded') {
                const pendingOrder = await Order.findOneAndUpdate(
                    { _id: id, depositStatus: 'held', 'refunds.requestKey': { $ne: depositRequestKey } },
                    {
                        $set: { depositStatus: 'release_pending', depositPendingWithheldAmount: withheldAmount, refundStatus: 'pending' },
                        $inc: { refundReservedAmount: releaseAmount },
                        $push: {
                            refunds: {
                                amount: releaseAmount,
                                reason: 'Security deposit release',
                                status: 'pending',
                                stripeRefundId: stripeRefund.id,
                                processedBy: userId,
                                requestKey: depositRequestKey,
                            },
                        },
                    },
                    { new: true, runValidators: true }
                );
                return NextResponse.json({ success: true, message: 'Deposit release is awaiting Stripe confirmation', order: pendingOrder || await Order.findById(id) });
            }
        }

        const newOutstandingAmount = order.outstandingAmount - withheldAmount;
        const depositStatus = withheldAmount === 0 ? 'released' : (releaseAmount === 0 ? 'withheld' : 'partially_withheld');
        const update = {
            depositStatus,
            depositWithheldAmount: withheldAmount,
            outstandingAmount: newOutstandingAmount,
            ...(newOutstandingAmount === 0 && { outstandingStatus: 'paid' }),
            ...(releaseAmount > 0 && { refundStatus: 'succeeded' }),
        };
        const updated = await Order.findOneAndUpdate(
            { _id: id, depositStatus: 'held' },
            {
                $set: update,
                ...(releaseAmount > 0 && {
                    $inc: { refundedAmount: releaseAmount, depositRefundedAmount: releaseAmount },
                    $push: {
                        refunds: {
                            amount: releaseAmount,
                            reason: 'Security deposit release',
                            status: 'succeeded',
                            stripeRefundId: stripeRefund?.id || null,
                            processedBy: userId,
                            requestKey: depositRequestKey,
                        },
                    },
                }),
            },
            { new: true, runValidators: true }
        );
        if (!updated) return NextResponse.json({ success: true, message: 'Deposit was already settled', order: await Order.findById(id), idempotent: true });
        return NextResponse.json({ success: true, message: 'Deposit settled', releasedAmount: releaseAmount, withheldAmount, order: updated });
    } catch (error) {
        console.error('Deposit operation failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to process security deposit' }, { status: 500 });
    }
}
