# Venture End-to-End Test and Technical Audit

> Remediation addendum (2026-09-26): all 21 code-remediable findings now have fixes. BUG-001 still requires credential rotation/history cleanup, and BUG-017 requires an existing-data migration when external services are available. Current verification: 11/11 regression tests pass, ESLint and TypeScript pass, production build passes, protected runtime probes return 401, and browser checks pass at 375/768/1440px. See `BUG_REPORT.md` for per-bug status.

Audit date: 2026-09-26  
Repository: `C:\Users\Lenovo\OneDrive\Documents\venture`  
Scope: read-only application audit; only this report and its companion audit artifacts were added.

## Project overview

Venture is a single Next.js 15.1.6 App Router application. The UI and server API handlers live in the same repository under `app/`; there is no Express entry point or separate backend service. Persistence is MongoDB through Mongoose, identity is Clerk, images use Cloudinary, background jobs use Inngest, and the implemented payment integration is Stripe. `midtrans-client` is installed but no Midtrans route or runtime integration exists.

### Entry points and architecture

- Frontend root: `app/layout.js`; landing page: `app/page.jsx`.
- API entry points: 30 Next.js route handlers below `app/api/**/route.js`; `app/api/order/get-daily-revenue/route.js` is empty.
- Request middleware: `middleware.ts` installs Clerk middleware globally but does not protect routes.
- Database: `config/db.js`; Mongoose models: User, Product, Order, Address, Voucher, Sanction.
- Background jobs: `config/inngest.js`, exposed by `app/api/inngest/route.js`.
- Local commands: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- Automated tests: none found; no Jest, Vitest, or Playwright configuration.

### Environment variables discovered

`NEXT_PUBLIC_CURRENCY`, Clerk publishable/secret keys, `MONGODB_URI`, Inngest signing/event keys, Cloudinary cloud/API credentials, and Stripe publishable/secret/webhook keys. Values were not copied into this report. `.env` is tracked by Git, which is a critical credential-exposure finding.

## Feature inventory (actual implementation)

User pages: landing, about, FAQ, contact, all products/search, product detail, cart, add address, order placed, and order history. Clerk supplies account UI. Cart state is maintained in application context and persisted to the User document for authenticated users.

Seller pages: dashboard analytics, add/list/edit/delete products, orders and rental-condition images, user list, sanctions, vouchers, and reports. The seller layout itself contains no access control.

APIs: product list/search/add/seller-list/update/delete; cart get/update; user data/address/user list/user totals/growth; order create/list/seller list/update, Stripe checkout, totals/revenue/status/recent; voucher validate/list/create/delete; sanction list/create/update/delete; Stripe webhook; Inngest handler.

Not implemented: Express server, Midtrans transaction flow/callback, explicit product stock/availability, payment-status enum, cancellation endpoint, enforced order transition state machine, and daily revenue API implementation.

## Test environment

- Windows PowerShell, Node.js/npm from the local environment.
- Next.js dev server at `http://localhost:3000`.
- Browser automation through the Codex in-app Chromium browser.
- Responsive widths executed at 375x900, 768x900, and 1440x900.
- Existing `.env` was loaded, but secret values were never displayed or recorded.
- MongoDB was unreachable from the test runtime: `querySrv ENOTFOUND _mongodb._tcp.cluster0.ealxv.mongodb.net`.
- No production data was changed and no payment was initiated.

## Commands executed

| Command/check | Result |
|---|---|
| `npm ls --depth=0` | PASS; installed dependency tree resolved. |
| `npm audit --json` | PASS; 0 known vulnerabilities across 520 dependencies at audit time. |
| `npm run lint` | FAIL; `Cannot serialize key "parse" in parser: Function values are not supported.` |
| `npm run build` (restricted) | BLOCKED by sandbox `spawn EPERM`; rerun outside restriction. |
| `npm run build` (approved unrestricted worker execution) | FAIL; compilation succeeded, then ESLint failed and TypeScript rejected the empty daily-revenue route. |
| `npx tsc --noEmit --incremental false` | FAIL; TS2306 for empty `get-daily-revenue/route.js`. |
| `npm run dev` | PASS; ready in 6.3s and landing route compiled. |
| Browser route sweep | PARTIAL; public pages rendered, database-backed content was blocked. |
| Responsive overflow probe | FAIL at 768px only: client 768px, document 782px. PASS at 375px and 1440px. |
| Safe unauthenticated API probes | Mixed; `/api/order/list` returns auth failure with HTTP 200; `/api/user/get-address` correctly returns 401; empty daily-revenue route returns 405. |

## Build and runtime results

Production build does not complete. Exact terminal evidence:

```text
ESLint: Cannot serialize key "parse" in parser: Function values are not supported.
.next/types/app/api/order/get-daily-revenue/route.ts:2:24
Type error: File '.../app/api/order/get-daily-revenue/route.js' is not a module.
```

The dev server renders static content. Database-backed calls fail in this environment with:

```text
querySrv ENOTFOUND _mongodb._tcp.cluster0.ealxv.mongodb.net
```

This blocked authenticated data workflows and database truth-checking. Browser console warnings also identify Clerk development keys, missing `priority` on above-the-fold images, and seller sidebar images with one-sided CSS resizing.

## Features tested

Executed browser navigation covered `/`, `/about`, `/faq`, `/contact`, `/all-products`, `/cart`, `/my-orders`, `/add-address`, `/seller`, and `/product/not-a-valid-id`. Static pages rendered. Cart empty state and zero totals rendered. The invalid product page never presents a not-found state. The unauthenticated seller URL renders its navigation/layout shell. At tablet width, the landing document overflows horizontally.

Static and request-level review covered every API route, model, authentication helper, environment reference, checkout calculation, Stripe webhook, and Inngest function. Deterministic code-path checks are counted as executed tests. Full scenario status is in `TEST_CHECKLIST.md` and confirmed defects are in `BUG_REPORT.md`.

## Passed tests

- Dependency tree resolves and npm audit reported zero known advisories.
- Development server starts.
- Landing, about, FAQ, and contact pages render without an application-error screen.
- Cart empty state renders with a zero subtotal/tax/total.
- 375px and 1440px landing widths have no document-level horizontal overflow.
- Address-list API rejects an unauthenticated request with HTTP 401.
- Stripe webhook calls `constructEvent` with the raw request body and configured webhook secret.
- User order list scopes its query to the authenticated Clerk user ID.

## Failed tests

Production build, standalone lint, type checking, daily revenue endpoint, unauthenticated order-list status semantics, invalid-product handling, seller UI protection, tablet overflow, database-backed product loading in this environment, and multiple security/validation checks failed. See `BUG_REPORT.md` for 22 confirmed issues.

## Blocked tests

MongoDB DNS/connectivity blocked all database-dependent end-to-end CRUD and analytics verification. No seller/user test accounts or sandbox payment session were supplied, so login/register/logout/session expiry, role-based UI behavior, live Cloudinary uploads, authenticated checkout, Stripe redirects/callbacks, and user-isolation attacks could not be executed end-to-end. Real financial transactions were intentionally not attempted.

## Untested features

Destructive database mutations, actual image uploads, successful order creation, fulfilled Stripe checkout, concurrent stock/order races, Clerk session expiration, Inngest delivery/retry behavior, screen-reader testing, keyboard-only coverage, and cross-browser testing were not executed. Midtrans could not be tested because it is not implemented.

## Overall summary

The application is not release-ready. It starts in development and its static pages render, but production build is broken and backend authorization is absent on a broad set of seller/admin endpoints. The highest-risk defects are the tracked credential file and unrestricted administrative mutations. Next priorities are server-side authorization, credential rotation/removal from history, build restoration, then server-authoritative checkout/order validation and background/payment idempotency.

### Final counts

- Total scenarios catalogued: 126
- Executed: 73
- Passed: 20
- Failed: 53
- Blocked: 39
- Untested: 14
- Confirmed bugs: 22
- Severity: 2 Critical, 10 High, 8 Medium, 2 Low

### Affected files

`.env`, `eslint.config.mjs`, `middleware.ts`, `lib/authSeller.js`, `config/db.js`, `config/inngest.js`, `models/user.js`, `models/order.js`, `app/product/[id]/page.jsx`, `context/AppContext.jsx`, `app/seller/layout.jsx`, and multiple handlers under `app/api/order`, `app/api/product`, `app/api/voucher`, `app/api/sanction`, and `app/api/user` (fully enumerated in `BUG_REPORT.md`).

### Recommended repair order

1. Rotate all exposed credentials, remove `.env` from tracking and Git history, and add a safe `.env.example`.
2. Add default-deny server-side authentication and seller-role authorization to every administrative read/write endpoint and seller route.
3. Fix the empty route and ESLint configuration so CI/build can pass.
4. Make order/payment calculations server-authoritative; validate quantities, products, address ownership, vouchers, totals, and status transitions.
5. Repair Inngest order handling and add idempotency to background jobs/webhooks.
6. Correct schemas/data consistency and analytics filters.
7. Add automated unit/API/Playwright suites, then retest with isolated MongoDB, Clerk test users, Cloudinary test folder, and Stripe sandbox.
