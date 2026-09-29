import EquipmentUnit from '@/models/equipmentUnit';
import Order from '@/models/order';
import Product from '@/models/product';

export async function assignEquipmentUnits(order, actorId) {
    const assignments = [];
    try {
        for (const item of order.items) {
            const existingIds = item.equipmentUnits?.map(String) || [];
            const needed = item.quantity - existingIds.length;
            if (needed <= 0) continue;
            const trackedCount = await EquipmentUnit.countDocuments({ product: String(item.product) });
            // Products can be migrated gradually. Once any units are tracked, all
            // rented quantity for that product must be backed by serialized units.
            if (trackedCount === 0) continue;
            const candidates = await EquipmentUnit.find({ product: String(item.product), status: 'available', currentOrder: null, maintenanceReference: null }).limit(needed);
            if (candidates.length < needed) {
                const error = new Error(`Not enough serialized units for product ${item.product}`);
                error.code = 'UNIT_SHORTAGE';
                throw error;
            }
            for (const candidate of candidates) {
                const claimed = await EquipmentUnit.findOneAndUpdate(
                    { _id: candidate._id, status: 'available', currentOrder: null, maintenanceReference: null },
                    {
                        $set: { status: 'rented', currentOrder: String(order._id) },
                        $push: { history: { action: 'rental_started', fromStatus: 'available', toStatus: 'rented', orderId: String(order._id), actorId } },
                    }, { new: true }
                );
                if (!claimed) {
                    const error = new Error('A serialized unit was assigned concurrently');
                    error.code = 'UNIT_SHORTAGE';
                    throw error;
                }
                assignments.push({ product: String(item.product), unitId: String(claimed._id) });
            }
        }
        for (const item of order.items) {
            const ids = assignments.filter(value => value.product === String(item.product)).map(value => value.unitId);
            if (ids.length) item.equipmentUnits.push(...ids);
        }
        await order.save();
        for (const assignment of assignments) await Product.updateOne({ _id: assignment.product }, { $push: { movements: { action: 'unit_dispatched', unitId: assignment.unitId, reference: String(order._id), actorId, at: new Date() } } });
        return order;
    } catch (error) {
        if (assignments.length) {
            const ids = assignments.map(value => value.unitId);
            await EquipmentUnit.updateMany({ _id: { $in: ids }, currentOrder: String(order._id) }, { $set: { status: 'available', currentOrder: null } });
        }
        throw error;
    }
}

export async function completeEquipmentUnitReturn(order, inspectedItems, actorId) {
    for (const inspected of inspectedItems) {
        const orderItem = order.items.find(item => String(item.product) === String(inspected.product));
        const ids = orderItem?.equipmentUnits || [];
        const status = inspected.condition === 'lost' ? 'lost' : inspected.condition === 'damaged' ? 'damaged' : 'available';
        const condition = inspected.condition === 'normal' ? 'good' : inspected.condition;
        if (status === 'damaged') {
            for (const unitId of ids) {
                if (!(await EquipmentUnit.exists({ _id: unitId, currentOrder: String(order._id) }))) continue;
                const reference = `damage-${order._id}-${unitId}`;
                const start = new Date(); start.setUTCHours(0, 0, 0, 0);
                const end = new Date('9999-12-31T00:00:00Z');
                await Product.updateOne({ _id: inspected.product, 'reservations.orderId': { $ne: reference } }, { $push: {
                    reservations: { orderId: reference, kind: 'maintenance', unitId: String(unitId), reason: 'Damaged on return; awaiting repair', quantity: 1, status: 'confirmed', rentalStartDate: start, rentalEndDate: end },
                    movements: { action: 'maintenance_scheduled', reference, unitId: String(unitId), start, end, actorId, at: new Date(), reason: 'Damage quarantine' },
                } });
                await EquipmentUnit.updateOne({ _id: unitId }, { $set: { maintenanceReference: reference } });
            }
        }
        await EquipmentUnit.updateMany(
            { _id: { $in: ids }, currentOrder: String(order._id) },
            {
                $set: { status, condition, currentOrder: null },
                $push: { history: { action: 'return_inspected', fromStatus: 'rented', toStatus: status, orderId: String(order._id), notes: inspected.notes, actorId } },
            }
        );
        await Product.updateOne({ _id: inspected.product, 'movements.reference': { $ne: `inspection-${order._id}-${inspected.product}` } }, { $push: { movements: { action: `return_${inspected.condition}`, reference: `inspection-${order._id}-${inspected.product}`, orderId: String(order._id), unitIds: ids, quantity: inspected.quantity, actorId, at: new Date() } } });
    }
}

export async function releaseEquipmentUnits(orderId, actorId) {
    const units = await EquipmentUnit.find({ currentOrder: String(orderId), status: { $in: ['reserved', 'rented'] } });
    for (const unit of units) {
        unit.history.push({ action: 'rental_released', fromStatus: unit.status, toStatus: 'available', orderId: String(orderId), actorId });
        unit.status = 'available';
        unit.currentOrder = null;
        await unit.save();
    }
}
