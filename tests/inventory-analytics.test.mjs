import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryAnalytics, overlapDays } from '../lib/inventoryAnalytics.mjs';
import { availableStock } from '../lib/rentalAvailability.mjs';

test('maintenance consumes capacity only on overlapping dates, including zero stock', () => {
    const product = { stock: 2, reservations: [{ kind: 'maintenance', status: 'confirmed', quantity: 1, rentalStartDate: '2026-10-02', rentalEndDate: '2026-10-04' }] };
    assert.equal(availableStock(product, '2026-10-01', '2026-10-03'), 1);
    assert.equal(availableStock(product, '2026-10-05', '2026-10-06'), 2);
    assert.equal(availableStock({ stock: 0 }, '2026-10-01', '2026-10-03'), 0);
});
test('analytics clips bookings and maintenance to range and excludes cancelled bookings', () => {
    const products = [{ _id: 'p', name: 'Tent', stock: 2, movements: [{ action: 'maintenance_scheduled', reference: 'm', start: '2026-10-01', end: '2026-10-03' }] }];
    const orders = [{ rentalStartDate: '2026-09-30', rentalEndDate: '2026-10-02', items: [{ product: 'p', quantity: 1 }], returnInspection: { inspectedAt: '2026-10-03', items: [{ product: 'p', quantity: 1, condition: 'damaged' }] } }, { orderStatus: 'cancelled', rentalStartDate: '2026-10-01', rentalEndDate: '2026-10-03', items: [{ product: 'p', quantity: 10 }] }];
    const [row] = inventoryAnalytics(products, [], orders, '2026-10-01', '2026-10-03');
    assert.equal(row.capacityDays, 6);
    assert.equal(row.maintenanceDays, 3);
    assert.equal(row.rentalUnitDays, 2);
    assert.equal(row.idleUnitDays, 1);
    assert.equal(row.utilization, 66.7);
    assert.equal(row.damageRate, 100);
    assert.equal(overlapDays('2026-09-01', '2026-09-02', '2026-10-01', '2026-10-03'), 0);
});
