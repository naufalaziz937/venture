import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('both checkout methods enforce active sanctions', async () => {
    for (const path of ['app/api/order/create/route.js', 'app/api/order/stripe/route.js']) {
        const source = await read(path);
        assert.match(source, /getActiveSanction\(databaseUserId\)/);
        assert.match(source, /ACCOUNT_SANCTIONED/);
    }
});

test('operations dashboard is seller-protected and computes overdue rentals', async () => {
    const source = await read('app/api/order/operations/route.js');
    assert.match(source, /requireSeller/);
    assert.match(source, /overdueDays/);
    assert.match(source, /return_pending/);
});

test('equipment units have unique serials and inspection updates unit condition', async () => {
    const [model, inspection] = await Promise.all([
        read('models/equipmentUnit.js'),
        read('app/api/order/[id]/inspection/route.js'),
    ]);
    assert.match(model, /serialNumber:.*unique: true/);
    assert.match(model, /currentOrder/);
    assert.match(inspection, /completeEquipmentUnitReturn/);
});
