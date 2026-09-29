import test from 'node:test';
import assert from 'node:assert/strict';
import {
    canTransitionLifecycle,
    legacyStatusFor,
} from '../lib/rentalLifecycle.mjs';

test('order, rental, and delivery lifecycles transition independently and forward only', () => {
    assert.equal(canTransitionLifecycle('order', 'placed', 'confirmed'), true);
    assert.equal(canTransitionLifecycle('order', 'completed', 'confirmed'), false);
    assert.equal(canTransitionLifecycle('rental', 'reserved', 'active'), true);
    assert.equal(canTransitionLifecycle('rental', 'returned', 'active'), false);
    assert.equal(canTransitionLifecycle('delivery', 'outbound', 'delivered'), true);
    assert.equal(canTransitionLifecycle('delivery', 'returned', 'outbound'), false);
});

test('separate lifecycle states retain a compatible legacy status', () => {
    assert.equal(legacyStatusFor({ orderStatus: 'confirmed', rentalStatus: 'active', deliveryStatus: 'delivered' }), 'Sampai di User');
    assert.equal(legacyStatusFor({ orderStatus: 'completed', rentalStatus: 'completed', deliveryStatus: 'returned' }), 'Selesai');
    assert.equal(legacyStatusFor({ orderStatus: 'cancelled', rentalStatus: 'cancelled', deliveryStatus: 'cancelled' }), 'Dibatalkan');
});
