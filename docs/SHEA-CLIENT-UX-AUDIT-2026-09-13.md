# Shea Client: Product, UX and UI Audit
Date: September 13, 2026
Status: Analysis for approval. No app or backend implementation changes.

## Scope and confidence
Reviewed the client route structure, home, catalog, stores, product details, cart, checkout, gift estimates, order details, notifications, login/OTP, profile, phone verification, addresses, deletion entry point, shared components, localization, state persistence, and the backend order-creation boundary.

This is a source-based audit supported by the screenshots previously supplied in this conversation. Those screenshots are historical, not proof of current rendering. No current native app session was running for inspection. I did not complete a purchase, send OTP, delete an account, test physical-device accessibility, or measure real customer conversion. Visual judgments about clipping, keyboard overlap, tablet layout, and animation need device validation.

TypeScript check passed. English/Arabic JSON key parity passed across all eight namespace files. Neither establishes correct runtime behavior or good translation quality. Contrast was calculated from the current theme constants.

## Product assessment
Shea has the foundation for a useful local shopping app: guest browsing, stores, a reusable product grid, variant selection, carts grouped by partner, pickup/delivery, gift estimates, and account controls. The pink identity, Urbanist/Zain pairing, and animated navigation are worth retaining.

The largest gap is continuity. A customer should always know which store they are buying from, which variant they selected, where it will arrive, the amount they will pay, and what happens next. Several current screens omit or contradict those facts. Fixing these gaps should precede decorative additions.

Success should mean: a customer can confidently discover, choose, order, and follow their purchase with little explanation.

## Highest-priority findings

### 1. Account-specific shopping data is not isolated
Evidence: [shea-client/src/controller/order.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/controller/order.ts:50), [shea-client/src/controller/address.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/controller/address.ts), [shea-client/src/controller/auth.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/controller/auth.ts:178).
Cart, placed orders, and addresses use fixed persistence keys. Signing out clears auth state without clearing those stores. This creates a risk that account B sees account A's cached addresses or history, especially during failed refresh or offline use. Deletion has the same local-data concern.
Proposal: user-scoped storage and queries, explicit logout/deletion cleanup, cancellation of old-account requests, and an intentional guest-cart policy.
Acceptance: after switching accounts offline or online, no prior account data is visible.

### 2. Order detail can display the wrong stage
Evidence: [shea-client/src/app/(main)/(tabs)/(cart)/order.tsx](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/app/(main)/(tabs)/(cart)/order.tsx:21), [shea-client/src/graphql/order.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/graphql/order.ts).
Queries return delivery.status. The detail screen instead reads order.status and defaults to ACCEPTED, while the order card reads delivery.status. A card and its detail can disagree; the fallback can say a driver is on the way without that state being returned.
Proposal: one normalized status presentation for normal orders and a separate mapping for gift workflows. Unknown must remain unknown.
Acceptance: pending, accepted, ready, picked up, delivered, canceled, and missing-state fixtures show consistent truthful copy.

### 3. Checkout has no explicit final address and price review
Evidence: [shea-client/src/app/(main)/(tabs)/(cart)/_components/delivery-dialog.tsx](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/app/(main)/(tabs)/(cart)/_components/delivery-dialog.tsx), [shea-client/src/controller/order.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/controller/order.ts), [backend/src/schema/order/mutations.ts](/Users/zakaria/Desktop/cosmetica/shea/backend/src/schema/order/mutations.ts:28).
Normal checkout submits items and receiving method but no selected address. Backend falls back to the default address, including before pickup handling. Gift checkout chooses the first/default address silently. The confirmation sheet has no complete fee/payment review.
Proposal: dedicated checkout showing store, items, receiving method, selected address or pickup location, fee breakdown, payment method, and one explicit submit action.
Acceptance: delivery cannot be confirmed without a visible selected destination; pickup does not require an unrelated saved delivery address.

### 4. Price integrity needs backend correction
Evidence: [backend/src/schema/order/mutations.ts](/Users/zakaria/Desktop/cosmetica/shea/backend/src/schema/order/mutations.ts:80).
The reviewed createOrder resolver totals caller-provided prices and creates the submitted lines directly. It does not establish authoritative catalog pricing, item-to-partner membership, availability, or stock before creating the order.
Proposal: server validates every line, quantity, partner, availability and current price; calculates the final payable amount; prevents duplicates using an idempotency key. The UI shows a price-change review when necessary.
Acceptance: stale or modified client prices cannot determine the order amount; retry after a lost response cannot create a second order.

### 5. Receipt and order-card totals are inconsistent
Evidence: [shea-client/src/app/(main)/(tabs)/(cart)/order.tsx](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/app/(main)/(tabs)/(cart)/order.tsx:123), [shea-client/src/app/(main)/(tabs)/(cart)/_components/order-card.tsx](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/app/(main)/(tabs)/(cart)/_components/order-card.tsx).
Detail labels a fee-inclusive total as Subtotal, then lists fees again. Order cards show item totals without those fees. Detail shows a fixed 30-45 minute estimate and lists store information under Delivery Information.
Proposal: use authoritative subtotal, fees, discount and total; clearly separate store/pickup information from delivery destination. Show an ETA only when supported by operational data.
Acceptance: totals reconcile across checkout, confirmation, list and detail.

### 6. Cart identifiers can collide
Evidence: [shea-client/src/controller/order.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/controller/order.ts:214).
A new cart ID is array length + 1. Delete an earlier cart and create another: an existing ID can be reused. Removal filters by ID, so collisions can remove more than one cart. Quantity updates also lack a maximum-stock check and removing the final line leaves an empty cart shell.
Proposal: stable cart IDs, explicit per-store grouping, consistent quantity rules and removal of empty groups.
Acceptance: adding/removing/reordering multiple store carts never targets the wrong group.

### 7. Search/filter updates can be lost
Evidence: [shea-client/src/controller/product.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/controller/product.ts:167), [shea-client/src/app/(main)/(tabs)/(product)/product/index.tsx](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/app/(main)/(tabs)/(product)/product/index.tsx:112).
Product requests are skipped while another request is loading. A changed search may therefore be ignored while old results arrive. Home and listings also share the same product-partner collection. The niche selection is not included in the product request, and Clear leaves niche/partner filters in place.
Proposal: query-keyed results, latest-request handling, complete filter inputs, and separate home collections. Clear should accurately communicate whether it clears optional filters or store scope.
Acceptance: rapid typing and navigation always end with results for the visible query.

### 8. Key text colors are too faint
Evidence: [shea-client/src/constants/theme.ts](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/constants/theme.ts), [shea-client/src/components/ui/button.tsx](/Users/zakaria/Desktop/cosmetica/shea/shea-client/src/components/ui/button.tsx).
White against light-theme primary #E295B5 is approximately 2.28:1; the same pink against white also has that ratio. Primary buttons use white text and product prices use pink text on white.
Proposal: retain pale pink for surfaces; choose a darker action/text color or suitably dark label color and verify every semantic combination.
Reference: [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) uses 4.5:1 for normal text and 3:1 for large text. This is a design benchmark, not a claim that the app has undergone accessibility certification.

## Proposed navigation
Keep the animated bar and its safe-area separation. Proposed destinations: Home, Browse, Orders, Account. Put a cart shortcut with quantity badge in shopping headers and an inbox shortcut with unread badge. Cart remains one tap away throughout discovery; active orders get a prominent entry on Home.

This changes the current Home/Cart/Notifications/Profile structure, so it is a product decision for approval. If preserving a cart tab is preferred, Home/Cart/Orders/Account is a viable alternative, with Browse reached through an always-visible search field and category entry.

Orders contains normal orders and gift requests with clear filters. Gifts stay discoverable through Home and eligible stores. They should not return to account settings.

Store page -> product -> variant/quantity -> store cart -> checkout -> order confirmation -> current status.
Gift-capable store -> products -> request estimate -> review quotation -> accept or decline -> preparation -> pickup/delivery.

## Screen-by-screen proposal

| Area | Current observation | Recommended experience |
| --- | --- | --- |
| Entry/login | Guest continuation exists; copy says Welcome Back even for a new customer. Login redirect sends users to Home. | Explain sign-in/registration in one flow; preserve the intended product/cart action and return there after OTP. |
| OTP | Resend timer and masked number exist; raw API errors can appear. | Clear edit-number action, localized expired/incorrect/rate-limit states, paste/autofill checks, stable keyboard layout. |
| Home | Niches, stores, gifts and new products exist; failures mostly go to console. | Visible search, chosen shopping area, categories, eligible stores, gift ideas, new products, active-order shortcut. Each section gets loading/error/retry behavior. |
| Categories/niches | Taxonomy names are surfaced as Niches and layered filters. | Use shopper language such as Categories; progressively disclose category, brand and product type. Preserve backend taxonomy. |
| Store directory | Search and online filter exist; first 50 stores only; no load-more or clear loading state. | Paginated list, category filter, gift-service filter, clear availability labels; location-aware filters only when supported by real data. |
| Store page | A scoped product listing with small name/address header. | Compact store identity, availability, location, supported services and receiving options, followed by scoped search and products. |
| Product grid | Fixed information height aligns price/action; prices have no currency, images use cover, stock is not a card prop. | Same rhythm across screens; readable two-line name, variant/size, DZD, availability, reliable image fallback and honest cart feedback. |
| Product details | Current item stored globally; first variant reset after fetch; CTA disappears for cart items. | Route by store/product ID; preserve chosen variant; clear size/bottle choices, price, availability; persistent Add/View cart or quantity control. |
| Cart | Store groups lack prominent store identity; Confirm/Cancel terminology resembles submitted orders. | Store heading, editable lines, subtotal and Continue to checkout; Remove cart for deletion. Clear per-store checkout explanation. |
| Checkout | Bottom sheet selects normal/gift and pickup/delivery without full review. | Summary screen with final amount and address/payment review; compact sheets only for selecting one option. |
| Gift request | Optional occasion, recipient and card message exist. | Minimal request, optional delivery date, recipient/contact when operationally needed, visible destination and estimate explanation. |
| Quote review | List card offers accept/decline with a total and truncated original lines. | Detail screen showing actual quote lines, extras, fees, expiry, receiving details and next step. Confirm acceptance; explain decline outcome. |
| Order list | Placed orders have no explicit refresh control; empty state reuses EmptyCart. | Active/past filters, meaningful no-orders state, refreshed status, recognizable store and complete total. |
| Order detail | Static selected order, inconsistent status, placeholder ETA; contact/track buttons commented out. | Refetch by order ID, status timeline, last update, accurate receiving info, relevant contact/help actions. Map only with valid tracking data. |
| Notifications | Tappable-looking cards have no onPress; long content is truncated. | Tap opens related order/quote or full message; mark-read accessible without swipe; unread state and badge. |
| Profile | Preferences and account actions exist; phone is grouped under App Preferences. | Account, Addresses, Preferences, Help/Legal sections; guest-accessible language/theme/help. |
| Profile edit | Requires email even for phone accounts; validation English; update busy state uses general loading. | Optional email unless required by product policy, localized validation and operation-specific saving state. |
| Phone change | Separate verified flow already exists. | Retain it, improve same-number error, localized server messages and code-entry edge cases. |
| Addresses | Two-column text cards, tap changes default, coordinates exposed, no edit entry. | Single-column address cards, explicit default marker, Edit/Delete, named place and optional landmark; map/search selection with manual fallback. |
| Account deletion | Visible entry and confirmation exist. | Retain discoverability; validate local cache cleanup and completion/retry behavior alongside server deletion. |
| Legal/help | Profile contains legal pages; guests are redirected from profile. | Make public help/language/legal accessible before sign-in. Verify copy and actual contact details with business owner. |

## Design system and layout
Use a restrained, warm visual language: neutral backgrounds, soft pink accents, dark readable text and purposeful product photography. Do not introduce more decorative cards, badges or borders simply to fill space.

- Use one shared spacing scale, a small radius scale and consistent heading/body/caption roles.
- Separate action colors from decorative brand colors and status colors.
- Preserve Urbanist for English and Zain for Arabic; define script-aware handling for mixed names, email, phone numbers and identifiers.
- Fix missing font styles in order cards/detail; the global font context does not apply fonts automatically to every Text component.
- Product photos should usually use contain against a controlled surface to preserve full packaging. Lifestyle images can use cover.
- Keep card baseline alignment but replace rigid heights where large text would overflow; test long Arabic and mixed-language names.
- Keep the animated navigation, with a predictable resting position, accessible labels, larger readable captions, no content obstruction, and a reduced-motion path.
- Use one bottom-safe-area/content-inset policy. Current screens mix 84/85/104/112/120 pixel allowances.
- Phone grids should adapt to available width; tablet grids should add columns instead of enlarging two cards. Constrain reading and form widths.
- Keyboard-aware checkout and filter sheets must keep final actions reachable. Checkout currently lacks keyboard avoidance and bottom safe-area padding.
- Use icons consistently; screen-specific mixes of Hugeicons, Feather, Ionicons and Material icons need a shared selection policy.

## Localization and accessibility
JSON parity is good, but not sufficient. English validation strings in profile/address forms are shown directly by InputField. Shared confirmation defaults still make address-deletion buttons English. Order cards build plural text by appending a translated suffix, which is unsuitable for Arabic plural forms.

Product details and order screens retain physical row/margin styles and missing text direction rules. Filter titles/actions also lack consistent RTL treatment. Review direction at the component level, not only at the navigator.

Use one localized money formatter everywhere, one date/time policy, explicit LTR for phone/email/IDs, and content-aware display of mixed scripts. Store-provided Arabic text should fall back sensibly without pretending to have been translated.

Accessibility acceptance should include screen-reader names for icon buttons, selected filter/tab states, readable error announcements, scalable text, focus return after dialogs, non-swipe alternatives, and reduced motion. The home search button has a role but no descriptive label; product-card outer navigation also needs a clear accessible name.

## Behavior, state and reliability
Product detail routes should carry stable IDs and fetch their own data. Requiring in-memory currentProductPartner causes blank/back navigation after a cold link. Order detail has the same issue with currentOrder.

Model each remote screen with loading, success, empty, stale and error states. Failed requests must not look like an empty catalog. Refresh indicators must finish in finally blocks. Persisted data should show its freshness and never imply a completed order that the server has not acknowledged.

The order refresh method exposed by useOrder is empty, and there is no explicit current-order polling/subscription path in the reviewed screen. Use foreground refetch plus bounded refresh while an order is active; add push/deep-link integration when the platform delivery path is verified. Do not imply live tracking without it.

Login continuation should preserve intent and selections. Search and category changes should preserve their own scope. Avoid global selection resets that make Home and nested lists overwrite each other's context.

Keep public catalog cache separate from private account data. Introduce a single session teardown boundary that clears private stores, cancels pending requests and unregisters session-specific notification associations as required.

## Address and fulfillment detail
The address form defaults coordinates to zero and validates only that they are numbers. A manually typed address can pass without a real location. Do not treat (0,0) as a location choice. Allow an explicit unresolved/manual address state only if fulfillment supports it; otherwise require confirmed map/search coordinates.

Pickup and delivery need separate prerequisites. Pickup needs a store location and readiness information. Delivery needs a destination, contact and deliverability check. Neither should silently inherit unsuitable data.

Online is a store activity flag, not necessarily proof of business opening hours or delivery coverage. Copy and filtering should reflect the actual available fields.

## Gifts and future perfume bottles
Gifts should be a supported store service, with a clearly different commitment point: sending a request is not accepting a price. The approved quote becomes the pricing basis and produces the normal fulfillment journey.

The current client can already select product variants. Extend that experience for bottle volume/style with concise choices such as 30 ml and 50 ml, price and availability per choice. Do not automatically add a default bottle when the shopper must choose. Generic product naming should preserve both perfume identity and bottle size.

Avoid a separate perfume cart/order implementation. The selected sellable variant should flow through the same server-validated cart, receipt, inventory and tracking contract.

## Proposed architecture
Organize by customer journey, with shared UI underneath:
- Catalog: home collections, store discovery, search, product detail, variants.
- Cart and checkout: account-scoped carts, receiving options, authoritative quote and submit.
- Orders: current/past orders, normal status mapping, detail and support links.
- Gifts: request draft, quotation review, acceptance and link to fulfillment.
- Account: session, profile, verified phone changes, addresses, preferences and deletion.
- Shared UI: Text, Money, ProductCard, StoreCard, Screen, Sheet, Button, Field and AsyncState.

This is an incremental organization proposal. It does not require replacing every library. Typed boundary adapters and query-scoped state address more immediate risk than wholesale rewrites.

## Delivery order for approval
1. Correctness: account isolation, cart IDs/quantities, server pricing and ownership checks, pickup prerequisites, status/total consistency, retry safety.
2. Shopping journey: stable ID routes, reliable search/filter state, real checkout, clear store scope and login return.
3. Presentation foundation: contrast, typography, RTL, spacing, responsive grid, sheets and safe areas, preserving the animated bar.
4. Gifts and follow-up: quote detail, delivery scheduling where supported, refreshed order history, actionable notifications and help.
5. Device validation: real-device English/Arabic, light/dark, slow network, text scaling, keyboard, Android navigation modes, iPad portrait/landscape.

Each stage should be usable and verifiable before the next. Large visual redesigns should not conceal unfinished checkout behavior.

## Review scenarios before release
- Guest browses store/product, signs in to buy and returns to the same selection.
- Two different accounts use the same device without seeing each other's data.
- Rapid search and niche changes end with matching results; clearing filters truly clears them.
- Multiple store carts survive removal and recreation without ID collisions.
- Stock/price changes are explained before order confirmation.
- Pickup succeeds without a saved delivery destination.
- Delivery destination and all fees are reviewed explicitly.
- Duplicate tap or timeout retry creates one order.
- Gift estimate can be inspected, accepted/declined and followed into fulfillment.
- Card/list/detail status and money values agree after refresh/relaunch.
- No driver accepted: show waiting truthfully, with a useful help route.
- Invalid images, empty data, denied location and offline errors have recoverable states.
- Large Arabic text, mixed product names, iPad rotation and keyboard never hide actions.
- Account deletion removes local private data and handles failures honestly.

## Measurement proposal
Baseline before redesign: product-open rate, search-to-product rate, add-to-cart success, checkout starts/completions, address failure rate, OTP success, quote response time, accepted quote rate and order-status support contacts. Segment by language and device category without recording private message or OTP content.

These are proposed measures; no analytics results were supplied or collected for this audit. Validate the navigation proposal with a small set of real customers completing the same shopping tasks before broad rollout.

