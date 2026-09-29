import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('credential files are ignored and a safe example exists', async () => {
    const ignore = await readFile(new URL('.gitignore', root), 'utf8');
    const example = await readFile(new URL('.env.example', root), 'utf8');
    assert.match(ignore, /^\.env$/m);
    const populated = example.split(/\r?\n/).filter(line => line && !line.startsWith('MONGODB_DB=') && !line.endsWith('='));
    assert.deepEqual(populated, []);
});

test('privileged handlers use the shared seller guard', async () => {
    const files = [
        'app/api/product/delete/[id]/route.js',
        'app/api/product/update-product/[id]/route.js',
        'app/api/order/update-order/[id]/route.js',
        'app/api/voucher/create/route.js',
        'app/api/voucher/delete/[id]/route.js',
        'app/api/sanction/create/route.js',
        'app/api/sanction/update/[id]/route.js',
        'app/api/sanction/delete/[id]/route.js',
    ];
    for (const file of files) {
        const source = await readFile(new URL(file, root), 'utf8');
        assert.match(source, /await requireSeller\(/, file);
    }
});

test('seller UI and analytics endpoints are protected', async () => {
    const middleware = await readFile(new URL('middleware.ts', root), 'utf8');
    const layout = await readFile(new URL('app/seller/layout.jsx', root), 'utf8');
    assert.match(middleware, /auth\.protect/);
    assert.match(layout, /publicMetadata\?\.role !== 'seller'/);

    for (const file of ['app/api/user/get-user/route.js', 'app/api/order/get-total-revenue/route.js', 'app/api/voucher/list/route.js']) {
        const source = await readFile(new URL(file, root), 'utf8');
        assert.match(source, /await requireSeller\(/, file);
    }
});

test('payment webhook is idempotent and checkout ignores client discount amounts', async () => {
    const checkout = await readFile(new URL('app/api/order/stripe/route.js', root), 'utf8');
    const webhook = await readFile(new URL('app/api/stripe/route.js', root), 'utf8');
    assert.doesNotMatch(checkout, /const \{[^}]*discountAmount/);
    assert.match(webhook, /\{ _id: orderId, isPaid: false \}/);
    assert.match(webhook, /Invalid webhook signature[^]*status: 400/);
    assert.match(webhook, /Webhook processing failed[^]*status: 500/);
});

test('order creation is synchronous and Inngest no longer inserts duplicate orders', async () => {
    const createOrder = await readFile(new URL('app/api/order/create/route.js', root), 'utf8');
    const inngest = await readFile(new URL('config/inngest.js', root), 'utf8');
    assert.doesNotMatch(createOrder, /inngest\.send/);
    assert.doesNotMatch(inngest, /Order\.insertMany/);
});

test('user and order schemas retain synchronized fields', async () => {
    const user = await readFile(new URL('models/user.js', root), 'utf8');
    const order = await readFile(new URL('models/order.js', root), 'utf8');
    assert.doesNotMatch(user, /reqired/);
    assert.match(user, /imageUrl/);
    assert.match(user, /timestamps: true/);
    assert.match(order, /voucherCode/);
    assert.match(order, /paymentStatus/);
});

test('database connection uses a dedicated dbName and never appends to the URI', async () => {
    const source = await readFile(new URL('config/db.js', root), 'utf8');
    assert.match(source, /dbName: process\.env\.MONGODB_DB \|\| 'venture'/);
    assert.match(source, /serverSelectionTimeoutMS/);
    assert.doesNotMatch(source, /MONGODB_URI\s*\+/);
});

test('frontend waits for Clerk and does not overwrite database user data', async () => {
    const source = await readFile(new URL('context/AppContext.jsx', root), 'utf8');
    assert.match(source, /isUserLoaded && isAuthLoaded && user/);
    assert.doesNotMatch(source, /setUserData\(userDummyData\)/);
});

test('affected APIs classify database outages without exposing internal exceptions', async () => {
    for (const file of ['app/api/product/list/route.js', 'app/api/user/data/route.js', 'app/api/order/list/route.js']) {
        const source = await readFile(new URL(file, root), 'utf8');
        assert.match(source, /serverErrorResponse\(/, file);
    }
});

test('Clerk user synchronization tolerates missing profile images and prevents duplicates', async () => {
    const schema = await readFile(new URL('models/user.js', root), 'utf8');
    const sync = await readFile(new URL('lib/syncClerkUser.js', root), 'utf8');
    const inngest = await readFile(new URL('config/inngest.js', root), 'utf8');

    assert.match(schema, /clerkId:\{ type: String, unique:true, sparse:true/);
    assert.match(schema, /imageUrl:\{ type : String, default:""\}/);
    assert.match(sync, /imageUrl: firstNonEmpty\([^)]*\) \|\| ''/);
    assert.match(sync, /findByIdAndUpdate\(/);
    assert.match(sync, /\{ upsert: true, new: true/);
    assert.match(sync, /emailVerified/);
    assert.match(sync, /collation\(\{ locale: 'en', strength: 2 \}\)/);
    assert.match(sync, /AMBIGUOUS_LEGACY_USER/);
    assert.doesNotMatch(inngest, /User\.create\(/);
});

test('cart updates use the authenticated Clerk ID and do not save the entire user document', async () => {
    const cart = await readFile(new URL('app/api/cart/update/route.js', root), 'utf8');

    assert.match(cart, /const \{ userId \} = getAuth\(request\)/);
    assert.match(cart, /ensureMongoUser\(userId\)/);
    assert.match(cart, /findByIdAndUpdate\(user\._id,[^]*cartItems: cartData/);
    assert.match(cart, /cartRentalPeriod:[^]*rentalStartDate: period\.start[^]*rentalEndDate: period\.end/);
    assert.doesNotMatch(cart, /user\.save\(/);
    assert.match(cart, /status: 401/);
});

test('legacy Clerk identity mapping is used for cart, address, and order relationships', async () => {
    for (const file of [
        'app/api/cart/get/route.js',
        'app/api/cart/update/route.js',
        'app/api/user/add-address/route.js',
        'app/api/user/get-address/route.js',
        'app/api/order/create/route.js',
        'app/api/order/stripe/route.js',
        'app/api/order/list/route.js',
    ]) {
        const source = await readFile(new URL(file, root), 'utf8');
        assert.match(source, /ensureMongoUser\(userId\)/, file);
    }
});
