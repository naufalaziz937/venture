import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLateDays, calculateLateFeePerDay, calculateReturnCharges } from '../lib/returnFlow.mjs';

test('late fee policy snapshots twenty percent of the daily rental subtotal', () => {
    const products = [{ _id: 'tent', offerPrice: 100000 }, { _id: 'bag', offerPrice: 50000 }];
    const items = [{ product: 'tent', quantity: 2 }, { product: 'bag', quantity: 1 }];
    assert.equal(calculateLateFeePerDay(products, items), 50000);
});

test('late days use calendar days and never become negative', () => {
    assert.equal(calculateLateDays('2026-06-12', '2026-06-15'), 3);
    assert.equal(calculateLateDays('2026-06-12', '2026-06-11'), 0);
});

test('return charges combine automatic late fees with damage and loss charges', () => {
    assert.deepEqual(calculateReturnCharges({
        rentalEndDate: '2026-06-12',
        receivedAt: '2026-06-14',
        lateFeePerDay: 25000,
        inspectedItems: [
            { condition: 'normal', charge: 0 },
            { condition: 'damaged', charge: 100000 },
            { condition: 'lost', charge: 500000 },
        ],
    }), {
        lateDays: 2,
        lateFee: 50000,
        conditionCharges: 600000,
        totalAdditionalCharge: 650000,
    });
});
