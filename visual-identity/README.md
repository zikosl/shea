# Shea Visual Identity

This folder collects the original identity artwork used by Shea Client, Shea Partner, and Shea Rider, alongside a source-backed summary of their current visual systems. Assets here are copies; the app source folders remain the source of truth.

## Logo and App Icon Assets

### Shea Client

- `logos/shea-client/logo-primary.png` - standalone Shea wordmark/mark used on the login screen (`shea-client/src/assets/logo.png`).
- `logos/shea-client/app-icon-adaptive.png` - Android/adaptive app icon.
- `logos/shea-client/app-icon-ios-light.png`, `app-icon-ios-dark.png`, `app-icon-ios-tinted.png` - iOS icon appearance variants.
- `logos/shea-client/splash-mark-light.png`, `splash-mark-dark.png` - light/dark splash screen marks.

### Shea Partner

- `logos/shea-partner/app-icon-adaptive.png` - Android/adaptive app icon.
- `logos/shea-partner/app-icon-ios-light.png`, `app-icon-ios-dark.png`, `app-icon-ios-tinted.png` - iOS icon appearance variants.
- `logos/shea-partner/splash-mark-light.png`, `splash-mark-dark.png` - light/dark splash screen marks.

### Shea Rider

- `logos/shea-rider/app-icon-adaptive.png` - Android/adaptive app icon.
- `logos/shea-rider/app-icon-ios-light.png`, `app-icon-ios-dark.png`, `app-icon-ios-tinted.png` - iOS icon appearance variants.
- `logos/shea-rider/splash-mark-light.png`, `splash-mark-dark.png` - light/dark splash screen marks.

Partner and Rider share the same Shea monogram artwork in several splash variants, but their app icon backgrounds differ. Client has a separate standalone wordmark asset. Keep platform icon variants intact; do not replace them with the standalone wordmark without checking safe-area, mask, and contrast requirements.

## Brand Character

- **Name:** Shea
- **Mark:** A flowing, ribbon-like `S` monogram; the Client login wordmark pairs it with a refined uppercase “SHEA” lockup.
- **Character:** Calm, personal-care oriented, modern, and restrained. Pink is the strongest shared consumer/partner accent; surfaces are deliberately quiet so product photography and operational information remain clear.
- **Product roles:** Client is consumer shopping; Partner is store/catalog/order operations; Rider is delivery execution. Use role-specific emphasis, but retain the Shea name/monogram and clear status semantics.

## Current Color Tokens

Values below are copied from the app theme source, not sampled from screenshots. Colors can change in future app versions; update this document when theme tokens change.

### Shea Client

Source: `shea-client/src/constants/theme.ts`.

| Role | Light | Dark |
|---|---|---|
| Primary | `#9C3F68` | `#C97A99` |
| Pressed primary | `#803153` | `#E295B5` |
| On primary | `#FFFFFF` | `#24131B` |
| Background | `#FFF7FA` | `#18151A` |
| Card | `#FFFFFF` | `#211D23` |
| Surface | `#FFFDFE` | `#28222A` |
| Muted surface | `#FDF0F5` | `#30232B` |
| Text | `#2F2933` | `#F8EEF4` |
| Muted text | `#756A78` | `#C7B8C0` |
| Border | `#EDE3E8` | `#3A3238` |
| Success | `#2E8F62` | `#69C08C` |
| Error | `#D43F5E` | `#FF7A95` |
| Warning | `#B7791F` | `#F2B85C` |
| Info | `#3478C7` | `#75A7E8` |

The selected partner can provide a dynamic accent in Client; that partner color is contextual and does not replace the Shea base identity.

### Shea Partner

Source: `shea-partner/components/minimal/theme.ts`.

| Role | Light | Dark |
|---|---|---|
| Accent | `#CC6F98` | `#E7A3BF` |
| Accent soft | `#F7DFE9` | `#3A2631` |
| Background | `#FCF9FA` | `#151216` |
| Surface | `#FFFFFF` | `#1E1A20` |
| Soft surface | `#F7F1F3` | `#28222A` |
| Text | `#221A20` | `#FBF7F9` |
| Muted text | `#7F737B` | `#B9AEB5` |
| Border | `#EEE5E9` | `#38313A` |
| Success | `#2F8F67` | `#76D0A5` |
| Warning | `#B9822E` | `#E1B36B` |
| Danger | `#C94B55` | `#EF858B` |

Partner profiles may override the accent with their configured brand color. The global/provider palette in `shea-partner/constants/theme.ts` contains a separate legacy purple scale; prefer the Minimal UI theme tokens for current screen design unless a screen explicitly uses the legacy provider.

### Shea Rider

Source: `shea-rider/constants/theme.ts` (React Native Paper theme).

| Role | Light | Dark |
|---|---|---|
| Primary | `#2563EB` | `#60A5FA` |
| Accent / warning | `#F59E0B` | `#FBBF24` |
| Background | `#F8FAFC` | `#0B1120` |
| Surface | `#FFFFFF` | `#111827` |
| Text | `#0F172A` | `#F8FAFC` |
| Muted text | `#64748B` | `#94A3B8` |
| Surface variant | `#EEF2F7` | `#1E293B` |
| Success | `#16A34A` | `#4ADE80` |
| Error | `#DC2626` | `#F87171` |

Rider currently has a blue/amber operational theme rather than the pink Client/Partner palette. Preserve this distinction for delivery clarity unless a deliberate cross-app rebrand is approved. Status colors must remain semantic and should not be repurposed as decoration.

## Typography and Layout

- **Client:** Urbanist for Latin UI text; Zain for Arabic. Shared type scale and compact spacing/radius/control tokens live in `shea-client/src/constants/theme.ts`.
- **Partner:** uses the Minimal UI system in `shea-partner/components/minimal/`; shared rounded controls and restrained card surfaces. Theme includes configurable partner accents.
- **Rider:** React Native Paper / Material Design 3 theme in `shea-rider/constants/theme.ts`; operational screens prioritize legibility, location, order state, and high-confidence actions.
- All apps support Arabic/RTL. Mirror layout and navigation direction, not logos, numbers, map controls, or externally formatted identifiers without checking their intended direction.

## Usage Guidance

- Prefer the standalone Client wordmark for branded in-app placements; use app icons only in platform icon contexts.
- Keep transparent logo pixels and original aspect ratio. Do not stretch, recolor, crop, or place a light mark on a low-contrast background.
- Use the primary accent for primary actions and selected states; reserve success, warning, danger, and info colors for their semantic meanings.
- Keep surfaces neutral and product imagery prominent. Avoid adding extra gradients, shadows, or decorative colors that compete with the mark.
- Treat the files in this directory as reference copies. When an app’s source asset changes, recopy it here and update the inventory above.

## Source of Truth

- Client assets: `shea-client/src/assets/` and `shea-client/app.json`
- Partner assets: `shea-partner/assets/images/` and `shea-partner/app.json`
- Rider assets: `shea-rider/assets/images/` and `shea-rider/app.json`
- Client tokens: `shea-client/src/constants/theme.ts`
- Partner Minimal UI tokens: `shea-partner/components/minimal/theme.ts`
- Rider tokens: `shea-rider/constants/theme.ts`
