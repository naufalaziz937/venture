import connectDB from '@/config/db';
import { calculateDeposit, calculateTotals, isVoucherUsable, validateOrderItems } from '@/lib/checkout.mjs';
import Address from '@/models/address';
import Order from '@/models/order';
import Product from '@/models/product';
import User from '@/models/user';
import Voucher from '@/models/voucher';
import { getAuth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { ensureMongoUser } from '@/lib/syncClerkUser';
import { validateRentalPeriod } from '@/lib/rentalAvailability.mjs';
import { releaseOrderReservations, reserveOrderItems } from '@/lib/reservations';
import { calculateLateFeePerDay } from '@/lib/returnFlow.mjs';
import { validateCheckoutKey } from '@/lib/payment.mjs';
import { getActiveSanction } from '@/lib/sanctions';
import { requireRentalVerification } from '@/lib/rentalVerification';

export async function POST(request) {
    let orderId = null;
    let order = null;
    let databaseUserId = null;
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
            return NextResponse.json({ success: true, message: 'Order already placed', orderId: existingOrder._id, idempotent: true }, { status: 200 });
        }
        const ownedAddress = await Address.findOne({ _id: address, userId: databaseUserId });
        if (!ownedAddress) return NextResponse.json({ success: false, message: 'Address not found' }, { status: 404 });

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
        orderId = new mongoose.Types.ObjectId();
        await reserveOrderItems({
            orderId,
            items,
            start: period.start,
            end: period.end,
            status: 'confirmed',
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
            paymentType: 'COD',
            voucherCode: voucher?.code || null,
            discountAmount: totals.discount,
            rentalStartDate: period.start,
            rentalEndDate: period.end,
            reservationStatus: 'confirmed',
            orderStatus: 'placed',
            rentalStatus: 'reserved',
            deliveryStatus: 'pending',
            lateFeePerDay: calculateLateFeePerDay(products, items),
            checkoutKey,
        });

        if (voucher) await Voucher.updateOne({ _id: voucher._id }, { $inc: { usedCount: 1 } });
        await User.findByIdAndUpdate(databaseUserId, {
            $set: {
                cartItems: {},
                cartRentalPeriod: { rentalStartDate: null, rentalEndDate: null },
            },
        });

        return NextResponse.json({ success: true, message: 'Order Placed', orderId: order._id }, { status: 201 });
    } catch (error) {
        if (order?._id) await Order.findByIdAndDelete(order._id).catch(() => {});
        if (orderId) await releaseOrderReservations(orderId).catch(() => {});
        console.error('Create order failed:', error);
        if (error?.code === 'INSUFFICIENT_AVAILABILITY') {
            return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        }
        if (error?.code === 11000 && databaseUserId && checkoutKey) {
            const existingOrder = await Order.findOne({ userId: databaseUserId, checkoutKey }).catch(() => null);
            if (existingOrder) return NextResponse.json({ success: true, message: 'Order already placed', orderId: existingOrder._id, idempotent: true });
        }
        return NextResponse.json({ success: false, message: 'Failed to create order' }, { status: 500 });
    }
}
