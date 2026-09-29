# Venture Test Checklist

Legend: `PASS` executed and met expectation; `FAIL` executed/static deterministic check found a defect; `BLOCKED` attempted or required environment/account/service was unavailable; `NOT TESTED` not executed and not claimed.

## Discovery and build

- [PASS] Repository structure and entry points inventoried.
- [PASS] Package manifest and installed top-level dependencies inspected.
- [PASS] All page and API route files enumerated.
- [PASS] Environment variable names inventoried without exposing values.
- [PASS] Mongoose models and relationships inspected.
- [FAIL] `.env` secret file is not tracked by Git.
- [PASS] Existing automated test/config discovery completed (none found).
- [PASS] Dependency tree resolves with `npm ls --depth=0`.
- [PASS] `npm audit` reports no known advisories.
- [FAIL] Project lint command completes successfully.
- [FAIL] TypeScript validation completes successfully.
- [FAIL] Next.js production build completes successfully.
- [PASS] Next.js development server starts.
- [FAIL] Daily revenue route exports a usable handler.

## Public frontend

- [PASS] Landing page renders static content.
- [BLOCKED] Landing product data renders from MongoDB.
- [PASS] About page renders.
- [PASS] FAQ page renders.
- [PASS] Contact page renders.
- [BLOCKED] Product listing renders database products.
- [BLOCKED] Search returns matching database products.
- [BLOCKED] Search empty result state renders correctly.
- [FAIL] Invalid product ID presents a terminal not-found state.
- [BLOCKED] Valid product detail and image carousel work with database content.
- [BLOCKED] Add-to-cart works from a valid product.
- [NOT TESTED] Product image failure fallback.
- [NOT TESTED] Keyboard-only navigation.
- [NOT TESTED] Screen-reader semantics.

## Cart and checkout

- [PASS] Empty cart page renders zero items and totals.
- [BLOCKED] Add product to persisted authenticated cart.
- [BLOCKED] Remove product from persisted cart.
- [BLOCKED] Update quantity in persisted cart.
- [FAIL] Deleted/unavailable product is handled safely in total calculation.
- [BLOCKED] Cart persists across authenticated reload/session.
- [BLOCKED] Address list loads for authenticated user.
- [PASS] Address-list API rejects unauthenticated request with HTTP 401.
- [BLOCKED] Add-address form persists a valid address.
- [BLOCKED] Address field validation behavior.
- [FAIL] Backend verifies selected address belongs to current user.
- [FAIL] Backend rejects missing/non-array order items with a correct 4xx.
- [FAIL] Backend rejects zero/negative/fractional quantities.
- [FAIL] Backend handles nonexistent products without exception.
- [FAIL] COD order endpoint initializes database connection explicitly.
- [BLOCKED] Duplicate-submit prevention under live latency.
- [BLOCKED] Successful COD order and cart clearing.
- [NOT TESTED] Concurrent checkout race behavior.

## Authentication and authorization

- [BLOCKED] Clerk login.
- [BLOCKED] Clerk registration.
- [BLOCKED] Clerk logout.
- [BLOCKED] Session persistence.
- [BLOCKED] Expired session handling.
- [FAIL] `/seller` UI blocks signed-out users.
- [FAIL] Product seller-list API blocks non-sellers.
- [FAIL] Seller authorization fails closed when Clerk errors.
- [FAIL] Product update/delete requires seller role.
- [FAIL] Order update requires seller role.
- [FAIL] Voucher create/delete/list requires seller role.
- [FAIL] Sanction create/update/delete/list requires seller role.
- [FAIL] User list and analytics require seller role.
- [PASS] User order query is scoped to authenticated user ID.
- [BLOCKED] Cross-user order data-isolation attack with two test accounts.

## Orders and rental lifecycle

- [BLOCKED] Create a valid order end-to-end.
- [BLOCKED] Retrieve authenticated order history.
- [BLOCKED] Seller retrieves all orders.
- [FAIL] Canonical order status enum is enforced.
- [FAIL] Allowed order transition graph is enforced.
- [FAIL] Arbitrary status transition is rejected.
- [NOT TESTED] Order cancellation UI.
- [NOT TESTED] Cancellation API (not implemented).
- [FAIL] Payment status enum and synchronization exist.
- [FAIL] Product stock/availability is modeled and validated.
- [FAIL] Inngest order event processes exactly one valid order.
- [FAIL] Inngest order processing is idempotent.
- [NOT TESTED] Background retry/dead-letter behavior.

## Payment and vouchers

- [FAIL] Declared Midtrans integration exists (package only; no implementation).
- [FAIL] Stripe amount equals server-authoritative order amount.
- [FAIL] Client cannot choose discount amount.
- [FAIL] Stripe discount uses a valid Stripe representation.
- [FAIL] Voucher expiry is enforced.
- [FAIL] Voucher usage limit is enforced.
- [FAIL] Voucher percent range is enforced.
- [FAIL] Voucher code persists on Order.
- [PASS] Stripe callback signature is verified with raw body and webhook secret.
- [FAIL] Stripe webhook rejects invalid signatures with non-200 response.
- [FAIL] Stripe callback processing is idempotent.
- [BLOCKED] Successful Stripe sandbox checkout.
- [BLOCKED] Failed Stripe sandbox payment.
- [BLOCKED] Cancelled Stripe sandbox payment.
- [NOT TESTED] Real payment (intentionally excluded).

## Admin and analytics

- [BLOCKED] Product add with valid images.
- [FAIL] Product upload enforces MIME/type/size/count server-side.
- [BLOCKED] Product edit end-to-end.
- [BLOCKED] Product delete end-to-end.
- [BLOCKED] Order status update end-to-end.
- [BLOCKED] Before/after rental image upload.
- [BLOCKED] Voucher CRUD end-to-end.
- [BLOCKED] Sanction CRUD end-to-end.
- [BLOCKED] Total users matches database.
- [BLOCKED] Total orders matches database.
- [FAIL] Total revenue filters paid/non-cancelled orders correctly.
- [BLOCKED] Recent orders values match database.
- [BLOCKED] Order status distribution matches database.
- [FAIL] Daily revenue endpoint works.
- [FAIL] User growth has valid `createdAt` data.
- [NOT TESTED] Analytics charts with a non-empty dataset.
- [NOT TESTED] Analytics timezone/date-boundary behavior.

## Database and API robustness

- [BLOCKED] MongoDB connection succeeds in test environment.
- [FAIL] Rejected cached MongoDB connection promise is reset/retryable.
- [FAIL] User required validators are active.
- [FAIL] Clerk image URL field matches User schema.
- [FAIL] Order API and Order schema agree on voucher fields.
- [FAIL] Invalid ObjectIds consistently return HTTP 400.
- [FAIL] Authentication failures consistently return 401/403.
- [FAIL] Server/database failures consistently return HTTP 5xx.
- [FAIL] API response shapes are consistent.
- [NOT TESTED] Database transaction rollback under partial failure.
- [NOT TESTED] Duplicate-record race tests.

## Responsive and browser behavior

- [PASS] Landing page has no horizontal overflow at 375px.
- [FAIL] Landing page has no horizontal overflow at 768px.
- [PASS] Landing page has no horizontal overflow at 1440px.
- [PASS] Browser console logs collected.
- [FAIL] Browser runs without Clerk development-key warnings.
- [FAIL] Above-the-fold images have appropriate LCP priority.
- [FAIL] Seller sidebar images preserve aspect-ratio sizing.
- [NOT TESTED] Safari/WebKit browser compatibility.
- [NOT TESTED] Firefox browser compatibility.
