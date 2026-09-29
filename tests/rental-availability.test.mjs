import test from 'node:test';
import assert from 'node:assert/strict';
import { availableStock, periodsOverlap, validateRentalPeriod } from '../lib/rentalAvailability.mjs';

test('rental periods use inclusive overlap semantics', () => {
    assert.equal(periodsOverlap('2026-06-11', '2026-06-13', '2026-06-10', '2026-06-12'), true);
    assert.equal(periodsOverlap('2026-06-15', '2026-06-17', '2026-06-10', '2026-06-12'), false);
});

test('availability subtracts only active overlapping reservations', () => {
    const product = {
        stock: 5,
        reservations: [
            { quantity: 3, rentalStartDate: '2026-06-10', rentalEndDate: '2026-06-12', status: 'confirmed' },
            { quantity: 5, rentalStartDate: '2026-06-20', rentalEndDate: '2026-06-21', status: 'confirmed' },
            { quantity: 4, rentalStartDate: '2026-06-11', rentalEndDate: '2026-06-13', status: 'pending', expiresAt: '2026-04-01' },
        ],
    };
    const now = new Date('2026-05-01T00:00:00Z');
    assert.equal(availableStock(product, '2026-06-11', '2026-06-13', now), 2);
    assert.equal(availableStock(product, '2026-06-15', '2026-06-17', now), 5);
});

test('availability uses peak concurrent demand rather than summing non-concurrent rentals', () => {
    const product = {
        stock: 5,
        reservations: [
            { quantity: 3, rentalStartDate: '2026-06-10', rentalEndDate: '2026-06-10', status: 'confirmed' },
            { quantity: 4, rentalStartDate: '2026-06-12', rentalEndDate: '2026-06-12', status: 'confirmed' },
        ],
    };
    assert.equal(availableStock(product, '2026-06-10', '2026-06-12', new Date('2026-05-01')), 1);
});

test('rental period validation rejects past and reversed dates and counts inclusive days', () => {
    const now = new Date('2026-06-01T10:00:00Z');
    assert.match(validateRentalPeriod('2026-05-31', '2026-06-02', now).error, /past/);
    assert.match(validateRentalPeriod('2026-06-03', '2026-06-02', now).error, /on or after/);
    assert.equal(validateRentalPeriod('2026-06-10', '2026-06-12', now).durationDays, 3);
    assert.match(validateRentalPeriod('2026-06-01', '2027-06-02', now).error, /cannot exceed/);
});
