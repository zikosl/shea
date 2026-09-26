# Shea Visual Identity and AI Creative Guide

Version 1.0  
Primary brand: **Shea**  
Primary market context: Algeria  
Languages: English and Arabic  

This document is the source of truth for designers and AI image generators creating Shea social media posts, stories, flyers, launch graphics, store campaigns, app promotions, and printed material.

## 1. Brand Overview

### What Shea is

Shea is a connected beauty-commerce platform that helps customers:

- Discover beauty, cosmetics, perfume, jewelry, personal-care products, and local stores.
- Search and compare products across trusted partner stores.
- Choose product variants and place normal orders.
- Build gifts from eligible products and request gift preparation for a preferred date.
- Request prices or quotations when a product or custom item does not have a fixed price.
- Follow order preparation and delivery progress.

Behind the customer experience, Shea connects partner stores, point-of-sale operations, catalog management, riders, and platform administration. Consumer campaigns should lead with discovery, confidence, gifting, convenience, and local stores. Operational tools are supporting proof, not the main consumer message.

### Brand promise

**Beauty, chosen with confidence and delivered with care.**

### Brand idea

Shea turns fragmented beauty shopping into one elegant journey: discover, choose, personalize, order, and receive.

### Brand personality

- Modern, clean, refined, and contemporary.
- Feminine without being childish or overly decorative.
- Helpful and human, never clinical or cold.
- Premium but accessible.
- Local and trustworthy.
- Calm, clear, and confident.
- Minimal by default: every element must have a purpose.

### Emotional outcome

Creative work should make people feel:

1. **Seen:** Shea understands personal taste and special moments.
2. **Inspired:** Products and gifts feel desirable and thoughtfully curated.
3. **Confident:** Stores, prices, options, and delivery steps feel clear.
4. **Cared for:** The experience feels personal from discovery to delivery.

## 2. Audience

### Primary customer

Mobile-first shoppers looking for beauty, perfume, cosmetics, jewelry, personal care, and meaningful gifts from local stores. They value attractive products, convenience, choice, store trust, and reliable delivery.

### Secondary audiences

- Gift buyers shopping for birthdays, celebrations, and personal moments.
- Partner stores that want better catalog, order, and customer operations.
- Store teams using Shea POS.
- Riders completing delivery requests.

### Communication priority

For general Shea social media, use this order:

1. Customer benefit.
2. Product or occasion.
3. Local-store confidence.
4. Simple call to action.
5. Technology or operational proof only when relevant.

## 3. Logo System

### Canonical lockup preview

<img src="../shea-client/src/assets/logo.png" alt="Official Shea logo: flowing S leaf symbol, SHEA wordmark, and ONLY SHE line" width="240" />

### Canonical assets

Use the supplied logo files. Never ask an AI image model to redraw, reinterpret, spell, or reconstruct the logo.

| Asset | Purpose |
| --- | --- |
| `shea-client/src/assets/logo.png` | Full vertical lockup: Shea symbol, SHEA wordmark, and ONLY SHE line. |
| `shea-client/src/assets/images/ios-light.png` | White symbol on rose background; useful reference for the app icon treatment. |
| `shea-client/src/assets/images/adaptive-icon.png` | Primary mobile/adaptive icon source. |
| `shea-client/src/assets/images/ios-tinted.png` | Platform-specific tinted icon source. |
| `shea-client/src/assets/images/ios-dark.png` | Platform-specific dark icon source. |

`shea-client/src/assets/logo2.png` is a legacy/unrelated “glowy” asset and is **not part of the Shea identity**. Do not use it.

### Logo meaning

The mark combines a flowing **S** with leaf-like curves. It suggests softness, beauty, natural care, movement, and a guided journey.

### Logo usage rules

- Place the real logo as a final design-layer overlay after generating imagery.
- Use the symbol alone for avatars, app badges, watermarks, and small placements.
- Use the full lockup for covers, flyers, end cards, and formal brand material.
- Preserve the original proportions. Never stretch, rotate, outline, bevel, or add a drop shadow.
- Keep the logo on a calm, high-contrast area.
- Prefer white logo artwork on primary rose or dark plum backgrounds.
- Prefer primary rose or deep plum artwork on white, cream, or pale blush backgrounds.
- Do not place the logo directly over faces, product labels, or visually noisy photography.

### Clear space

Use the width of one leaf-tip section of the symbol as minimum clear space on every side. As a practical digital rule, keep clear space equal to at least **20% of the symbol width**.

### Minimum size

- Symbol only: at least 32 px wide digitally.
- Full lockup: at least 120 px wide digitally.
- Printed full lockup: at least 28 mm wide.

### AI logo rule

Image generators often produce incorrect lettering. Prompts should say:

> Leave a clean logo-safe area with no text or objects. Do not generate a logo, brand name, letters, watermark, or typography. The official Shea logo will be added separately.

## 4. Color System

The customer-app theme is the canonical foundation.

### Core light palette

| Role | Color | Hex | Usage |
| --- | --- | --- | --- |
| Shea Signature Pink | Warm expressive rose | `#E779AA` | Primary actions, headlines, key graphic shapes, price highlights. |
| Pressed Plum | Deep wine | `#803153` | Dark accents, gradients, emphasis, hover/pressed states. |
| Shea Blush | Pale rose | `#FDF0F5` | Soft fields, chips, secondary panels, atmospheric backgrounds. |
| Porcelain Pink | Warm near-white | `#FFF7FA` | Main background and negative space. |
| Pearl White | White | `#FFFFFF` | Cards, clean product stages, logo contrast. |
| Ink Plum | Charcoal plum | `#2F2933` | Main text and strong contrast. |
| Muted Mauve | Gray mauve | `#756A78` | Supporting copy and metadata. |
| Dusty Border | Muted blush gray | `#D9C5CE` | Fine dividers and subtle structure. |

### Dark palette

| Role | Hex | Usage |
| --- | --- | --- |
| Midnight Plum | `#18151A` | Premium dark background. |
| Dark Card | `#211D23` | Elevated surfaces. |
| Dark Surface | `#28222A` | Secondary surfaces. |
| Rose Light | `#C97A99` | Primary accent on dark backgrounds. |
| Rose Highlight | `#E295B5` | Small highlights only. |
| Soft Ivory | `#F8EEF4` | Primary text on dark backgrounds. |
| Muted Rose Gray | `#C7B8C0` | Supporting text on dark backgrounds. |

### Functional accents

Use functional accents sparingly; they should not compete with Shea Signature Pink.

- Success green: `#2E8F62`
- Warning gold: `#B7791F`
- Information blue: `#3478C7`
- Error red: `#D43F5E`

### Recommended campaign ratios

- 65-75% porcelain, white, or soft neutral space.
- 15-25% product photography or one focused lifestyle subject.
- 8-12% Shea signature-pink or plum brand fields.
- 0-3% optional functional or seasonal accent.

### Approved gradients

- Soft blush: `#FFF7FA` to `#FDF0F5`.
- Signature rose: `#E779AA` to `#803153`.
- Evening plum: `#2F2933` to `#18151A`.
- Rose glow: transparent `#C97A99` fading into `#FFF7FA`.

Avoid rainbow gradients, electric purple, neon pink, dominant blue, and generic pink-on-white “beauty app” styling with no Shea-specific structure.

## 5. Typography

### English and Latin text

Use **Urbanist**.

- Hero headlines: Urbanist ExtraBold or Black.
- Section titles: Urbanist Bold.
- Buttons and labels: Urbanist SemiBold.
- Body copy: Urbanist Regular or Medium.
- Prices and numbers: Urbanist Bold with tabular-looking alignment where possible.

### Arabic text

Use **Zain**.

- Arabic headlines: Zain ExtraBold or Black.
- Section titles: Zain Bold.
- Buttons and labels: Zain Bold.
- Body copy: Zain Regular.

### Bilingual rules

- Arabic layouts are RTL, including alignment, reading order, arrows, and decorative movement.
- English layouts are LTR.
- Do not force Arabic and English into the same sentence.
- For bilingual artwork, create two clear typographic zones or publish separate language versions.
- Keep product and store names in their original script when no approved translation exists.
- Write currency as `DZD` in English layouts and `د.ج` in Arabic layouts.
- Never allow an AI image model to render final Arabic copy. Add approved text during layout production.

### Type hierarchy for a 1080 x 1350 post

- Headline: 78-110 px.
- Supporting line: 34-44 px.
- Small label: 24-30 px.
- Call to action: 30-36 px SemiBold/Bold.
- Legal/supporting details: no smaller than 24 px.

## 6. Visual Language

### Overall direction

**Modern product-led minimalism meets useful local commerce.**

The identity should feel calm, current, and immediately understandable. Product, message, and whitespace are the main design elements. Shea must feel more curated than a discount marketplace, cleaner than a traditional beauty flyer, and more useful than a fashion mood board.

### Minimalism principles

- One focal subject per post; use a maximum of three products only when the campaign is explicitly about a collection.
- One headline, one short supporting line, and one call to action.
- One dominant brand gesture, such as a small signature-pink block or a single S-curve.
- Use flat or softly dimensional backgrounds with no decorative scenery unless it explains the campaign.
- Keep at least half of the composition visually quiet.
- Prefer alignment, scale, and spacing over borders, shadows, ornaments, or repeated containers.
- Remove any element that does not improve recognition, meaning, hierarchy, or action.
- If the composition still works after removing an object, remove it.

### Signature visual devices

Use **one primary device and at most one supporting device** per composition:

- Flowing S-curves inspired by the logo.
- Leaf-shaped crops or soft curved masks.
- A single signature-pink plane or fine accent line.
- A soft oval or circular spotlight behind the hero product.
- A strict modular grid with deliberate asymmetry.
- Rounded rectangular app/UI crops with restrained radius.
- One small store, gift, or delivery marker when it communicates function.

### Shapes and radius

- Favor generous curves, asymmetric arcs, and rounded rectangles.
- Typical card radius: 20-32 px at social-media scale.
- Prefer one large shape over many small decorative shapes.
- Avoid excessive pills, bubbles, borders, gradients, and nested cards.
- Use borders only to clarify structure, not to decorate every object.

### Texture and materials

Preferred:

- Smooth matte paper.
- Clean seamless studio backdrops.
- Pale stone or matte ceramic used as one simple surface.
- Very subtle frosted glass used only for app-focused campaigns.
- A restrained reflective metal detail when relevant to jewelry or perfume.

Avoid:

- Plastic-looking 3D environments.
- Layered props that compete with the product.
- Decorative flowers, petals, candles, bath salts, fabric folds, or ribbons unless they are essential to the campaign subject.
- Excessive glitter.
- Heavy gold luxury clichés.
- Fake water splashes unrelated to the product.
- Dense floral or gift-decoration frames.
- Visible texture added only to make empty space feel occupied.

## 7. Photography and Image Direction

### Product photography

- Show the real product clearly and keep labels legible.
- Use soft diffused daylight or a controlled editorial studio light.
- Preserve accurate packaging colors and proportions.
- Prefer one hero product on one clean surface.
- Use a carefully spaced group of no more than three only for collection campaigns.
- Use believable shadows and contact with the surface.
- Leave intentional negative space for copy and the real logo.
- Do not invent claims, ingredients, packaging text, sizes, or certifications.

### Lifestyle photography

- Show authentic, modern North African/Mediterranean context without stereotypes.
- Cast should feel natural, confident, and contemporary.
- Hands, skin, and faces must be anatomically correct and realistically textured.
- Use warm natural light and calm domestic, boutique, or urban settings.
- Moments should feel candid but art-directed: choosing, gifting, unboxing, preparing, or receiving.

### Store photography

- Emphasize trusted local expertise and curation.
- Show clean shelves, thoughtful packaging, a welcoming counter, or a store owner preparing an order.
- Avoid making stores look like anonymous warehouses or global chains.

### Gift photography

- Focus on intention, anticipation, and presentation.
- Prefer a clean gift box, one selected product group, and one simple card.
- Use one narrow ribbon only when necessary to communicate gifting.
- Do not add flowers, candles, bath products, or fabric merely to make the scene look luxurious.
- Show the preferred-date idea through mood or composition, not a fake calendar full of unreadable text.

### Delivery photography

- Show care and reliability rather than speed-at-all-costs.
- Use clean branded-neutral delivery bags or packages.
- Do not generate fake Shea branding on a rider, vehicle, or package; add real brand elements afterward.

## 8. Layout System

### Core composition

Every promotional design should contain:

1. One visual hero.
2. One clear message.
3. One supporting benefit.
4. One call to action.
5. One official Shea logo placement.

Do not add secondary slogans, decorative captions, repeated badges, or multiple calls to action.

### Safe-zone structure

- Keep at least 64 px outer margin on 1080 px-wide artwork.
- Keep the logo away from platform UI overlays.
- For Stories/Reels, keep critical text between 250 px from the top and 300 px from the bottom.
- Do not place critical information in the bottom-right corner where social UI may overlap.

### Social-feed rhythm

For a coherent 3 x 3 Instagram grid, repeat this nine-post rhythm:

1. Brand statement with generous negative space.
2. Minimal product close-up.
3. Customer benefit or app feature.
4. Store spotlight.
5. Strong campaign centerpiece.
6. Gift or occasion story.
7. Product collection or niche.
8. Delivery/trust proof.
9. Call-to-action or app download.

Alternate light, photographic, and dark/rose-dominant posts so adjacent tiles do not all have the same visual weight.

## 9. Content Pillars

### Discover

Purpose: Help customers find products, niches, stores, and new arrivals.

Message examples:

- “Find your next favorite.”
- “Beauty from stores near you.”
- “Discover more. Choose confidently.”

Visuals: Product arrangements, app browsing, category-led color stories, store shelves.

### Choose

Purpose: Communicate product details, variants, store identity, and confidence.

Message examples:

- “The right product. The right store.”
- “Compare, choose, and order in one place.”
- “Your beauty choice, made clearer.”

Visuals: One product with variant swatches, store identity, clean comparison layouts.

### Gift

Purpose: Promote gift-enabled products, custom gift requests, preferred dates, and thoughtful presentation.

Message examples:

- “Turn their favorites into a gift.”
- “Made for the moment.”
- “Choose the products. Shea helps shape the gift.”

Visuals: Curated gift sets, soft wrapping, handwritten-card mood, occasion-specific palettes.

### Receive

Purpose: Build confidence in preparation, order progress, pickup, and delivery.

Message examples:

- “From your favorite store to your door.”
- “Prepared with care. Delivered with confidence.”
- “Follow every step.”

Visuals: Prepared package, store handoff, rider journey, elegant progress motif.

### Partner and POS

Purpose: Explain the connected business platform to stores.

Message examples:

- “Your catalog, orders, stock, and store team in one flow.”
- “Sell locally. Operate confidently.”
- “Online discovery and in-store operations, connected.”

Visuals: Real store team, restrained UI crops, order preparation, inventory and POS context.

## 10. Voice and Copy

### Voice principles

- Lead with the customer outcome.
- Use short, natural sentences.
- Sound confident, not exaggerated.
- Use concrete verbs: discover, choose, build, order, follow, receive.
- Avoid generic claims such as “the best,” “revolutionary,” or “luxury redefined.”
- Avoid promising instant delivery unless a specific service level supports it.
- Do not imply medical, dermatological, or cosmetic results without validated evidence.

### English headline bank

- Beauty, chosen your way.
- Find it. Love it. Make it yours.
- Your favorite stores, one beautiful journey.
- Discover beauty closer to you.
- Thoughtful gifts begin with what they love.
- More choice. Less searching.
- From discovery to delivery, with Shea.
- Local beauty, beautifully connected.
- The right gift starts with the right details.
- Shop the moment, not just the product.

### English supporting lines

- Explore products from trusted local stores.
- Search, compare, order, and follow every step.
- Choose eligible products and turn them into a thoughtful gift.
- Find beauty, perfume, jewelry, and personal care in one app.
- Know the store behind every product.
- Choose pickup or delivery when available.

### Arabic headline bank

- جمالك، باختيارك.
- اكتشفي أكثر، واختاري بثقة.
- متاجرك المفضلة في تجربة واحدة.
- الجمال المحلي، أقرب إليك.
- هدية تبدأ بما يحبون.
- من الاكتشاف إلى التوصيل مع شيا.
- اختيارات أكثر، بحث أقل.
- لكل مناسبة، لمسة خاصة.

### Arabic supporting lines

- اكتشفي منتجات من متاجر محلية موثوقة.
- ابحثي، قارني، اطلبي وتابعي كل خطوة.
- اختاري منتجاتك وحوليها إلى هدية مميزة.
- مستحضرات التجميل والعطور والمجوهرات والعناية في تطبيق واحد.
- تعرفي على المتجر الذي يقدم كل منتج.
- اختاري الاستلام أو التوصيل عند توفره.

### Calls to action

English:

- Discover on Shea
- Explore products
- Find a store
- Build a gift
- Shop now
- Download Shea

Arabic:

- اكتشفي على شيا
- تصفحي المنتجات
- ابحثي عن متجر
- جهزي هديتك
- تسوقي الآن
- حملي تطبيق شيا

## 11. Production Formats

| Use | Size | Notes |
| --- | --- | --- |
| Instagram square | 1080 x 1080 | Simple message, centered or asymmetric composition. |
| Instagram portrait | 1080 x 1350 | Preferred feed format; strongest space for storytelling. |
| Story/Reel cover | 1080 x 1920 | Respect top/bottom UI safe zones. |
| Landscape ad | 1200 x 628 | Keep copy compact and logo visible. |
| A4 flyer | 2480 x 3508 at 300 DPI | Include bleed and print-safe margins. |
| A5 flyer | 1748 x 2480 at 300 DPI | Use one focused offer or message. |

Generate imagery larger than the final output where possible, then crop intentionally. Never stretch a smaller generated image.

## 12. AI Generation Workflow

AI should generate the **visual scene**, not the finished brand artwork.

1. Choose the campaign objective and content pillar.
2. Generate clean imagery with an intentional text/logo-safe area.
3. Select the most realistic result.
4. Correct product shape, hands, faces, and packaging if needed.
5. Add the official Shea logo as a separate layer.
6. Add final English or Arabic copy with Urbanist or Zain.
7. Apply the Shea palette and spacing system.
8. Export and check at actual mobile size.

### Prompt formula

Use this structure:

> Create a [format] campaign image for Shea, a modern Algerian beauty-commerce app connecting customers with local beauty stores, products, gifts, and delivery. Show one clear focal subject: [subject and action]. Art direction: modern clean minimal commercial photography, product-led, refined but accessible, soft diffused light, accurate materials, realistic skin and hands when present, one simple [surface/background], strict grid, generous negative space covering at least 60% of the image, Shea palette of signature pink #E779AA, pale blush #FDF0F5, porcelain pink #FFF7FA, charcoal plum #2F2933. Use only one subtle brand gesture: [small signature-pink plane / fine S-curve / soft oval spotlight]. Leave a clean [location] safe area for one headline, one supporting line, one CTA, and the official logo. No decorative props, generated text, logo, watermark, or fake packaging claims. Crisp, realistic, modern, uncluttered.

### Universal negative prompt

> generated text, misspelled words, fake logo, watermark, random letters, neon purple, oversaturated pink, childish design, maximalism, decorative clutter, flowers, petals, candles, bath salts, fabric draping, excessive ribbons, glitter, confetti, ornate frames, heavy gold, too many props, too many products, stacked gift boxes, heavy borders, multiple cards, excessive gradients, cheap plastic 3D render, generic app mockup, unreadable phone UI, distorted packaging, altered product label, duplicate products, floating objects without shadows, malformed hands, extra fingers, waxy skin, unrealistic faces, inaccurate jewelry, medical claims

## 13. Ready-to-Use AI Prompts

### A. Brand awareness post

> Create a 1080 x 1350 portrait social post background for Shea, a modern Algerian beauty-commerce app. Show one elegant perfume bottle as the clear focal point on a single low matte platform. Modern clean minimal commercial photography, soft directional daylight, realistic contact shadow, porcelain pink #FFF7FA seamless background, one small signature-pink #E779AA plane, and one very subtle S-shaped shadow inspired by a leaf. Keep at least 65% of the composition empty, including a calm upper-left area for the official logo and headline. No other products, flowers, ribbons, candles, text, logo, watermark, or invented packaging.

Suggested headline: **Beauty, chosen your way.**

### B. Product discovery post

> Create a 1080 x 1350 clean product-discovery scene for Shea. Show exactly three distinct beauty products in one aligned row with generous spacing on a single matte surface. Use a porcelain pink #FFF7FA seamless background, accurate packaging, soft realistic shadows, and one fine signature-pink #E779AA line guiding the eye. Keep the upper half mostly empty for copy. Modern minimal commercial photography, no staggered podium collection, decorative props, flowers, tags, generated words, logo, price, or watermark.

Suggested headline: **More choice. Less searching.**

### C. Store spotlight post

> Create a 1080 x 1350 minimal social campaign image showing one welcoming independent beauty-store owner placing a single product into a clean order box in a contemporary boutique in Algeria. Use a simple counter, softly blurred organized shelving, realistic hands, natural light, neutral clothing, and one small signature-pink #E779AA detail. Keep the left 55% visually quiet for Shea branding and copy. Modern, authentic, premium but approachable. No flowers, decorative props, generated signage, text, logos, watermark, or stereotypical costumes.

Suggested headline: **The store behind every choice.**

### D. Gift campaign post

> Create a 1080 x 1350 modern minimal Shea gift campaign image. Show one open pale-blush gift box containing exactly three carefully spaced items: one perfume, one cosmetic product, and one delicate accessory. Include one narrow signature-pink #E779AA ribbon and one blank simple card. Use a clean porcelain background, soft natural light, realistic proportions and shadows, and at least 55% negative space in the upper-right for Arabic or English copy. No flowers, candles, bath salts, fabric, extra boxes, glitter, confetti, text, logo, or watermark.

Suggested headline: **Made for the moment.**

### E. Delivery confidence story

> Create a 1080 x 1920 vertical Story background for Shea showing one clean beauty-order box being handed from a boutique team member to a customer. Crop tightly around the two realistic hands and package, use a softly blurred contemporary Algerian storefront background, one subtle signature-pink #E779AA S-curve indicating progress, and generous empty space. Communicate care and reliability, not extreme speed. Keep the top 300 px and bottom 340 px completely uncluttered. No flowers, props, generated rider branding, text, logo, or watermark.

Suggested headline: **Prepared with care. Delivered with confidence.**

### F. App feature post

> Create a 1080 x 1350 modern minimal campaign composition for the Shea mobile app. Show one realistic smartphone upright at a slight three-quarter angle on a clean porcelain-pink #FFF7FA seamless surface with one believable soft shadow. The screen must be blank neutral white for compositing the real Shea app screenshot. Add only one small signature-pink #E779AA geometric plane behind the phone. Keep the upper third empty for a headline. No products, ribbon, flowers, fake UI, text, logo, watermark, or additional props.

Suggested headline: **Your favorite stores, one beautiful journey.**

### G. Partner/POS flyer

> Create an A4 portrait campaign background for Shea partner beauty stores. Show one modern boutique team member using a clean point-of-sale monitor at an uncluttered counter, with one prepared order box and a softly blurred organized shelf behind. Contemporary Algerian retail environment, realistic technology, calm operational confidence, neutral light, one signature-pink #E779AA accent, and at least 50% white or pale-blush space for structured flyer copy. Keep the monitor blank for real UI compositing. No decorative props, flowers, generated text, fake dashboards, logos, or watermarks.

Suggested headline: **Sell locally. Operate confidently.**

## 14. Design Do and Do Not

### Do

- Use real Shea logo files.
- Preserve accurate product packaging.
- Keep one primary message per creative.
- Use deliberate negative space as the dominant design element.
- Use one focal subject and one restrained brand gesture.
- Build hierarchy through scale, alignment, and spacing.
- Show local stores as trusted experts.
- Treat gifts as thoughtful, personalized experiences.
- Design Arabic layouts as true RTL compositions.
- Add app screenshots in post-production, not through image generation.
- Use light and dark campaigns while keeping the rose/plum signature.

### Do not

- Do not redraw the logo or type “SHEA” through an image generator.
- Do not use the legacy `logo2.png` asset.
- Do not make every post a pink rectangle with product cutouts.
- Do not fill empty space because it feels unfinished; quiet space is intentional.
- Do not cover designs in borders, pills, gradients, sparkles, flowers, ribbons, podiums, or decorative props.
- Do not use more than three products, two font weights, or one decorative gesture in a single composition.
- Do not invent discounts, delivery times, prices, product effects, or certifications.
- Do not present Shea as a cosmetics manufacturer; Shea is the connected commerce experience.
- Do not make every creative female-portrait focused; products, stores, gifts, and service moments also carry the brand.
- Do not use untranslated English UI inside Arabic campaigns.

## 15. Final Creative Checklist

Before publishing, confirm:

- The creative has one clear objective.
- The official logo asset is used and remains undistorted.
- The layout follows Shea colors and typography.
- The composition is modern, clean, minimal, and mostly uncluttered.
- At least half of the artwork remains visually quiet.
- There is only one focal subject or one clearly organized product group.
- English uses Urbanist; Arabic uses Zain and true RTL direction.
- Product labels and proportions remain accurate.
- No unverified claim, price, discount, or delivery promise is present.
- No AI-generated text, logo, or fake UI remains in the final artwork.
- The CTA matches a real Shea action.
- Text is legible at mobile size.
- Story and Reel safe zones are respected.
- The visual feels warm, refined, useful, local, and recognizably Shea.

## 16. Short Context Block for Other AI Tools

Paste this before any creative request:

> Shea is a modern Algerian beauty-commerce platform connecting customers with local stores, beauty and personal-care products, perfume, jewelry, gifts, checkout, order progress, and delivery. Its identity is modern, clean, minimal, warm, refined, feminine but not childish, premium but accessible, and operationally trustworthy. The signature colors are signature pink #E779AA, pressed plum #803153, pale blush #FDF0F5, porcelain pink #FFF7FA, pearl white #FFFFFF, and charcoal plum #2F2933. English typography uses Urbanist; Arabic uses Zain with true RTL composition. The visual symbol is a flowing S combined with leaf-like curves. Never redraw or generate the logo or final text; leave clean safe areas so official brand assets and typography can be added afterward. Use one focal subject, one simple surface, strict alignment, at least 60% negative space, realistic products and people, one restrained brand gesture, and contemporary Algerian/Mediterranean context. Avoid maximalism, decorative flowers, candles, fabric, excessive ribbons, podium collections, glitter, fake packaging, fake UI, and unverified claims.
