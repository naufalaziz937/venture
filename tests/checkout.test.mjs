import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeposit, calculateTotals, isVoucherUsable, validateOrderItems } from '../lib/checkout.mjs';

test('order items require unique products and positive integer quantities', () => {
    assert.equal(validateOrderItems(null), 'At least one order item is required');
    assert.equal(validateOrderItems([{ product: 'p1', quantity: -1 }]), 'Quantity must be a positive integer');
    assert.equal(validateOrderItems([{ product: 'p1', quantity: 1.5 }]), 'Quantity must be a positive integer');
    assert.equal(validateOrderItems([{ product: 'p1', quantity: 1 }, { product: 'p1', quantity: 2 }]), 'Duplicate product IDs are not allowed');
    assert.equal(validateOrderItems([{ product: 'p1', quantity: 2 }]), null);
});

test('security deposits are charged once per rented unit and not per rental day', () => {
    const products = [{ _id: 'p1', depositAmount: 50000 }, { _id: 'p2', depositAmount: 0 }];
    assert.equal(calculateDeposit(products, [
        { product: 'p1', quantity: 2 },
        { product: 'p2', quantity: 3 },
    ]), 100000);
});

test('voucher expiry, usage limit, and percent range are enforced', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    assert.equal(isVoucherUsable({ type: 'percent', amount: 10, usedCount: 0, usageLimit: 1 }, now), true);
    assert.equal(isVoucherUsable({ type: 'percent', amount: 10, usedCount: 1, usageLimit: 1 }, now), false);
    assert.equal(isVoucherUsable({ type: 'percent', amount: 101, usedCount: 0, usageLimit: null }, now), false);
    assert.equal(isVoucherUsable({ type: 'fixed', amount: 10, expiresAt: '2025-12-31', usedCount: 0 }, now), false);
});

test('totals are server-calculated with tax and bounded discount', () => {
    const products = [{ _id: 'p1', offerPrice: 10000 }];
    assert.deepEqual(calculateTotals(products, [{ product: 'p1', quantity: 2 }], { type: 'percent', amount: 10 }), {
        subtotal: 20000,
        tax: 2400,
        discount: 2000,
        total: 20400,
    });
    assert.equal(calculateTotals(products, [{ product: 'p1', quantity: 1 }], { type: 'fixed', amount: 999999 }).total, 0);
    assert.equal(calculateTotals(products, [{ product: 'p1', quantity: 2 }], null, 3).subtotal, 60000);
});
