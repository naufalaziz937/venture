import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckoutKey } from '../lib/payment.mjs';

test('checkout idempotency keys are bounded and header-safe', () => {
    assert.equal(validateCheckoutKey('1234567890abcdef'), true);
    assert.equal(validateCheckoutKey('550e8400_e29b_41d4_a716_446655440000'), true);
    assert.equal(validateCheckoutKey('short'), false);
    assert.equal(validateCheckoutKey('invalid key with spaces'), false);
    assert.equal(validateCheckoutKey('x'.repeat(129)), false);
});
