const DAY = 86400000;
const dayNumber = value => Math.floor(new Date(value).getTime() / DAY);
export function overlapDays(start, end, from, to) {
    return Math.max(0, Math.min(dayNumber(end), dayNumber(to)) - Math.max(dayNumber(start), dayNumber(from)) + 1);
}

export function inventoryAnalytics(products, units, orders, from, to) {
    const days = overlapDays(from, to, from, to);
    return products.map(product => {
        const id = String(product._id);
        const assets = units.filter(unit => String(unit.product) === id);
        let rentalUnitDays = 0, inspectedUnits = 0, damagedUnits = 0, lostUnits = 0;
        for (const order of orders) {
            if (order.orderStatus === 'cancelled' || order.reservationStatus === 'pending') continue;
            for (const item of order.items || []) if (String(item.product) === id) rentalUnitDays += item.quantity * overlapDays(order.rentalStartDate, order.rentalEndDate, from, to);
            if (new Date(order.returnInspection?.inspectedAt) >= new Date(from) && new Date(order.returnInspection?.inspectedAt) <= new Date(+new Date(to) + DAY - 1)) {
                for (const item of order.returnInspection.items || []) if (String(item.product) === id) {
                    inspectedUnits += item.quantity;
                    if (item.condition === 'damaged') damagedUnits += item.quantity;
                    if (item.condition === 'lost') lostUnits += item.quantity;
                }
            }
        }
        const movements = product.movements || [];
        const maintenanceDays = movements.filter(event => event.action === 'maintenance_scheduled').reduce((sum, event) => {
            const completed = movements.find(next => next.action === 'maintenance_completed' && next.reference === event.reference);
            const end = completed ? new Date(Math.min(+new Date(event.end), +new Date(completed.at))) : event.end;
            return sum + overlapDays(event.start, end, from, to);
        }, 0);
        const capacityDays = Number(product.stock ?? 1) * days;
        const usableDays = Math.max(0, capacityDays - maintenanceDays);
        return { product: id, name: product.name, capacityDays, maintenanceDays, rentalUnitDays, idleUnitDays: Math.max(0, usableDays - rentalUnitDays), utilization: usableDays ? Math.round(rentalUnitDays / usableDays * 1000) / 10 : 0, tracked: assets.length, damaged: assets.filter(unit => unit.status === 'damaged').length, lost: assets.filter(unit => unit.status === 'lost').length, inspectedUnits, damagedUnits, lostUnits, damageRate: inspectedUnits ? Math.round(damagedUnits / inspectedUnits * 1000) / 10 : 0 };
    });
}
