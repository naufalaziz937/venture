import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateVerification, matchesImageSignature, isVerified, canSubmit, canReview } from '../lib/verificationRules.mjs';
const data = { documentType: 'KTP', fullName: 'Synthetic Test', phone: '+628000000000', billingAddress: 'Synthetic address', emergencyContact: { name: 'Synthetic Contact', relationship: 'Friend', phone: '+628000000001' }, consent: true };
const files = [{ type: 'image/png', size: 100 }, { type: 'image/jpeg', size: 100 }];
test('KTP and SIM require both files, contact, emergency contact and explicit consent', () => {
    for (const type of ['KTP', 'SIM']) assert.equal(validateVerification({ ...data, documentType: type }, files), null);
    for (const change of [{ documentType: 'PASSPORT' }, { consent: false }, { fullName: '' }, { phone: 'invalid' }, { billingAddress: '' }, { emergencyContact: {} }]) assert.ok(validateVerification({ ...data, ...change }, files));
    assert.ok(validateVerification(null, files));
    assert.ok(validateVerification(data, [files[0]]));
    assert.ok(validateVerification(data, [{ type: 'image/svg+xml', size: 100 }, files[1]]));
    assert.ok(validateVerification(data, [{ type: 'image/png', size: 6*1024*1024 }, files[1]]));
});
test('image MIME spoofing is rejected before storage', () => {
    assert.equal(matchesImageSignature(new Uint8Array([137,80,78,71,13,10,26,10]), 'image/png'), true);
    assert.equal(matchesImageSignature(new Uint8Array([255,216,255]), 'image/jpeg'), true);
    assert.equal(matchesImageSignature(new TextEncoder().encode('<script>'), 'image/png'), false);
});
test('only verified identities pass the rental gate, submissions and reviews obey lifecycle', () => {
    for (const status of ['NOT_SUBMITTED','PENDING','REJECTED', 'EXPIRED']) assert.equal(isVerified({ status }), false);
    assert.equal(isVerified(null), false);
    assert.equal(isVerified({ status: 'VERIFIED' }), true);
    assert.equal(canSubmit('PENDING'), false);
    assert.equal(canSubmit('VERIFIED'), false);
    assert.equal(canSubmit('REJECTED'), true);
    assert.equal(canReview('PENDING', true), false);
    assert.equal(canReview('VERIFIED', false), false);
});
async function handler(file, name, mocks) {
    const source = (await readFile(new URL('../' + file, import.meta.url), 'utf8'))
        .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
    return new Function(...Object.keys(mocks), source + '\nreturn ' + name + ';')(...Object.values(mocks));
}
const response = (body, status = 200) => ({ body, status });
test('both checkout APIs enforce identity before creating orders or reservations (flows C-F)', async () => {
    for (const route of ['create','stripe']) {
        for (const status of ['NOT_SUBMITTED','PENDING','REJECTED','VERIFIED']) {
            let gateCalled = false, downstream = false;
            const mocks = {
                connectDB: async () => {}, getAuth: () => ({ userId: 'clerk_test' }),
                validateCheckoutKey: () => true, validateOrderItems: () => null,
                mongoose: { Types: { ObjectId: { isValid: () => true } } },
                validateRentalPeriod: () => ({ start: new Date(), end: new Date(), durationDays: 1 }),
                ensureMongoUser: async () => ({ _id: 'legacy_test' }),
                requireRentalVerification: async id => { assert.equal(id,'legacy_test'); gateCalled = true; return status === 'VERIFIED' ? null : response({ code: 'VERIFICATION_REQUIRED' },403); },
                getActiveSanction: async () => { downstream = true; return { reason: 'Synthetic sanction' }; },
                NextResponse: { json: (body, options) => response(body, options?.status) },
                Order: {}, releaseOrderReservations: async () => {},
                Stripe: function() {}, process: { env: {} },
            };
            const post = await handler('app/api/order/' + route + '/route.js','POST',mocks);
            const result = await post({ headers: new Headers(), json: async () => ({ address: 'synthetic', items: [{ product: 'synthetic', quantity: 1 }] }) });
            assert.equal(gateCalled,true);
            assert.equal(downstream,status === 'VERIFIED');
            if (status !== 'VERIFIED') { assert.equal(result.status,403); assert.equal(result.body.code,'VERIFICATION_REQUIRED'); }
        }
    }
});
test('normal users cannot invoke review or list, and absent sessions cannot read submissions (flows G-H)', async () => {
    const denial = response({ message: 'Forbidden' },403);
    for (const route of ['review/[id]','list']) {
        const h = await handler('app/api/verification/' + route + '/route.js',route === 'list' ? 'GET' : 'PATCH', {
            requireSeller: async () => ({ response: denial }), verificationError: () => { throw new Error('Unexpected error'); },
        });
        assert.equal(await h({}, { params: { id: 'synthetic' } }), denial);
    }
    const get = await handler('app/api/verification/data/route.js','GET', {
        verificationUser: async () => ({ response: response({ message: 'Unauthorized' },401) }),
        verificationError: () => { throw new Error('Unexpected error'); },
    });
    assert.equal((await get({})).status,401);
});
test('KTP approve and SIM reject/resubmit/approve use atomic handlers and clear old rejection (flows A-B)', async () => {
    for (const documentType of ['KTP','SIM']) {
        let record = null;
        const model = {
            init: async () => {},
            updateOne: async (filter, update) => { if (!record) record = { _id: 'submission', userId: 'owner', status: 'NOT_SUBMITTED' }; if (update.$unset) for (const key of Object.keys(update.$unset)) delete record[key]; },
            findOneAndUpdate: (filter, update) => {
                let result = null;
                if (record && (!filter.status || filter.status === record.status) &&
                    (!filter.submissionLock || filter.submissionLock === record.submissionLock) &&
                    !(filter.userId?.$ne === record.userId) &&
                    !(filter.$or && record.submissionLock && record.lockExpiresAt > new Date())) {
                    const previous = structuredClone(record);
                    Object.assign(record, update.$set);
                    for (const key of Object.keys(update.$unset || {})) delete record[key];
                    result = update.$set.submissionLock ? { ...structuredClone(record), documentImage: previous.documentImage, selfieImage: previous.selfieImage } : structuredClone(record);
                }
                const promise = Promise.resolve(result);
                promise.select = () => promise;
                return promise;
            },
        };
        const mocks = {
            RentalVerification: model, randomUUID: () => 'lock',
            verificationUser: async () => ({ user: { _id: 'owner' } }),
            verificationResponse: response, verificationSummary: r => r,
            verificationError: error => { throw error; }, validateVerification,
            uploadIdentityImage: async () => ({ publicId: 'synthetic-asset', format: 'png' }), deleteIdentityImages: async () => {},
        };
        const post = await handler('app/api/verification/submit/route.js','POST',mocks);
        const put = await handler('app/api/verification/submit/route.js','PUT',mocks);
        const request = () => ({ headers: new Headers(), formData: async () => ({ get: key => key === 'data' ? JSON.stringify({ ...data, documentType }) : files[key === 'documentImage' ? 0 : 1] }) });
        assert.equal((await post(request())).status,201);
        assert.equal(record.status,'PENDING');
        assert.equal((await post(request())).status,409);
        assert.equal((await put(request())).status,409);
        const reviewMocks = { RentalVerification: model, connectDB: async () => {},
            requireSeller: async () => ({ userId: 'reviewer' }), ensureMongoUser: async () => ({ _id: 'reviewer' }),
            mongoose: { Types: { ObjectId: { isValid: () => true } } },
            verificationResponse: response, verificationSummary: r => r, verificationError: error => { throw error; },
        };
        const review = await handler('app/api/verification/review/[id]/route.js','PATCH',reviewMocks);
        const callReview = action => review({ json: async () => ({ action, rejectionReason: 'Synthetic rejection reason' }) }, { params: { id: 'submission' } });
        if (documentType === 'SIM') {
            assert.equal((await callReview('reject')).status,200);
            assert.equal(record.status,'REJECTED');
            assert.ok(record.rejectionReason);
            assert.equal((await put(request())).status,201);
            assert.equal(record.status,'PENDING');
            assert.equal(record.rejectionReason,undefined);
            assert.equal(record.reviewedBy,undefined);
        }
        assert.equal((await callReview('approve')).status,200);
        assert.equal(record.status,'VERIFIED');
        assert.equal(record.reviewedBy,'reviewer');
        assert.equal((await callReview('reject')).status,409);
        assert.equal((await put(request())).status,409);
    }
});
test('image proxy hides other users documents and never returns Cloudinary URLs (flow G)', async () => {
    let fetched = false;
    const get = await handler('app/api/verification/image/[id]/[kind]/route.js','GET', {
        verificationUser: async () => ({ user: { _id: 'other' }, clerkId: 'other_clerk' }),
        mongoose: { Types: { ObjectId: { isValid: () => true } } },
        RentalVerification: { findById: () => ({ select: async () => ({ userId: 'owner', documentImage: { publicId: 'synthetic' } }) }) },
        authSeller: async () => false,
        verificationResponse: response, verificationError: error => { throw error; },
        identityDownloadUrl: () => { throw new Error('Unauthorized storage access'); },
        fetch: async () => { fetched = true; },
    });
    const result = await get({}, { params: { id: 'submission', kind: 'document' } });
    assert.equal(result.status,404);
    assert.equal(fetched,false);
});
test('multipart submit receives real image Files and persists only storage asset identifiers', async () => {
    const bytes = new Uint8Array([137,80,78,71,13,10,26,10]);
    const form = new FormData();
    form.append('data',JSON.stringify(data));
    form.append('documentImage',new File([bytes],'camera.png',{ type: 'image/png' }));
    form.append('selfieImage',new File([bytes],'selfie.png',{ type: 'image/png' }));
    let stored, uploads = 0;
    const model = {
        init: async () => {}, updateOne: async () => {},
        findOneAndUpdate(filter, update) {
            if (filter.submissionLock) {
                stored = update.$set;
                return Promise.resolve({ _id: 'submission', ...stored });
            }
            return { select: async () => ({ _id: 'submission' }) };
        },
    };
    const post = await handler('app/api/verification/submit/route.js','POST', {
        RentalVerification: model, randomUUID: () => 'synthetic-lock',
        verificationUser: async () => ({ user: { _id: 'synthetic-owner' } }),
        verificationResponse: response, verificationSummary: record => ({ status: record.status }),
        verificationError: error => { throw error; }, validateVerification, Buffer,
        uploadIdentityImage: async file => {
            assert.ok(file instanceof File);
            assert.equal(file.type,'image/png');
            assert.deepEqual(new Uint8Array(await file.arrayBuffer()),bytes);
            return { publicId: 'synthetic-private-' + (++uploads), format: 'png' };
        },
        deleteIdentityImages: async () => {},
    });
    const result = await post(new Request('http://localhost/api/verification/submit',{ method: 'POST', body: form }));
    assert.equal(result.status,201);
    assert.equal(result.body.verification.status,'PENDING');
    assert.equal(uploads,2);
    assert.deepEqual(stored.documentImage,{ publicId: 'synthetic-private-1', format: 'png' });
    assert.deepEqual(stored.selfieImage,{ publicId: 'synthetic-private-2', format: 'png' });
});
