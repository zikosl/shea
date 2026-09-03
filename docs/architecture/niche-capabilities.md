# Niche capabilities

Shea is a multi-niche business platform. Its POS, catalog, inventory, sales,
payments, users, and reporting remain core modules. Optional business workflows
are exposed through capabilities and implemented in isolated domain modules.

## Boundaries

- A niche describes the market a partner operates in.
- A capability enables a reusable workflow; it is not an employee permission.
- A permission authorizes a local operator to use an enabled workflow.
- Effective partner capabilities are niche defaults plus explicit partner
  overrides. An explicit override always wins.
- Core modules must not import a niche extension. Extensions may reference core
  entities such as products, partners, and stock.
- Backend services enforce capabilities. Navigation gating is only a usability
  layer and must never be the security boundary.

## Gift Store extension

The first extension lives in `backend/src/modules/gift-store` and
`backend/src/schema/gift-store`. `CustomOrder` models the reusable order
lifecycle; Gift-specific recipient, occasion, card, and wrapping data remains in
`GiftSpecification`. Quotations are immutable snapshots, stock reservations are
separate from physical stock, and transitions use optimistic versions.

The POS bootstrap is versioned. Schema version 2 contains effective capability
codes and an optional `extensions.giftStore` payload. The Electron database
stores that payload in its own tables through migration 9. Non-Gift partners do
not receive the extension payload or see its navigation.

## Adding another extension

1. Reuse an existing capability when its business meaning matches.
2. Add a new capability only when it represents a distinct workflow.
3. Keep its domain service and GraphQL schema in dedicated module folders.
4. Add niche defaults and optional partner overrides through admin controls.
5. Version the bootstrap contract and add a forward-only local migration.
6. Gate backend commands by capability and local actions by operator permission.

Do not add a runtime plugin engine or scatter niche-name checks through the
codebase. Static modules with centralized capability resolution are the intended
architecture until deployment requirements prove otherwise.

## Deployment order

1. Deploy the backend database migration.
2. Deploy the backend GraphQL service.
3. Configure niche defaults and partner overrides in admin.
4. Release POS clients with migration 9 support.

Older POS clients continue reading their schema version 1 fields; new clients
must tolerate an absent extension payload until the first successful sync.
