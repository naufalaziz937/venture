import connectDB from '@/config/db';
import { calculateDeposit, calculateTotals, isVoucherUsable, validateOrderItems } from '@/lib/checkout.mjs';
import Address from '@/models/address';
import Order from '@/models/order';
import Product from '@/models/product';
import Voucher from '@/models/voucher';
import { getAuth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ensureMongoUser } from '@/lib/syncClerkUser';
import { validateRentalPeriod } from '@/lib/rentalAvailability.mjs';
import { releaseOrderReservations, reserveOrderItems } from '@/lib/reservations';
import { calculateLateFeePerDay } from '@/lib/returnFlow.mjs';
import { validateCheckoutKey } from '@/lib/payment.mjs';
import { getActiveSanction } from '@/lib/sanctions';
import { requireRentalVerification } from '@/lib/rentalVerification';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    let order = null;
    let orderId = null;
    let databaseUserId = null;
    let checkoutSession = null;
    const checkoutKey = request.headers.get('idempotency-key');
    try {
        const { userId } = getAuth(request);
        if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (!validateCheckoutKey(checkoutKey)) return NextResponse.json({ success: false, message: 'A valid Idempotency-Key header is required' }, { status: 400 });

        const { address, items, voucherCode, rentalStartDate, rentalEndDate } = await request.json();
        if (!address || !mongoose.Types.ObjectId.isValid(address)) {
            return NextResponse.json({ success: false, message: 'Invalid address' }, { status: 400 });
        }
        const itemError = validateOrderItems(items);
        if (itemError) return NextResponse.json({ success: false, message: itemError }, { status: 400 });
        if (items.some(item => !mongoose.Types.ObjectId.isValid(item.product))) {
            return NextResponse.json({ success: false, message: 'Invalid product ID' }, { status: 400 });
        }
        const period = validateRentalPeriod(rentalStartDate, rentalEndDate);
        if (period.error) return NextResponse.json({ success: false, message: period.error }, { status: 400 });

        await connectDB();
        const user = await ensureMongoUser(userId);
        databaseUserId = user._id;
        const verificationResponse = await requireRentalVerification(databaseUserId);
        if (verificationResponse) return verificationResponse;
        const sanction = await getActiveSanction(databaseUserId);
        if (sanction) return NextResponse.json({ success: false, code: 'ACCOUNT_SANCTIONED', message: `Rental blocked: ${sanction.reason}`, sanction: { reason: sanction.reason, expiresAt: sanction.expiresAt } }, { status: 403 });
        const existingOrder = await Order.findOne({ userId: databaseUserId, checkoutKey });
        if (existingOrder) {
            if (existingOrder.isPaid) return NextResponse.json({ success: true, url: '/order-placed', idempotent: true });
            if (existingOrder.stripeSessionId) {
                const existingSession = await stripe.checkout.sessions.retrieve(existingOrder.stripeSessionId);
                if (existingSession.url) return NextResponse.json({ success: true, url: existingSession.url, idempotent: true });
            }
            return NextResponse.json({ success: false, message: 'Payment session is being prepared; please retry' }, { status: 409 });
        }
        if (!(await Address.exists({ _id: address, userId: databaseUserId }))) {
            return NextResponse.json({ success: false, message: 'Address not found' }, { status: 404 });
        }
        const products = await Product.find({ _id: { $in: items.map(item => item.product) } });
        if (products.length !== items.length) {
            return NextResponse.json({ success: false, message: 'One or more products were not found' }, { status: 404 });
        }

        let voucher = null;
        if (voucherCode) {
            voucher = await Voucher.findOne({ code: voucherCode });
            if (!isVoucherUsable(voucher)) {
                return NextResponse.json({ success: false, message: 'Voucher is expired, exhausted, or invalid' }, { status: 400 });
            }
        }
        const totals = calculateTotals(products, items, voucher, period.durationDays);
        const depositAmount = calculateDeposit(products, items);
        if (totals.total <= 0) return NextResponse.json({ success: false, message: 'Order total must be positive' }, { status: 400 });

        orderId = new mongoose.Types.ObjectId();
        const reservationExpiresAt = new Date(Date.now() + 31 * 60 * 1000);
        await reserveOrderItems({
            orderId,
            items,
            start: period.start,
            end: period.end,
            status: 'pending',
            expiresAt: reservationExpiresAt,
        });
        order = await Order.create({
            _id: orderId,
            userId: databaseUserId,
            address,
            items,
            amount: totals.total + depositAmount,
            rentalAmount: totals.total,
            depositAmount,
            depositStatus: depositAmount > 0 ? 'pending' : 'not_required',
            date: Date.now(),
            paymentType: 'Stripe',
            voucherCode: voucher?.code || null,
            discountAmount: totals.discount,
            rentalStartDate: period.start,
            rentalEndDate: period.end,
            reservationStatus: 'pending',
            orderStatus: 'placed',
            rentalStatus: 'reserved',
            deliveryStatus: 'pending',
            lateFeePerDay: calculateLateFeePerDay(products, items),
            checkoutKey,
        });

        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: 'idr',
                    product_data: { name: `Venture rental order ${order._id}` },
                    unit_amount: totals.total + depositAmount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            expires_at: Math.floor(reservationExpiresAt.getTime() / 1000),
            success_url: `${request.nextUrl.origin}/order-placed`,
            cancel_url: `${request.nextUrl.origin}/cart`,
            metadata: { orderId: order._id.toString(), userId: databaseUserId },
        }, { idempotencyKey: `checkout:${userId}:${checkoutKey}` });
        checkoutSession = session;
        await Order.findByIdAndUpdate(order._id, { $set: { stripeSessionId: session.id } });
        return NextResponse.json({ success: true, url: session.url });
    } catch (error) {
        if (checkoutSession && order?._id) {
            await Order.findByIdAndUpdate(order._id, { $set: { stripeSessionId: checkoutSession.id } }).catch(() => {});
        } else {
            if (order?._id) await Order.findByIdAndDelete(order._id).catch(() => {});
            if (orderId) await releaseOrderReservations(orderId).catch(() => {});
        }
        console.error('Stripe checkout failed:', error);
        if (error?.code === 'INSUFFICIENT_AVAILABILITY') {
            return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        }
        if (error?.code === 11000 && databaseUserId && checkoutKey) {
            const existingOrder = await Order.findOne({ userId: databaseUserId, checkoutKey }).catch(() => null);
            if (existingOrder?.stripeSessionId) {
                const existingSession = await stripe.checkout.sessions.retrieve(existingOrder.stripeSessionId).catch(() => null);
                if (existingSession?.url) return NextResponse.json({ success: true, url: existingSession.url, idempotent: true });
            }
        }
        return NextResponse.json({ success: false, message: 'Failed to start payment' }, { status: 500 });
    }
}
