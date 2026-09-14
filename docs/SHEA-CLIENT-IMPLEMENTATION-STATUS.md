# Shea Client UX and checkout implementation

## Implemented

- Dedicated Browse tab, guest browsing/profile access, and retained animated navigation.
- Responsive product grids, stable product/variant routes, filter drafts, niche filtering, and request sequencing for search.
- Order review with an explicit delivery address, pickup mode, server-priced totals, and retry feedback.
- Account-scoped cart storage and clearing of private in-memory data when the account changes.
- Server-side product ownership, availability, quantity, stock, and pricing validation; account-scoped order request keys for retry protection.
- Order details use fulfillment status and item/fee totals rather than a fabricated ETA.
- Gift quotation review with quoted lines, expiry, address selection, acceptance confirmation, and navigation to the resulting order.
- Pickup quotations no longer require a delivery address; fulfillment uses the accepted quote snapshot.
- Improved order card RTL/typography, quantity controls, order-history states, and readable notification messages.
- Catalog inventory policy now resolves from the underlying product and is requested by the client. Non-tracked products use the same availability rule across grids, variants, and cart quantities.
- Session refresh is single-flight, updates observable credentials, and rejects late responses after logout/account switching. A transient network failure does not clear the account.

## Verification

- Backend TypeScript build passed.
- Client TypeScript check passed.
- Six isolated checkout regression tests passed (`npm run test:checkout` in backend).
- Twelve client domain tests cover inventory availability, session refresh, and authenticated transport (`npm run test:unit` in shea-client).
- GraphQL schema validation passed; 13 order/gift/product/partner documents validated against the generated schema.
- Expo iOS and Android production JavaScript exports passed. These are not signed native builds or device tests.

## Deployment dependency

Deploy the backend before the updated client. The new client requires `previewCheckout` and updated order/gift fields.

The migration `202609130001_client_checkout` adds the unique request key and permits pickup orders without an address. It has NOT been applied by this work. Back up the target database, review pending migrations, then run the project's normal Prisma migration deployment and backend rebuild/restart procedure.

## Remaining release validation

- Test guest browsing, sign-in return paths, and account switching on physical iPhone/iPad and Android devices.
- Test English/Arabic, large text, keyboard overlap, Android navigation modes, and the animated tab bar.
- Test normal delivery, pickup, quote acceptance, and network interruption against a migrated staging database.
- Exercise concurrent checkout with real PostgreSQL. Mock tests establish validation and sequential idempotency, not database concurrency behavior.
- Complete stock reservation/cancellation reconciliation across POS, online orders, and gift production. This pass validates stock at checkout but does not introduce a unified inventory reservation ledger.
- Verify non-inventory-tracked products against the deployed backend on a physical device.
- Finish broader address editing/geocoding, credential storage hardening, and accessibility/device coverage from the UX audit before declaring the entire app production-ready.
- The existing native Jest preset lacks `@react-native/jest-preset`; the separate Node unit configuration does not replace native component tests.

No live customer records were edited, no migration was deployed, and no app-store build was submitted.
