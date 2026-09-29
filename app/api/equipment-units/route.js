import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import EquipmentUnit from '@/models/equipmentUnit';
import Product from '@/models/product';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { response } = await requireSeller(request);
    if (response) return response;
    await connectDB();
    const product = request.nextUrl.searchParams.get('product');
    const query = product && mongoose.Types.ObjectId.isValid(product) ? { product } : {};
    const units = await EquipmentUnit.find(query).populate('product', 'name stock').sort({ product: 1, serialNumber: 1 }).lean();
    return NextResponse.json({ success: true, units });
}

export async function POST(request) {
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        const body = await request.json();
        const product = String(body.product || '');
        const serialNumber = String(body.serialNumber || '').trim();
        const condition = String(body.condition || 'good');
        const notes = String(body.notes || '').trim();
        if (!mongoose.Types.ObjectId.isValid(product) || !serialNumber || serialNumber.length > 100 || notes.length > 1000) {
            return NextResponse.json({ success: false, message: 'Valid product and serial number are required' }, { status: 400 });
        }
        if (!['excellent', 'good', 'fair', 'damaged', 'lost'].includes(condition)) return NextResponse.json({ success: false, message: 'Invalid condition' }, { status: 400 });
        await connectDB();
        if (!(await Product.exists({ _id: product }))) return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        const status = condition === 'damaged' ? 'damaged' : condition === 'lost' ? 'lost' : 'available';
        const unit = await EquipmentUnit.create({
            product, serialNumber, condition, status, notes,
            history: [{ action: 'created', toStatus: status, notes, actorId: userId }],
        });
        return NextResponse.json({ success: true, unit }, { status: 201 });
    } catch (error) {
        if (error?.code === 11000) return NextResponse.json({ success: false, message: 'Serial number already exists' }, { status: 409 });
        return NextResponse.json({ success: false, message: 'Failed to create equipment unit' }, { status: 500 });
    }
}
