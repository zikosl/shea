# Business modules

Shea presents three business modules while retaining granular capabilities internally for API authorization and POS synchronization.

| Module | Internal capabilities |
| --- | --- |
| Custom Sales | `CUSTOM_ORDERS`, `QUOTATIONS`, `DELIVERY_PICKUP` |
| Gift Studio | `GIFT_BUILDER`, `GIFT_TEMPLATES`, `GIFT_GALLERY`, `GIFT_REPORTS` |
| Production | `PRODUCTION`, `PRODUCTION_TASKS` |

Gift Studio depends on Custom Sales. Enabling `GIFT_BUILDER` therefore also enables custom orders, quotations, and fulfillment in the effective capability result. Production Tasks similarly depends on Production.

## Resolution order

Effective access is resolved in this order:

1. Global defaults configured in Admin under Commerce Settings.
2. Niche overrides. A missing niche setting inherits the global value.
3. Partner overrides. A missing partner setting inherits the resolved niche/global value.
4. Dependency closure.

For partners assigned to multiple niches, a module is available when at least one assigned niche enables or inherits it. A partner override always takes precedence before dependencies are closed.

## Application behavior

- Admin exposes only the three modules and workflow presets.
- Shea Partner uses `supportsGifts` to show Gift Studio only when its effective capability is enabled.
- Shea Client shows gift checkout only for eligible stores.
- Shea POS receives the granular effective capabilities in its bootstrap payload and caches them for offline navigation and workflow checks.

The granular capability GraphQL operations remain available for backward compatibility, while Admin saves module configurations through transactional batch mutations.

## Deployment

1. Apply Prisma migrations before starting the new backend release.
2. Deploy the backend before Admin so the new GraphQL operations are available.
3. Open Commerce Settings and choose the global module preset.
4. Review niche defaults, then partner-specific overrides.
5. Synchronize each POS installation so its cached capability payload is refreshed.

The migration creates an empty global settings table. Missing global rows resolve to disabled, preserving the previous all-off fallback. Existing niche and partner capability rows are not deleted or rewritten.
