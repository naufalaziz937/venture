import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import EquipmentUnit from '@/models/equipmentUnit';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid unit ID' }, { status: 400 });
        const { status, condition, notes = '' } = await request.json();
        if (!['available', 'damaged', 'lost', 'retired'].includes(status) || !['excellent', 'good', 'fair', 'damaged', 'lost'].includes(condition)) {
            return NextResponse.json({ success: false, message: 'Invalid unit state' }, { status: 400 });
        }
        await connectDB();
        const existing = await EquipmentUnit.findById(id);
        if (!existing) return NextResponse.json({ success: false, message: 'Unit not found' }, { status: 404 });
        if (existing.currentOrder) return NextResponse.json({ success: false, message: 'Assigned units cannot be manually changed' }, { status: 409 });
        const unit = await EquipmentUnit.findByIdAndUpdate(id, {
            $set: { status, condition, notes: String(notes).slice(0, 1000) },
            $push: { history: { action: 'manual_update', fromStatus: existing.status, toStatus: status, notes: String(notes).slice(0, 1000), actorId: userId } },
        }, { new: true, runValidators: true });
        return NextResponse.json({ success: true, unit });
    } catch {
        return NextResponse.json({ success: false, message: 'Failed to update equipment unit' }, { status: 500 });
    }
}
