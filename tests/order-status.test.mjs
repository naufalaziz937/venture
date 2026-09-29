import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrderStatus, ORDER_STATUSES } from '../lib/orderStatus.mjs';

test('order lifecycle allows only forward transitions and cancellation from active states', () => {
    assert.equal(canTransitionOrderStatus('Pending', 'Dalam Perjalanan ke Alamat User'), true);
    assert.equal(canTransitionOrderStatus('Dalam Perjalanan ke Alamat User', 'Sampai di User'), true);
    assert.equal(canTransitionOrderStatus('Sampai di User', 'Dikembalikan ke Venture'), true);
    assert.equal(canTransitionOrderStatus('Dikembalikan ke Venture', 'Selesai'), true);
    assert.equal(canTransitionOrderStatus('Selesai', 'Pending'), false);
    assert.equal(canTransitionOrderStatus('Dibatalkan', 'Pending'), false);
    assert.equal(ORDER_STATUSES.includes('anything'), false);
});
