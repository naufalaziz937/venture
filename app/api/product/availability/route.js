import connectDB from '@/config/db';
import { availableStock, validateRentalPeriod } from '@/lib/rentalAvailability.mjs';
import Product from '@/models/product';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { items, rentalStartDate, rentalEndDate } = await request.json();
        const period = validateRentalPeriod(rentalStartDate, rentalEndDate);
        if (period.error) return NextResponse.json({ success: false, message: period.error }, { status: 400 });
        if (!Array.isArray(items) || items.length === 0
            || items.some(item => !mongoose.Types.ObjectId.isValid(item?.product) || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
            return NextResponse.json({ success: false, message: 'Valid products and quantities are required' }, { status: 400 });
        }

        await connectDB();
        const products = await Product.find({ _id: { $in: items.map(item => item.product) } })
            .select('name stock +reservations')
            .lean();
        if (products.length !== new Set(items.map(item => item.product)).size) {
            return NextResponse.json({ success: false, message: 'One or more products were not found' }, { status: 404 });
        }

        const productById = new Map(products.map(product => [String(product._id), product]));
        const availability = items.map(item => {
            const product = productById.get(item.product);
            const availableQuantity = availableStock(product, period.start, period.end);
            return {
                product: item.product,
                name: product.name,
                requestedQuantity: item.quantity,
                availableQuantity,
                available: availableQuantity >= item.quantity,
            };
        });
        return NextResponse.json({
            success: true,
            available: availability.every(item => item.available),
            durationDays: period.durationDays,
            availability,
        });
    } catch (error) {
        console.error('Availability check failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to check availability' }, { status: 500 });
    }
}
