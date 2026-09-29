# Venture Bug Report

Only issues supported by repository evidence or an executed check are listed as confirmed. Blocked scenarios remain in `TEST_CHECKLIST.md` and are not promoted to confirmed bugs.

## Remediation status (2026-09-26)

| Bug | Status | Verification |
|---|---|---|
| BUG-001 | Partially resolved | `.env` is ignored and removed from the Git index; `.env.example` contains names only. Credential rotation and purging prior Git history remain external operational actions. |
| BUG-002 | Resolved | Shared fail-closed seller guard added before every privileged mutation; regression source checks pass. |
| BUG-003 | Resolved | Seller-list authorization now awaits the shared guard; unauthenticated runtime probe returns 401. |
| BUG-004 | Resolved | `authSeller` returns boolean only and fails closed; shared guard maps failures to 401/403. |
| BUG-005 | Resolved | Seller authorization added to user, order, revenue, voucher, sanction, and analytics reads; runtime probes return 401. |
| BUG-006 | Resolved | `/seller(.*)` is protected in middleware and the server layout independently verifies seller role. Signed-out `/seller` no longer renders the shell. |
| BUG-007 | Resolved | Daily revenue handler implemented with seller authorization and paid/non-cancelled filtering; build passes. |
| BUG-008 | Resolved | ESLint 9 flat configuration and `eslint .` script added; lint exits 0. |
| BUG-009 | Resolved | COD creation now authenticates, connects, validates IDs/items/quantities/products, and returns correct 4xx/5xx statuses. |
| BUG-010 | Resolved | COD and Stripe checkout query Address by both `_id` and authenticated `userId`. |
| BUG-011 | Resolved | Stripe checkout recomputes totals/vouchers server-side and creates one valid IDR line item equal to the stored total. |
| BUG-012 | Resolved | Shared voucher rules enforce expiry, usage limit, positive amounts, and percent range in validation and checkout. |
| BUG-013 | Resolved | Order schema now persists `voucherCode`, `discountAmount`, and payment status used by the webhook. |
| BUG-014 | Resolved | Synchronous order creation no longer emits a duplicate creation event; Inngest handler no longer inserts orders. |
| BUG-015 | Resolved | Order status enum and forward-only transition graph are enforced with an optimistic current-status condition. |
| BUG-016 | Resolved | Webhook signature errors return 400, processing errors return 500, and payment updates transition only unpaid orders once. |
| BUG-017 | Code resolved; migration pending | Required validators, `imageUrl`, and timestamps are corrected. Existing database records still require a controlled migration when MongoDB is reachable. |
| BUG-018 | Resolved | Product loading and terminal not-found states are separate; browser test confirms visible not-found UI. |
| BUG-019 | Resolved | Cart totals skip stale/missing product references instead of dereferencing `undefined`. |
| BUG-020 | Resolved | Tablet navbar switches to compact controls below `lg`; browser measurements show no overflow at 375/768/1440px. |
| BUG-021 | Resolved | Reported order, product, search, user, cart, and webhook failures now use appropriate HTTP statuses and sanitized messages. |
| BUG-022 | Resolved | Uploads require seller authorization plus JPEG/PNG/WebP, 5 MB per-file limit, and bounded counts before buffering. |

Automated verification: 11 regression tests passed; ESLint and TypeScript exited 0; production build completed; protected endpoint probes returned 401; responsive and invalid-product browser checks passed. Live MongoDB, Clerk role-account, Cloudinary, Inngest delivery, and Stripe sandbox transactions remain blocked by the audit environment and were not fabricated.

## BUG-001

Bug ID: BUG-001  
Title: Secret-bearing `.env` file is committed to Git  
Severity: Critical  
Category: Security / credential exposure  
Affected Feature: All external integrations  
File Path: `.env`  
Line Number: 1  
Description: `git ls-files` confirms `.env` is tracked and the file contains Clerk, MongoDB, Inngest, Cloudinary, and Stripe credential variables. Values were not printed.  
Steps to Reproduce: Run `git ls-files | rg '(^|/)(\.env|.*\.env)'`.  
Expected Result: Secret files are ignored; only a value-free example is tracked.  
Actual Result: `.env` is tracked.  
Error Message: N/A  
Root Cause: Repository secret-management policy is absent or was bypassed.  
Recommended Fix: Rotate every credential, remove the file from the index and repository history, strengthen `.gitignore`, and add `.env.example`.  
Verification Status: Confirmed by command.

## BUG-002

Bug ID: BUG-002  
Title: Administrative mutation endpoints allow unauthenticated callers  
Severity: Critical  
Category: Broken access control  
Affected Feature: Product, order, voucher, and sanction administration  
File Path: `app/api/product/delete/[id]/route.js`; `app/api/product/update-product/[id]/route.js`; `app/api/order/update-order/[id]/route.js`; `app/api/voucher/create/route.js`; `app/api/voucher/delete/[id]/route.js`; `app/api/sanction/create/route.js`; `app/api/sanction/update/[id]/route.js`; `app/api/sanction/delete/[id]/route.js`  
Line Number: 5; 16; 13; 5; 7; 5; 5; 5  
Description: These handlers mutate privileged data without calling Clerk authentication or seller authorization. Order update also accepts arbitrary status and uploads files.  
Steps to Reproduce: Inspect each exported mutation handler; no identity/role check occurs before database mutation.  
Expected Result: Backend independently rejects unauthenticated/non-seller requests with 401/403.  
Actual Result: Mutation proceeds whenever the database/service is reachable.  
Error Message: N/A  
Root Cause: Authorization was implemented inconsistently and assumed at the UI layer.  
Recommended Fix: Apply a shared fail-closed `requireSeller` guard before parsing/uploading/mutating; add negative authorization integration tests.  
Verification Status: Confirmed by code-path inspection; live mutation intentionally not executed.

## BUG-003

Bug ID: BUG-003  
Title: Seller product-list authorization Promise is never awaited  
Severity: High  
Category: Broken access control  
Affected Feature: Seller product listing  
File Path: `app/api/product/seller-list/route.js`  
Line Number: 11  
Description: `authSeller(userId)` returns a Promise, which is always truthy, so `if (!isSeller)` never blocks.  
Steps to Reproduce: Request the endpoint as a non-seller while the database is available.  
Expected Result: HTTP 403.  
Actual Result: Code proceeds to return all products.  
Error Message: N/A  
Root Cause: Missing `await`.  
Recommended Fix: Await a boolean-only fail-closed authorization helper and return 401/403 explicitly.  
Verification Status: Confirmed by code-path inspection.

## BUG-004

Bug ID: BUG-004  
Title: Authorization helper fails open on Clerk errors  
Severity: High  
Category: Authentication / authorization  
Affected Feature: Seller-only APIs  
File Path: `lib/authSeller.js`; `app/api/order/seller-orders/route.js`  
Line Number: 16; 11-14  
Description: On error, `authSeller` returns a `NextResponse` object rather than `false`/throwing. The object is truthy, so callers can treat an authentication failure as authorization success.  
Steps to Reproduce: Cause `clerkClient().users.getUser` to reject, then observe `if (!isSeller)` is bypassed.  
Expected Result: Authentication service errors deny access.  
Actual Result: The guard receives a truthy response object.  
Error Message: N/A  
Root Cause: Helper mixes boolean policy with HTTP response construction.  
Recommended Fix: Return only boolean or throw a typed error; validate `userId` first; test Clerk failures.  
Verification Status: Confirmed by code-path inspection.

## BUG-005

Bug ID: BUG-005  
Title: Admin analytics and user/sanction/voucher lists are public  
Severity: High  
Category: Sensitive data exposure / broken access control  
Affected Feature: Admin dashboard and reporting  
File Path: `app/api/user/get-user/route.js`; `app/api/user/get-total-user/route.js`; `app/api/user/get-user-growth/route.js`; `app/api/order/get-total-order/route.js`; `app/api/order/get-total-revenue/route.js`; `app/api/order/get-recent-order/route.js`; `app/api/order/get-order-status-breakdown/route.js`; `app/api/voucher/list/route.js`; `app/api/sanction/list/route.js`  
Line Number: 5; 6; 6; 5; 6; 7; 6; 6; 6  
Description: No handler authenticates or checks seller role. User list discloses IDs, names, and email addresses; recent orders expose customer/order data.  
Steps to Reproduce: Send unauthenticated GET requests with a reachable database.  
Expected Result: 401/403.  
Actual Result: Handlers query and return administrative data.  
Error Message: Current environment reaches the handler but DB calls fail with MongoDB DNS error.  
Root Cause: Missing server-side access-control boundary.  
Recommended Fix: Require seller role on all analytics and management reads; minimize returned PII.  
Verification Status: Confirmed by code-path inspection; response data blocked by DB connectivity.

## BUG-006

Bug ID: BUG-006  
Title: Seller pages render their administrative shell without authentication  
Severity: Medium  
Category: Frontend access control  
Affected Feature: Seller dashboard  
File Path: `app/seller/layout.jsx`; `middleware.ts`  
Line Number: 8-24; 3  
Description: The seller layout has no role/session gate and middleware merely invokes Clerk. Browser navigation to `/seller` while logged out rendered seller navigation and Logout UI.  
Steps to Reproduce: Open `/seller` in a signed-out browser.  
Expected Result: Redirect to sign-in or an access-denied page.  
Actual Result: Admin shell is visible; data calls then fail/empty.  
Error Message: N/A  
Root Cause: No protected route matcher or server authorization in the seller layout.  
Recommended Fix: Protect `/seller(.*)` in Clerk middleware and verify seller metadata server-side.  
Verification Status: Confirmed in browser.

## BUG-007

Bug ID: BUG-007  
Title: Production build fails on empty daily-revenue route  
Severity: High  
Category: Build / TypeScript  
Affected Feature: Build and analytics  
File Path: `app/api/order/get-daily-revenue/route.js`  
Line Number: 1  
Description: The zero-byte route is not a module.  
Steps to Reproduce: Run `npm run build` or `npx tsc --noEmit --incremental false`.  
Expected Result: Successful type/build validation.  
Actual Result: Build exits 1; endpoint returns HTTP 405.  
Error Message: `TS2306: File '.../get-daily-revenue/route.js' is not a module.`  
Root Cause: Route file was created without an exported HTTP handler.  
Recommended Fix: Implement the authenticated handler or remove the route and its consumers.  
Verification Status: Confirmed by build, type check, and HTTP probe.

## BUG-008

Bug ID: BUG-008  
Title: Lint command and production build lint phase crash  
Severity: High  
Category: Tooling / CI  
Affected Feature: Code validation  
File Path: `eslint.config.mjs`; `package.json`  
Line Number: 12; 9  
Description: Both `npm run lint` and build linting crash before reporting source diagnostics. The script also uses removed/deprecated `next lint` behavior for this Next version/toolchain combination.  
Steps to Reproduce: Run `npm run lint` or `npm run build`.  
Expected Result: ESLint returns actionable lint results.  
Actual Result: Tool crashes.  
Error Message: `Cannot serialize key "parse" in parser: Function values are not supported.`  
Root Cause: Incompatible FlatCompat/Next ESLint invocation/configuration.  
Recommended Fix: Adopt a supported ESLint 9 flat config and invoke `eslint .`; pin compatible versions in CI.  
Verification Status: Confirmed by command.

## BUG-009

Bug ID: BUG-009  
Title: Order creation lacks database connection and robust authentication/input validation  
Severity: High  
Category: API correctness / validation  
Affected Feature: COD checkout  
File Path: `app/api/order/create/route.js`  
Line Number: 8-22  
Description: Handler never calls `connectDB`, does not return 401 for a missing user, assumes `items` is an array, dereferences nonexistent products, and accepts zero/negative/non-integer quantities.  
Steps to Reproduce: POST missing/invalid `items`, invalid product IDs, or negative quantities.  
Expected Result: 400/401/404 validation responses and no write.  
Actual Result: 200-style JSON errors, exceptions, or invalid amount computation depending on input/connection state.  
Error Message: Potential `Cannot read properties of undefined/null`; current DB environment blocks live mutation.  
Root Cause: No request schema and no explicit DB initialization.  
Recommended Fix: Authenticate first, connect, validate a strict schema, require positive integer quantities, and handle missing products atomically.  
Verification Status: Confirmed by deterministic code paths; mutation not executed.

## BUG-010

Bug ID: BUG-010  
Title: Checkout does not verify address ownership  
Severity: High  
Category: IDOR / authorization  
Affected Feature: COD and Stripe checkout  
File Path: `app/api/order/create/route.js`; `app/api/order/stripe/route.js`  
Line Number: 11,45-48; 12,39-43  
Description: Any supplied address ID is stored without verifying it belongs to the authenticated user.  
Steps to Reproduce: Submit another user's Address ID in checkout.  
Expected Result: 403/404 and no order.  
Actual Result: Handler accepts the ID if other operations succeed.  
Error Message: N/A  
Root Cause: Client-provided reference is trusted.  
Recommended Fix: Query Address with `{_id: address, userId}` before order creation.  
Verification Status: Confirmed by code-path inspection.

## BUG-011

Bug ID: BUG-011  
Title: Stripe checkout trusts client-controlled discount and produces inconsistent/invalid amounts  
Severity: High  
Category: Payment integrity  
Affected Feature: Stripe checkout  
File Path: `app/api/order/stripe/route.js`  
Line Number: 12,35-36,50-72  
Description: `discountAmount` comes from the client without voucher validation. Tax is included in the stored order but not represented in Stripe line items, while discount is attempted as a negative line item, which Stripe prices do not support.  
Steps to Reproduce: Submit an arbitrary large `discountAmount` or create a normal checkout and compare order amount with Stripe line items.  
Expected Result: Server validates voucher and Stripe total exactly equals stored total.  
Actual Result: Client can manipulate stored total and session creation can reject the negative unit amount; tax/payment totals diverge.  
Error Message: Live Stripe call intentionally not executed.  
Root Cause: Split, client-influenced pricing logic.  
Recommended Fix: Recompute voucher/tax server-side and use Stripe coupons/discounts or a valid positive-price representation; verify final session amount.  
Verification Status: Confirmed by code-path inspection.

## BUG-012

Bug ID: BUG-012  
Title: Voucher expiry and usage limits are never enforced  
Severity: Medium  
Category: Business logic  
Affected Feature: Voucher validation and checkout  
File Path: `app/api/voucher/validate/route.js`; `app/api/order/create/route.js`  
Line Number: 14-25; 27-41  
Description: Both paths accept any existing code without checking `expiresAt`, `usageLimit`, or `usedCount`; percent amount range is not validated.  
Steps to Reproduce: Use an expired/exhausted voucher record.  
Expected Result: Voucher rejected.  
Actual Result: Voucher is returned/applied.  
Error Message: N/A  
Root Cause: Model fields exist but business constraints are not evaluated.  
Recommended Fix: Centralize voucher validation and apply it transactionally during order/payment completion.  
Verification Status: Confirmed by code-path inspection.

## BUG-013

Bug ID: BUG-013  
Title: Voucher metadata is dropped from orders, breaking usage tracking  
Severity: Medium  
Category: Data model consistency  
Affected Feature: Voucher/payment synchronization  
File Path: `models/order.js`; `app/api/order/stripe/route.js`; `app/api/stripe/route.js`  
Line Number: 3-18; 46-47; 38-45  
Description: Order creation supplies `voucherCode`, but the strict Mongoose schema has no `voucherCode` path. Stripe webhook later checks `order.voucherCode`, which therefore is normally absent.  
Steps to Reproduce: Create a voucher-backed Stripe order and inspect stored order/webhook path.  
Expected Result: Voucher code persists and usage increments once.  
Actual Result: Code is discarded and usage is not incremented.  
Error Message: N/A  
Root Cause: API payload and schema are out of sync.  
Recommended Fix: Add a validated schema field or normalized voucher reference and migrate existing data.  
Verification Status: Confirmed by schema/handler inspection.

## BUG-014

Bug ID: BUG-014  
Title: Inngest order event attempts a second invalid order insert  
Severity: High  
Category: Background jobs / data integrity  
Affected Feature: Order creation event  
File Path: `app/api/order/create/route.js`; `config/inngest.js`  
Line Number: 45-66; 64-99  
Description: API creates the order directly, then sends `order/created`. The handler builds another order without required `paymentType`, so processing fails validation; if schema requirements change, it would duplicate orders. `orderId` is sent but ignored.  
Steps to Reproduce: Create a COD order with Inngest processing enabled and inspect the run.  
Expected Result: One idempotent order operation.  
Actual Result: Background insert is invalid/duplicative by design.  
Error Message: Expected Mongoose validation error for required `paymentType`; runtime delivery was blocked.  
Root Cause: Competing ownership of order persistence and no idempotency key.  
Recommended Fix: Choose synchronous or event-owned creation, use `orderId` as an idempotency key, and include all required fields.  
Verification Status: Confirmed by deterministic schema/handler inspection.

## BUG-015

Bug ID: BUG-015  
Title: Order status accepts arbitrary values and transitions  
Severity: High  
Category: Business logic / authorization  
Affected Feature: Rental lifecycle  
File Path: `models/order.js`; `app/api/order/update-order/[id]/route.js`  
Line Number: 11; 19-20,60-67  
Description: Status is an unrestricted string, update endpoint is unauthenticated, and no transition graph is enforced. Payment status enum from requirements is not modeled.  
Steps to Reproduce: PUT any string as `status` for any order ID.  
Expected Result: Seller-only access and a valid next transition only.  
Actual Result: Supplied value is written.  
Error Message: N/A  
Root Cause: Missing enum/state-machine validation.  
Recommended Fix: Define canonical enums and enforce allowed transitions atomically based on current state and actor.  
Verification Status: Confirmed by code-path inspection.

## BUG-016

Bug ID: BUG-016  
Title: Stripe webhook is non-idempotent and returns HTTP 200 on verification/processing errors  
Severity: Medium  
Category: Payment webhook reliability  
Affected Feature: Stripe payment synchronization  
File Path: `app/api/stripe/route.js`  
Line Number: 9-70  
Description: Repeated success events can increment voucher usage repeatedly, no event ID is stored, and catch returns default HTTP 200, preventing Stripe retry on transient processing failures and masking invalid signatures.  
Steps to Reproduce: Replay a valid success event or submit an invalid signature.  
Expected Result: Idempotent processing; invalid signature 400; transient internal failure 5xx.  
Actual Result: Reprocessing is possible and errors return 200 JSON.  
Error Message: Live callback intentionally not sent.  
Root Cause: No webhook event ledger/idempotent update and missing response status.  
Recommended Fix: Persist Stripe event IDs, use conditional state transitions, and return correct 4xx/5xx statuses.  
Verification Status: Confirmed by code-path inspection.

## BUG-017

Bug ID: BUG-017  
Title: User schema required fields are misspelled and Clerk image field names disagree  
Severity: Medium  
Category: Data model  
Affected Feature: Clerk user synchronization  
File Path: `models/user.js`; `config/inngest.js`  
Line Number: 4-7; 18-23  
Description: Schema uses `reqired` instead of `required`, so validation is disabled. Schema defines `imageURL` while sync writes `imageUrl`, which strict Mongoose drops. User schema also lacks timestamps while growth analytics queries `createdAt`.  
Steps to Reproduce: Validate a User without name/email/image or process Clerk creation, then query growth.  
Expected Result: Required fields enforced, image stored, growth dates available.  
Actual Result: Required validators absent; image key mismatches; growth counts have no timestamp source.  
Error Message: N/A  
Root Cause: Schema typos and inconsistent naming/timestamp design.  
Recommended Fix: Correct `required`, standardize image field, enable timestamps, and migrate existing documents.  
Verification Status: Confirmed by schema/job inspection.

## BUG-018

Bug ID: BUG-018  
Title: Invalid product IDs remain in an indefinite loading/blank state  
Severity: Medium  
Category: UX / error handling  
Affected Feature: Product detail  
File Path: `app/product/[id]/page.jsx`  
Line Number: 22-31,140  
Description: Product is searched only in the global list; a missing ID sets undefined and always renders `Loading`, with no terminal empty/not-found state.  
Steps to Reproduce: Open `/product/not-a-valid-id`.  
Expected Result: Clear 404/not-found page.  
Actual Result: Blank/loading route persists.  
Error Message: N/A  
Root Cause: Loading and not-found states are conflated.  
Recommended Fix: Track fetch completion separately and render `notFound()` or a visible empty state.  
Verification Status: Confirmed in browser.

## BUG-019

Bug ID: BUG-019  
Title: Cart total crashes when a persisted product was deleted/unavailable  
Severity: Medium  
Category: Runtime robustness  
Affected Feature: Cart  
File Path: `context/AppContext.jsx`  
Line Number: 129-135  
Description: `getCartAmount` dereferences `itemInfo.offerPrice` without checking whether the product still exists, unlike cart-row rendering which skips missing products.  
Steps to Reproduce: Persist a cart product ID absent from the fetched product list and render cart/summary.  
Expected Result: Missing product is removed or shown unavailable.  
Actual Result: `itemInfo` is undefined and total calculation throws.  
Error Message: `Cannot read properties of undefined (reading 'offerPrice')`.  
Root Cause: Stale cart references are not reconciled.  
Recommended Fix: Guard lookup, remove/flag stale entries, and calculate server-side at checkout.  
Verification Status: Confirmed by deterministic code path.

## BUG-020

Bug ID: BUG-020  
Title: Tablet landing layout has horizontal overflow  
Severity: Low  
Category: Responsive UI  
Affected Feature: Landing page  
File Path: `app/page.jsx` and composed landing components  
Line Number: 1  
Description: At an executed 768x900 viewport, document `scrollWidth` is 782 while `clientWidth` is 768.  
Steps to Reproduce: Open `/`, set viewport to 768x900, compare root scroll/client widths.  
Expected Result: No horizontal document overflow.  
Actual Result: 14px horizontal overflow.  
Error Message: N/A  
Root Cause: A composed child exceeds the tablet viewport; exact element requires layout isolation.  
Recommended Fix: Inspect fixed widths/margins at `md`, constrain media/containers, and add responsive visual tests.  
Verification Status: Confirmed by browser automation.

## BUG-021

Bug ID: BUG-021  
Title: API failures and authorization failures frequently return HTTP 200  
Severity: Medium  
Category: API contract / error handling  
Affected Feature: Orders, products, user data, search, Stripe webhook  
File Path: `app/api/order/list/route.js`; `app/api/order/create/route.js`; `app/api/product/list/route.js`; `app/api/product/search/route.js`; `app/api/user/data/route.js`; `app/api/stripe/route.js`  
Line Number: 12-14,27-28; 13-14,75-77; 13; 25; 14,18; 68-70  
Description: Failure JSON omits response status in multiple handlers. Executed unauthenticated `/api/order/list` returned HTTP 200 with `success:false`; product DB failure also returned 200.  
Steps to Reproduce: GET `/api/order/list` while signed out; GET `/api/product/list` with unavailable DB.  
Expected Result: 401 and 500 respectively.  
Actual Result: HTTP 200 for both.  
Error Message: `{"success":false,"message":"User belum login."}` and MongoDB DNS error JSON.  
Root Cause: `NextResponse.json` status option omitted.  
Recommended Fix: Standardize error middleware/helpers and response schemas/statuses.  
Verification Status: Confirmed by HTTP probes.

## BUG-022

Bug ID: BUG-022  
Title: Upload endpoints accept unrestricted file type and size  
Severity: Low  
Category: File upload security  
Affected Feature: Product and rental-condition images  
File Path: `app/api/product/add/route.js`; `app/api/product/update-product/[id]/route.js`; `app/api/order/update-order/[id]/route.js`  
Line Number: 34-60; 36-52; 21-56  
Description: Files are buffered fully in memory and uploaded as `resource_type:auto` or without MIME/size/count validation. Update endpoints are also unauthenticated.  
Steps to Reproduce: Supply oversized/non-image multipart parts.  
Expected Result: Early rejection by count, MIME, extension, and byte limit.  
Actual Result: Handler buffers and attempts upload.  
Error Message: Live upload intentionally not executed.  
Root Cause: Missing upload policy and streaming limits.  
Recommended Fix: Authenticate first, cap request/file sizes and counts, allow-list decoded image types, and transform/store only safe formats.  
Verification Status: Confirmed by code-path inspection.
