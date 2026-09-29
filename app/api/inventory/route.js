import connectDB from '@/config/db';
import { requireSeller } from '@/lib/requireSeller';
import { reserveOrderItems } from '@/lib/reservations';
import { validateRentalPeriod } from '@/lib/rentalAvailability.mjs';
import Product from '@/models/product';
import EquipmentUnit from '@/models/equipmentUnit';
import Order from '@/models/order';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { inventoryAnalytics } from '@/lib/inventoryAnalytics.mjs';

export async function GET(request) {
    try {
        const { response } = await requireSeller(request);
        if (response) return response;
        await connectDB();
        const end = request.nextUrl.searchParams.get('end') || new Date().toISOString().slice(0, 10);
        const start = request.nextUrl.searchParams.get('start') || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
        const from = new Date(`${start}T00:00:00Z`), to = new Date(`${end}T00:00:00Z`);
        if (!Number.isFinite(+from) || !Number.isFinite(+to) || to < from || to - from > 365 * 86400000) return NextResponse.json({ message: 'Choose a valid range of up to 366 days' }, { status: 400 });
        const [products, units, orders] = await Promise.all([
            Product.find().select('name stock +reservations +movements').lean(),
            EquipmentUnit.find().lean(),
            Order.find({ $or: [{ rentalStartDate: { $lte: to }, rentalEndDate: { $gte: from } }, { 'returnInspection.inspectedAt': { $gte: from, $lt: new Date(+to + 86400000) } }], orderStatus: { $ne: 'cancelled' }, reservationStatus: { $ne: 'pending' } }).lean(),
        ]);
        return NextResponse.json({ success: true, products, units, start, end, analytics: inventoryAnalytics(products, units, orders, from, to) });
    } catch (error) {
        console.error('Inventory report failed', error);
        return NextResponse.json({ message: 'Unable to load inventory' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId, response } = await requireSeller(request);
        if (response) return response;
        const { unitId, start, end, reason, action = 'schedule', reference } = await request.json();
        if (!mongoose.Types.ObjectId.isValid(unitId)) return NextResponse.json({ message: 'Invalid equipment unit' }, { status: 400 });
        await connectDB();
        const unit = await EquipmentUnit.findById(unitId);
        if (!unit) return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
        if (action === 'complete') {
            const product = await Product.findOneAndUpdate({ _id: unit.product, reservations: { $elemMatch: { orderId: reference, unitId, kind: 'maintenance' } } }, {
                $pull: { reservations: { orderId: reference, unitId, kind: 'maintenance' } },
                $push: { movements: { action: 'maintenance_completed', reference, unitId, actorId: userId, at: new Date() } },
            }, { new: true });
            if (!product) return NextResponse.json({ message: 'Maintenance record is already closed or missing' }, { status: 409 });
            await EquipmentUnit.updateOne({ _id: unitId, maintenanceReference: reference, currentOrder: null }, { $set: { maintenanceReference: null, status: 'available', condition: unit.condition === 'damaged' ? 'good' : unit.condition }, $push: { history: { action: 'maintenance_completed', fromStatus: unit.status, toStatus: 'available', actorId: userId, at: new Date() } } });
            return NextResponse.json({ success: true });
        }
        if (action !== 'schedule') return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
        const period = validateRentalPeriod(start, end);
        if (period.error || typeof reason !== 'string' || !reason.trim() || reason.length > 500) return NextResponse.json({ message: period.error || 'A reason of up to 500 characters is required' }, { status: 400 });
        if (unit.currentOrder || ['lost', 'retired'].includes(unit.status)) return NextResponse.json({ message: 'Return the equipment before scheduling service; lost and retired units cannot be serviced' }, { status: 409 });
        // The per-unit claim prevents concurrent duplicate maintenance scheduling.
        const claimed = await EquipmentUnit.findOneAndUpdate({ _id: unitId, currentOrder: null, maintenanceReference: null }, { $set: { maintenanceReference: `maintenance-${new mongoose.Types.ObjectId()}` } }, { new: true });
        if (!claimed) return NextResponse.json({ message: 'This unit already has a maintenance period' }, { status: 409 });
        try {
            await reserveOrderItems({ orderId: claimed.maintenanceReference, items: [{ product: unit.product, quantity: 1 }], start: period.start, end: period.end, status: 'confirmed', kind: 'maintenance', unitId, reason: reason.trim(), actorId: userId });
        } catch (error) {
            await EquipmentUnit.updateOne({ _id: unitId, maintenanceReference: claimed.maintenanceReference }, { $set: { maintenanceReference: null } });
            throw error;
        }
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error.code === 'INSUFFICIENT_AVAILABILITY' ? 'Maintenance conflicts with reserved capacity' : 'Unable to update maintenance' }, { status: error.code === 'INSUFFICIENT_AVAILABILITY' ? 409 : 500 });
    }
}
