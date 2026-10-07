# Rental Identity Verification & Guarantee

## Implementation

Uses the existing Clerk session, MongoDB identity resolver (including legacy IDs), seller role guard, Cloudinary credentials, Tailwind styles, Axios and react-hot-toast. No new role or notification infrastructure. Existing refundable deposit logic remains unchanged.

All new rentals require VERIFIED status. Verification remains valid until an explicit future expiration/revocation policy is introduced; no arbitrary expiry is assumed.

## Database

New collection: rentalverifications, model rentalVerification.
Unique userId references the existing string Mongo User _id, not a client-supplied Clerk ID.
Stores the selected KTP/SIM type, contact and emergency information, consent timestamp, lifecycle/review timestamps and reviewer ID.
Asset references are separate nested publicId/format metadata with select:false. No document numbers, OCR, binary image data, or public document URLs.
The unique index is initialized before submission. Conditional submission locks and atomic review updates prevent duplicate submissions, pending edits and simultaneous conflicting reviews.
No existing Mongo users or orders were migrated or deleted.

## Pages and navigation

- /account/verification: five-step form, previews, consent, progress, error and status views.
- /seller/verifications: Pending default, status filters, pagination, authorized detail modal and approve/reject confirmation.
- Existing account menu includes Identity Verification and its badge on desktop/mobile.
- Existing checkout includes Rental Verification and disables final actions until VERIFIED.
- Existing seller sidebar includes Verifications.

## APIs

| Method | Route | Permission |
| --- | --- | --- |
| GET | /api/verification/data | Authenticated owner; identity derived from session |
| POST | /api/verification/submit | Owner, NOT_SUBMITTED only |
| PUT | /api/verification/submit | Owner, REJECTED only |
| GET | /api/verification/list | Existing seller role |
| GET | /api/verification/detail/[id] | Existing seller role |
| PATCH | /api/verification/review/[id] | Existing seller role; PENDING only; cannot review self |
| GET | /api/verification/image/[id]/[kind] | Owner or seller; kind=document or selfie |

Review payload: action=approve or reject; rejectionReason required for reject.
Submission multipart fields: data JSON, documentImage, selfieImage. Status/reviewer/timestamps are always server assigned.
Other users' image access returns 404. Normal users cannot invoke admin list/review.
Responses containing sensitive data and images use private/no-store caching. Storage URL and credentials never reach the client.

## Server enforcement

app/api/order/create/route.js and app/api/order/stripe/route.js call requireRentalVerification immediately after resolving the Mongo user, before reservations, Order.create or Stripe session creation.
Non-VERIFIED users receive 403 VERIFICATION_REQUIRED. Browsing, cart and other pages are unaffected.

## Storage/security and retention

Cloudinary uploads use type=authenticated, random public IDs and JPEG/PNG/WebP only.
Each file max 5 MB; combined request max 11 MB, enforced while reading the stream.
MIME and file signatures are validated; Cloudinary also decodes the image.
Image proxy authorizes each request then consumes a signed download URL expiring after 60 seconds entirely on the server.
The browser sees only the authenticated application image endpoint.
No identity payload/URL logging or analytics instrumentation was introduced.
Self-review and invalid status transitions are refused. REJECTED resubmission clears previous review/rejection fields.

purgeVerificationImages is provided for a future authorized retention job; deletes image assets while retaining metadata and rental relationships.
A specific retention period and scheduled purge are not configured because the project has no identity-retention policy.
Old rejected images are deleted on successful replacement. Failed uploads are cleaned up where possible.
A process crash or a Cloudinary deletion outage can leave an orphan private asset; operational reconciliation/retry is still needed in that case.
Authorized reviewers can save/screenshot images; no browser mechanism can prevent that.
Storage credentials and seller accounts must remain trusted.

No new environment variables. Existing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and Clerk/Mongo configuration are reused.

## Verification results

- npm test: 40/40 PASS, including behavioral handler tests for KTP approval, SIM reject/resubmit/approval, pending/verified edit rejection, repeated reviews, direct checkout gate C-F, role denial and image IDOR.
- Handler tests use in-memory dependencies and synthetic contact/image data. They do not claim full authenticated browser checkout or payment execution.
- npm run lint: PASS, zero errors; one existing unrelated components/about.jsx image warning.
- npm run build: PASS, 63 pages/routes generated. An initial OneDrive EINVAL cache issue was resolved by deleting only generated .next output.
- Production HTTP smoke tests: account verification page 200; user data/list/detail/image/submit/review APIs without session 401; both checkout APIs without session 401.
- Live Cloudinary test with a synthetic 1-pixel PNG: unsigned authenticated URL DENIED, ordinary public product URL DENIED, signed private download PASS.
- Both temporary synthetic Cloudinary test assets were deleted.
- No real identity documents or demo users were seeded.
- Authenticated browser flow, visual device checks and a real payment were not exercised in this run.

## Files created

- models/rentalVerification.js
- lib/verificationRules.mjs
- lib/verificationStorage.js
- lib/rentalVerification.js
- app/api/verification/data/route.js
- app/api/verification/submit/route.js
- app/api/verification/list/route.js
- app/api/verification/detail/[id]/route.js
- app/api/verification/review/[id]/route.js
- app/api/verification/image/[id]/[kind]/route.js
- components/VerificationStatus.jsx
- app/account/verification/page.jsx
- app/seller/verifications/page.jsx
- tests/verification.test.mjs
- scripts/verify-private-verification-storage.mjs
- RENTAL_VERIFICATION_REPORT.md

## Files modified

- app/api/order/create/route.js
- app/api/order/stripe/route.js
- components/OrderSummary.jsx
- components/Navbar.jsx
- components/seller/Sidebar.jsx

Pre-existing changes to app/layout.js and public/venture-mountain-hero.png were left untouched.

## Mobile upload lifecycle fix

Root cause in the existing code: useVerification registered a window focus listener and set its initial loading flag to true on every status refresh. VerificationPage replaced the entire form subtree with a skeleton while that flag was true. Returning from a native gallery/camera picker can fire focus before the file input change event, removing the input that should receive the selected File. An already-captured File was held in parent state, but the remounted native input was empty and the UI did not show a persistent selected-file indicator.

The current architecture uploads both images on final submit, not when selecting a file. Selection creates only a local blob preview; the submit API receives multipart Files, uploads each to authenticated Cloudinary, persists publicId/format internally and returns a PENDING summary. There is no upload-response URL field for the frontend to read. This contract remains unchanged.

Fix: background status refresh no longer activates the initial-loading skeleton; focus refresh is suspended during editing; loading/errors never replace an active verification form. Focus requests are deduplicated, stale responses ignored and effects depend on user ID rather than the mutable user object. File capture is synchronous and the parent File/preview state survives step navigation and normal rerenders.

Document/selfie track selected/uploading/success/error independently. Success is assigned only after the server confirms PENDING, because selection is not a storage upload. The UI shows selected-ready status and Replace Image before submission. Network errors retain Files and previews and expose an explicit Retry Upload action. Duplicate submits remain blocked by a synchronous ref. Unsupported MIME and files above 5 MB show explicit errors without clearing an earlier valid selection.

Changed for this fix:
- app/account/verification/page.jsx
- components/VerificationStatus.jsx
- tests/verification-mobile-upload.test.mjs (new)
- tests/verification.test.mjs
- RENTAL_VERIFICATION_REPORT.md

Verification: npm test 45/45 PASS; npm run lint PASS (one existing unrelated image warning); npm run build PASS, 63 pages/routes. New tests execute actual JSX/hooks with a deterministic hook harness, simulate focus/loading, file selection, back/continue, normal rerenders, slow/failed network, duplicate submissions, same-file replacement and MIME/size errors. A real multipart Request test proves the submit handler receives Files and stores only mocked storage identifiers. Mobile camera/gallery interactions are simulated; no physical mobile device or live authenticated document upload was used in this fix. No backend, storage, identity schema, rental/payment/order implementation or upload limit was changed.
