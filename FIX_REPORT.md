# Venture API Error Fix Report

Date: 2026-09-26

## Outcome

The three reported client messages were traced to their exact Next.js route handlers. The frontend paths and methods were correct; there is no Express server, cross-origin API base URL, proxy, or CORS boundary in this repository. All requests use same-origin Next.js App Router handlers.

The common live failure is the configured MongoDB Atlas SRV hostname. A direct SRV lookup for the configured host returned `DNS name does not exist`, and the development server recorded `querySrv ENOTFOUND`. The application now handles that outage as HTTP 503 with a stable error code, retries future connection attempts, and logs sanitized diagnostic fields. Normal product/user/order data cannot be restored until `MONGODB_URI` is replaced with a valid Atlas connection string.

## Original errors and fixes

### 1. `{"success":false,"message":"Failed to fetch products"}`

- Request: `GET /api/product/list`
- Complete local verification URL: `http://localhost:3001/api/product/list` (the test server selected port 3001 because 3000 was occupied).
- Request headers: standard same-origin browser headers; no authentication header is required because product listing is public.
- Body/query: none.
- Frontend caller: `context/AppContext.jsx`.
- Backend handler: `app/api/product/list/route.js`.
- Middleware: Clerk middleware executes, but this public route does not require a session.
- Database operation: `connectDB()`, then `Product.find({})`.
- Actual server exception: `querySrv ENOTFOUND` for the configured MongoDB SRV hostname.
- Root cause: the configured Atlas SRV hostname does not exist in DNS. The relative API path and response field (`product`) match the frontend.
- Fixes:
  - Connection uses the URI unchanged with `dbName: MONGODB_DB || "venture"`; it no longer constructs a URI by string concatenation.
  - Added connection and server-selection timeouts, disabled query buffering, and reset rejected cached promises so later requests can retry.
  - Database outages return HTTP 503 with `code: "DATABASE_UNAVAILABLE"` rather than an unexplained 500.
  - Frontend records a terminal error state and renders “Products are temporarily unavailable.” Existing empty collections still return `{ success: true, product: [] }`.
- Verification: live request returned HTTP 503 and the expected safe body; browser displayed the new error state with no console errors. A successful/empty database query remains blocked by the invalid external URI.

### 2. `{"success":false,"message":"Failed to fetch user"}`

- Request: `GET /api/user/data`.
- Complete local verification URL: `http://localhost:3001/api/user/data`.
- Request headers when authenticated: `Authorization: Bearer <Clerk session token>` from `getToken()` plus normal same-origin Clerk cookies. Tokens are never logged.
- Body/query: none.
- Frontend caller: `context/AppContext.jsx`.
- Backend handler: `app/api/user/data/route.js`.
- Middleware: Clerk middleware validates/extracts the session; the handler uses `getAuth(request)` and Clerk String user IDs directly as the Mongo User `_id`.
- Database operation: `User.findById(userId)`.
- Actual server behavior while signed out: HTTP 401, not 500. With the current invalid MongoDB host, an authenticated request would reach the same DNS failure as product listing.
- Additional confirmed frontend defect: after a successful database response, `fetchUserData` immediately overwrote it with dummy user data.
- Fixes:
  - User fetching waits until both Clerk hooks report loaded, preventing premature protected requests.
  - Removed the dummy-data overwrite.
  - Missing Mongo users are recreated from the authenticated Clerk user using an idempotent upsert, covering missed/failed Clerk-Inngest synchronization.
  - Unauthenticated requests return HTTP 401; database outages return diagnostic-safe HTTP 503.
- Verification: signed-out live request returned HTTP 401. Source regression tests verify Clerk readiness, removal of the dummy overwrite, and the self-healing route. Authenticated success is blocked because no test account/session and no valid database host were available.

### 3. `{"success":false,"message":"Terjadi kesalahan server."}`

- Request: `GET /api/order/list`.
- Complete local verification URL: `http://localhost:3001/api/order/list`.
- Request headers when authenticated: `Authorization: Bearer <Clerk session token>` and same-origin Clerk cookies.
- Body/query: none.
- Frontend caller: `app/my-orders/page.jsx`.
- Backend handler: `app/api/order/list/route.js`.
- Middleware: Clerk middleware plus `getAuth(request)`.
- Database operation: authenticated `Order.find({ userId, ... }).populate("address items.product")`.
- Root cause: the generic response concealed the same database DNS exception. The handler also performed two unnecessary preliminary database queries before the actual order query.
- Fixes:
  - Removed redundant `Address.findOne()` and `Product.findOne()` calls; model imports are sufficient for populate registration.
  - Standardized safe server error classification/logging.
  - My Orders waits for Clerk readiness and stops loading cleanly for signed-out users.
- Verification: signed-out live request returned HTTP 401. The authenticated database-backed query remains blocked by the invalid external URI.

## API configuration findings

- API base URL: same origin through relative `/api/...` URLs.
- Backend implementation: Next.js route handlers, not Express.
- CORS: not required for the existing same-origin architecture.
- Proxy: none configured or needed.
- Hardcoded localhost URLs: none added to production code.
- ClerkProvider: present in `app/layout.js`.
- Clerk middleware: present in `middleware.ts` and applied to API routes.
- Environment loading: Next.js detected and loaded `.env`. Required variable names are documented in `.env.example`; secrets were not copied into this report.

## Modified files for this API repair

- `config/db.js`
- `lib/apiError.js`
- `.env.example`
- `app/api/product/list/route.js`
- `app/api/product/search/route.js`
- `app/api/user/data/route.js`
- `app/api/order/list/route.js`
- `context/AppContext.jsx`
- `components/HomeProducts.jsx`
- `app/all-products/page.jsx`
- `app/my-orders/page.jsx`
- `tests/security-regressions.test.mjs`

## Test results

- DNS SRV verification: FAIL — configured MongoDB host does not exist.
- `GET /api/product/list`: HTTP 503 `DATABASE_UNAVAILABLE` (expected while URI is invalid).
- `GET /api/product/search?q=test`: HTTP 503 `DATABASE_UNAVAILABLE`.
- Signed-out `GET /api/user/data`: HTTP 401.
- Signed-out `GET /api/order/list`: HTTP 401.
- Landing product failure state: PASS in browser.
- All-products failure state: PASS in browser.
- Browser console errors in tested frontend flow: none.
- `npm test`: PASS, 14/14 tests.
- `npm run lint`: PASS with 0 errors and 1 unrelated existing `no-img-element` warning in `components/about.jsx`.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run build`: PASS; all 50 pages were generated successfully.

## Remaining issues

1. Replace `MONGODB_URI` locally/deployment-side with a valid Atlas SRV connection string. Confirm that the cluster exists, the database user is active, and the runtime IP/network is allowed. Do not commit the value.
2. After the URI is corrected, execute the blocked database-present, empty-collection, authenticated Clerk/Mongo synchronization, and populated order-list tests.
3. A live authenticated test requires user and seller test sessions; none were supplied and authentication was not bypassed.

No database was reset, no collection was mutated during verification, and no credentials or tokens were logged.
