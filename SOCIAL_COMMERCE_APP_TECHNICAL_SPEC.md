# Seller-First Social Commerce Platform — Product & Engineering Specification

**Document ID:** SC-001  
**Version:** 1.0  
**Date:** 2026-10-14  
**Status:** Implementation-ready blueprint (product decisions and operational launch gates identified below)  
**Working name:** *MySpace for Shops* (placeholder; do not hard-code name)  
**Primary market:** Malaysia-first, expandable internationally  
**Clients:** Responsive web, iOS, Android  
**Core principle:** A user-customizable profile that can become a functioning shop, not a generic marketplace listing with a banner.

---

## 0. How the coding agent must use this document

This document is the source of truth for the first implementation. Build in **end-to-end vertical slices**; do not merely scaffold pages. Implement `P0` requirements first, then `P1` and `P2`. The **Storefront Editor** (Sections 5–8) is the flagship capability and takes precedence over decorative marketplace features.

**Non-negotiable:**
1. Web, iOS, and Android are supported, with a single shared backend and versioned shared storefront schema.
2. App bottom navigation has exactly **three** destinations: **Discover**, **My Space**, **Settings**. Seller tools, cart, orders, messages, and checkout live inside screens/subroutes or top-bar actions; never add a fourth tab.
3. Every account has a customizable profile; selling can be enabled without creating a second account.
4. Sellers can customize **fonts, text size/weight/alignment, colors, backgrounds, images, section order, block placement, width, spacing, borders, corners, and visibility** easily. Mobile must support editing; desktop allows precise editing.
5. Shop layout is **data**, not user-submitted raw HTML/CSS/JavaScript. Public pages render through an allowlisted component registry. No arbitrary executable code, embeds, or remote scripts.
6. Draft editing, live preview, undo/redo, autosave, publish, version history, and responsive previews are required for `P0`.
7. Server-authoritative inventory, prices, orders, authorization, and payments. Never trust client-submitted totals or ownership.
8. Marketplace payments and seller payouts remain behind interfaces until provider capability, merchant-of-record, compliance and legal arrangements are verified. **Do not claim production readiness** just because sandbox checkout passes.
9. Every feature needs testable acceptance criteria. Keep secrets server-side and provide `.env.example` files.
10. Prefer minimal, working code over stubs. If a third-party provider is not configured, implement an explicit sandbox adapter and visibly label test mode.

### Priority legend
- `P0 / MVP`: must work before initial pilot.
- `P1`: post-pilot social differentiation.
- `P2`: growth, ecosystem, and advanced AI.
- `Launch gate`: mandatory before live paid transactions/public launch, even if not needed for local demo.

### Product assumptions (can be overridden by configuration)
- First vertical: indie apparel, accessories, crafts, thrift, art, lifestyle goods; not restricted at the database level.
- Currency initially `MYR`; design for ISO currency codes and integer minor units.
- Launch geography Malaysia only initially; shipping/returns configurations are country-aware.
- One owner per shop in MVP; team roles later.
- **One-seller-per-checkout** in MVP; buyer can explore products from many sellers, but separate checkout/order per seller. No cross-seller checkout aggregation until payout/fulfillment complexity is solved.
- Physical goods first; no prohibited goods, digital downloads, or services in MVP.
- Age policy, tax obligations, marketplace moderation and seller verification need jurisdiction-specific legal review before launch.

---

## 1. Product definition and goals

### 1.1 Positioning
A social commerce marketplace where every user can create a personal space, follow interesting shops, tell stories, and optionally sell products. Differentiation is **expressive customizable identity + shop discovery + transactional trust**.

### 1.2 Personas
| Persona | Wants | Key workflow |
|---|---|---|
| Casual browser | Discover interesting products, shops, people | Discover → shop → product → follow or buy |
| Creative seller | Express identity without coding | My Space → Edit → Theme/block editor → Publish |
| Established small seller | Sell reliably, manage launches/stock | Add products → publish → manage orders |
| Community follower | Stay up to date with creators | Follow → posts and launches → buy |
| Theme creator (later) | Reuse/sell themes | Publish theme → other shops install |
| Platform admin | Prevent fraud and keep marketplace healthy | Review moderation queues, disputes, shops |

### 1.3 MVP success metrics
Track baseline and a weekly cohort dashboard. Targets below are hypotheses to validate, **not promises**:
- `shop_setup_completion`: % of new sellers publishing a shop within first session (target ≥60% pilot).
- `time_to_publish`: median elapsed time from editor entry to first publish (target ≤10 minutes with template).
- `editor_task_success`: % of pilot sellers changing font, hero image, and product-grid order without assistance (target ≥90%).
- `buyer_conversion`: shop views → purchases (observe initial baseline; do not invent target).
- `follow_conversion`: shop views → follows.
- `orders_with_no_inventory_oversell`: 100%.
- `crash_free_sessions`: ≥99.5% initial target.
- Repeat seller edits within 7 days, published shop engagement, time to first sale.

### 1.4 Scope and exclusions
**MVP in:** signup/login, browse/search, profile/shops, powerful editor, seller product/collection management, public product page, favorites/follows, sandbox checkout, orders, basic admin controls, image hosting, mobile/web responsiveness, telemetry.

**MVP out:** livestreaming, seller livestream auctions, multi-warehouse inventory, algorithmic ad bidding, sophisticated recommendations, fully arbitrary CSS/HTML, cross-seller unified basket, custom-domain routing, real-time chat, theme marketplace, AI page generation, complicated international taxes.

---

## 2. Information architecture and navigation

### 2.1 EXACTLY three persistent tabs
| Tab | Buyer mode | Seller mode | Child screens (do not become tabs) |
|---|---|---|---|
| **Discover** | Search products, shops, collections; curated feed | Same discovery view | Search results, product details, shop pages, post details, category filters |
| **My Space** | Personal profile, followed shops, saved items, post history | Own storefront and Edit/Manage entry points | Store editor, products, blog composer, orders, analytics, shop settings |
| **Settings** | Account, preferences, privacy, addresses, notifications | Same plus business/payout settings | Security, help, policies, preferences |

**Global top-bar actions:** cart, activity/notifications, account-dependent context actions. On small screens, use icon + accessible label. Opening checkout, cart, order details or photo viewer uses nested stacks/modals and does **not** change persistent bottom navigation.

### 2.2 Primary routes
Web:
```
/                             Discover
/search?q=...                 Product/shops search
/shop/[slug]                  Public shop (SEO crawlable)
/shop/[slug]/post/[postId]    Published shop post (P1)
/product/[slug]               Product details (SEO crawlable)
/u/[handle]                   Personal profile, even when not selling
/me                           My Space
/me/edit                      Storefront editor (authenticated)
/me/products                  Seller product manager
/me/orders                    Seller order manager
/me/posts                     Blog composer (P1)
/cart                         Active cart
/checkout/[shopId]            One-shop checkout
/orders/[orderId]             Buyer order detail
/settings                     Settings
/admin                        Restricted admin surface
```
Mobile routes mirror the same semantics via Expo Router, deep-linked from web share URLs. Bottom navigator has exactly 3 slots; child screens belong to nested stacks.

### 2.3 Role model
- Anonymous: view public shops/products and search.
- Authenticated user: customize profile, follow/favorite, shop, order, create posts where permitted.
- Shop owner: edit own shop/products, view own order segments, configure fulfillment.
- Admin/moderator: scoped internal privileges with audit logging.
- **Seller is a capability**, not a second type of account. `seller_enabled` plus seller onboarding state controls merchant functionality.

---

## 3. Core user journeys

### J01 — Create a personal space
1. Register via email + password or configured OAuth provider.
2. Pick handle (unique, normalized), display name, avatar.
3. Choose a default aesthetic/template; public profile gets safe default page.
4. Enter editing mode, replace hero image, adjust fonts/color, publish.
5. Public page becomes shareable via stable canonical URL.

### J02 — Become a seller
1. Existing user taps **Start Selling** in My Space.
2. Accept seller terms and submit required onboarding/KYC details (requirements depend on payment provider and jurisdiction).
3. Create first product (title, description, images, price, inventory, variants, shipping details).
4. Add product-grid section to the profile and publish shop.
5. A seller cannot receive production orders until operational launch gates pass.

### J03 — Personalize a storefront on mobile
1. My Space → **Customize**.
2. Choose **Start from Template** or **Edit Current Design**.
3. Tap block → bottom-sheet property inspector; add block from floating +; long-press/reorder section; manipulate spacing with numeric controls or preset chips; change typography/background via themed settings.
4. **Phone preview** reflects edits immediately; preview read-only buyer mode.
5. App autosaves draft; seller manually taps **Publish**.
6. Reopen editor on another device and find saved draft.

### J04 — Personalize on desktop
1. Web editor opens three-pane workspace: **left** layer/block library, **center** editable canvas, **right** properties inspector.
2. Drag blocks to valid zones, use alignment guides and snap targets. Keyboard arrows, reorder buttons and accessible DnD alternative exist.
3. Switch phone/tablet/desktop previews, change section responsiveness, and publish.

### J05 — Shop and check out
1. Discover → keyword/category/shop search → public shop or product.
2. Select valid variant and quantity; add to a shop-scoped cart.
3. Supply shipping address and select available shipping option; read accurate price/shipping totals computed by server.
4. Create checkout session through payment adapter; completed payment webhook confirms order.
5. Buyer sees status; seller sees matching order; stock is reconciled correctly.

### J06 — Post a launch announcement (`P1`)
1. Seller opens Posts → create draft with rich text, images and product references.
2. Schedule or publish.
3. Followers see announcement in a feed/notification; linking to products stays possible even after stock changes.

---

## 4. Storefront profile/page specification (most important UX)

### 4.1 Page anatomy
A profile/storefront may include: profile header, avatar, display name/handle, bio, cover artwork, follow button, products, featured collection, image gallery, text blocks, blog posts, lookbook, about, FAQ, testimonials, custom buttons, divider/spacer, and social links.

A shop may look completely different from another shop but must preserve essential commerce affordances: clear shop identity, accessible product prices, safe purchase controls, policies, and navigation back to Discover. User content cannot cover/impersonate the app's checkout chrome.

### 4.2 Customization capabilities — acceptance contract
The seller MUST be able to configure:
- **Identity:** shop name, handle/URL slug, avatar, hero/cover photo, short bio, shop announcement, social links, category/aesthetic tags.
- **Global palette:** main/secondary/accent colors; text/background/surface/button colors; gradients (preset gradient builder, no raw CSS); light/dark style overrides; optional background image or pattern.
- **Typography:** allowlisted fonts from bundled/web-safe licensed collection; font pairing presets; heading/body sizes; font weight; line height; letter spacing; uppercase toggle; alignment; foreground color; text emphasis.
- **Structure:** reorder/add/duplicate/delete sections and blocks; show/hide; width: contained/full; horizontal/vertical alignment; max width; grid column count; order on desktop/mobile; nested columns in permitted section types.
- **Spacing:** padding and margins per axis using sliders, numeric input and preset chips; row/column gaps; stack order controls.
- **Visuals:** image upload, replace, crop, focal point, aspect ratio, fit (cover/contain), rounded corners, border width/style/color, opacity, shadows (presets), masks/shapes where supported.
- **Decoration:** stickers/badges, badges with text, patterned backgrounds, separators, simple shape overlays; decorative assets must not block add-to-cart/payment UI.
- **Commerce blocks:** product grid/carousel, collection picker, featured product, latest products, sold-out display, launch teaser, product card appearance within safe constraints.
- **Content blocks:** rich-text section, image section, split text/image, photo gallery, links/buttons, social icon row, embedded product references, blog preview (P1), countdown (P1).
- **Responsive:** phone/tablet/desktop preview, per-breakpoint overrides for supported properties, hide/show per breakpoint with guardrails, mobile-specific block ordering.
- **Publishing:** draft, preview as buyer, publish, revert to past version; status clearly communicates unpublished changes.

### 4.3 Progressive complexity (easy for beginners, deep for experts)
**Simple mode (default):** large themed presets, quick changes (font, colors, cover image, grid style), reorder cards, curated block templates. Do not require knowledge of CSS units.

**Advanced mode:** precise font size/line height/letter spacing, padding on four sides, row/column gap, border radii, breakpoint overrides, content max-width, responsive columns, layer visibility and grouping. Provide a **Reset to theme default** for every group.

Properties inspector tabs: `Content`, `Style`, `Layout`, `Responsive`, `Actions/Link` (only when relevant). Show only settings supported by selected block; hide invalid combinations rather than allowing broken layouts.

### 4.4 Editor layouts
**Desktop ≥1024 CSS px:** toolbar above; layer/block list 260px left; resizable canvas center; properties panel 300px right. Preview widths: 390px phone, 768px tablet, 1280px desktop. Show breakpoint frame and overflow indicators.

**Tablet:** canvas plus slide-over inspector; layer manager in drawer.

**Mobile:** full-screen preview/canvas, persistent mini toolbar (`+`, Layers, Undo, Redo, Preview, Publish), selected-block outline and bottom sheet settings. Long-press drag for moving; fallback Move Up/Down buttons; large hit targets ≥44x44 logical points. No horizontal overflowing side panels.

### 4.5 Interactions and micro-UX
- Tap/click selects block without activating a buyer-facing CTA while in edit mode.
- Floating `+` opens searchable block catalog with thumbnails, categories and recently-used blocks.
- Drag insertion indicator shows **valid** target; invalid nesting is visibly rejected.
- Press `Escape` (web) to deselect; `Delete/Backspace` deletes selected block after appropriate guard; duplicate with `Ctrl/Cmd+D`; undo `Ctrl/Cmd+Z`; redo `Ctrl/Cmd+Shift+Z`.
- Copy/paste block styling (P1) and duplicate block (P0).
- Style changes update canvas within the same animation frame where practical; debounce server draft save (~500–1000ms) while keeping local UI immediate.
- Inline text editing (web) or editor sheet (mobile); no accidental navigation away from unfinished editing.
- Publish button disabled for invalid document or active upload, with specific error reasons.
- Unsaved offline edits persist locally until synced; network reconnect retries with conflict handling (see Section 7.5).
- Empty page = suggested layout + **Add your first section** CTA.
- Accessibility: color contrast guidance, missing alt-text warnings, semantic heading order warnings; seller can still preview but critical errors block publish.

### 4.6 Supported block library and defaults
| Block ID | Content/configuration | Adjustable knobs | Priority |
|---|---|---|---|
| `hero` | background image, headline, tagline, CTA | height, overlay, focal point, typography, alignment | P0 |
| `profileHeader` | avatar, name, bio, follow button | header layout, border, cover, spacing | P0 |
| `text` | safe rich text (paragraphs/headings/lists/links) | fonts, sizes, spacing, text alignment | P0 |
| `image` | one image + alt/caption | crop, fit, aspect, shape, border | P0 |
| `gallery` | uploaded photos | columns, gutter, card aspect | P0 |
| `productGrid` | collection/product filter | columns per breakpoint, density, card shape, price treatment | P0 |
| `featuredProduct` | product reference | image position, layout, typography | P0 |
| `button` | text, safe internal/external link | fill/outline, colors, radius, size | P0 |
| `divider` | line/decorative separator | weight, color, spacing | P0 |
| `spacer` | vertical space | responsive height | P0 |
| `columns` | 2–3 allowed child columns | proportions, gutter, stack order on mobile | P0 web advanced |
| `socialLinks` | URL array allowlist | icon size, spacing, alignment | P0 |
| `announcement` | promo/info text | background, emphasis, dismiss behavior | P0 |
| `collectionTiles` | product collections | grid/tiles, typography | P1 |
| `blogFeed` | latest/selected posts | count, layout and summary length | P1 |
| `countdown` | timestamp + launch link | display style, alignment | P1 |
| `testimonial` | approved seller-selected testimonials | card style; no fake verified rating | P1 |
| `guestbook` | moderated comments | layout, permission rules | P1 |
| `faq` | questions and answers | accordion colors/icons | P1 |
| `sticker` | vetted decorative graphic | position/size/rotation within bounded section | P1 |
| `lookbook` | curated images + product tags | hotspots, gallery aspect | P1 |

**Important flexibility rule:** freeform pixel placement can exist only inside a bounded `collage` block (P2), with separate mobile coordinates/overflow protections. Default layout uses sections + grids + stacks for reliable responsive rendering.

### 4.7 Templates (`P0`)
Seed a minimum of **8 genuinely different editable starter templates**: Minimal Studio, Vintage Film, Y2K Diary, Dark Editorial, Handmade Market, Streetwear Drop, Botanical, Art Gallery. Each includes example blocks and placeholder assets that can be replaced.

Template switching has choices: **Apply colors/fonts only** or **Replace layout** (requires confirmation if draft content may be lost). Save current draft version first. Brand colors and product references should remain valid.

---

## 5. Theme engine and storefront document model

### 5.1 Architecture and constraints
- Versioned **JSON page document**; immutable published snapshots and mutable draft revisions.
- JSON Schema stored in `packages/storefront-schema`; validate in TS (`ajv`) and Python (`jsonschema`) against the exact same schema version. Optional generated TS types from schema; prevent schema drift with contract tests.
- Shared **renderer contract** maps allowlisted `block.type` → UI implementation. Web and mobile may use separate platform renderers but must use identical schema and visual token semantics.
- Prefer shared components/styles via Tamagui only where practical; do not force web DnD mechanics into native RN.
- Document size and nesting limits: max 80 blocks per page, max 3 nested container levels, max 250 KB JSON before asset URLs, max 40 image references per shop page (configurable).
- Unknown `type` / unknown style props → rejected on publish; viewer may show safe fallback for older version.
- Publish stores schemaVersion and renderer compatibility version; migrations are explicit, versioned, reversible where feasible.

### 5.2 JSON example (illustrative canonical shape)
```json
{
  "schemaVersion": 1,
  "pageId": "pg_01JSHOP",
  "shopId": "shop_01JSHOP",
  "revision": 13,
  "theme": {
    "fontHeading": "space-grotesk",
    "fontBody": "inter",
    "colors": {
      "background": "#FFF5E8",
      "surface": "#FFFFFF",
      "text": "#212121",
      "accent": "#E86A28",
      "muted": "#746A64"
    },
    "radius": "medium",
    "buttonStyle": "rounded",
    "contentWidth": 1100
  },
  "sections": [
    {
      "id": "sec_hero",
      "type": "section",
      "layout": {"kind": "stack", "width": "full", "gap": 12},
      "style": {"paddingTop": 32, "paddingBottom": 32},
      "responsive": {"mobile": {"style": {"paddingTop": 16}}},
      "children": [
        {
          "id": "blk_hero",
          "type": "hero",
          "props": {
            "headline": "Welcome to the vintage room",
            "subtitle": "Curated finds and old-school treasures",
            "imageAssetId": "asset_hero_1",
            "alt": "A rack of vintage clothes",
            "cta": {"label": "Shop now", "type": "anchor", "target": "sec_products"}
          },
          "style": {
            "backgroundColor": "#F5D8B7",
            "textColor": "#1A1A1A",
            "textAlign": "center",
            "minHeight": 320,
            "fontSize": 38,
            "borderRadius": 12
          },
          "responsive": {
            "mobile": {"style": {"minHeight": 220, "fontSize": 28}}
          }
        }
      ]
    },
    {
      "id": "sec_products",
      "type": "section",
      "layout": {"kind": "stack", "width": "contained", "gap": 16},
      "children": [
        {
          "id": "blk_products",
          "type": "productGrid",
          "props": {"source": "all", "limit": 12, "sort": "newest"},
          "style": {"columns": 3, "gap": 16, "cardRadius": 8},
          "responsive": {"mobile": {"style": {"columns": 2, "gap": 8}}}
        }
      ]
    }
  ]
}
```

This is a conceptual example. Agent must define **precise** `oneOf` discriminated JSON Schema definitions for each block, strict allowed enums, URL/image ID handling, and style bounds.

### 5.3 Allowed style tokens and bounds
| Property | Type | Bound/default |
|---|---|---|
| `fontSize` | number | 10–96 px; default per block |
| `fontWeight` | enum | 400, 500, 600, 700, 800 |
| `lineHeight` | number | 1.0–2.2 |
| `letterSpacing` | number | -2 to 10 px |
| `textAlign` | enum | left, center, right |
| `color/backgroundColor` | string | validated `#RRGGBB` or preset token |
| `padding*`, `margin*`, `gap` | integer | 0–160 px; negative margins **not** allowed |
| `borderRadius` | integer | 0–64 px |
| `borderWidth` | integer | 0–8 px |
| `opacity` | number | 0.2–1.0 for decor only; text/minimum contrast constraints |
| `rotation` | integer | -30–30 degrees on approved decorative blocks only |
| `columns` | integer | desktop 1–4, tablet 1–3, phone 1–2 |
| `maxWidth` | integer | 280–1440 px |
| `imageFit` | enum | cover, contain |
| `aspectRatio` | enum | 1:1, 4:3, 3:4, 16:9, auto |
| `visibility` | enum | visible, hidden; published shop must retain commerce essentials |

Create a single styling transformer for shared layout rules and comprehensive visual regression snapshots across breakpoints.

### 5.4 Responsive cascade
Property resolution order: `component default` → `theme` → `block base style` → `tablet override` → `mobile override` as applicable. Breakpoint definitions: mobile `<768`, tablet `768–1023`, desktop `≥1024` CSS px (document web semantics; RN should use logical display width).

Hide/override must not silently detach products or create inaccessible payment controls. Every block must define its own responsive defaults. Mobile product grids default to two columns, with one-column fallback at narrow widths.

### 5.5 Rich text and links
Store rich text as structured nodes with a small subset: paragraphs, H2/H3, bold, italic, inline links, ordered/unordered lists. Escape all output. Validate max lengths; reject inline HTML, SVG, style tags, iframes and `javascript:`/`data:` URLs. External links use safe schemes (`https:` only in MVP), `rel="noopener noreferrer"` on web, confirmation where leaving app.

---

## 6. Editor state, saves, publishing, and recovery

### 6.1 Draft lifecycle
- `draft` page is private to its editor; public users see only latest `published` snapshot.
- Editor loads `GET /shops/{id}/draft`, which returns `ETag`/revision number.
- Each meaningful edit creates a local history command. Undo/redo depth at least 50 commands per editing session; group keystrokes/slider drags into one logical command.
- Autosave debounce 800ms after idle; display `Saving…` / `Saved` / `Offline – changes on this device` / `Conflict` states.
- `PATCH /shops/{id}/draft` requires `If-Match` expected revision; use optimistic concurrency (`409 CONFLICT` on stale revision).
- `POST /shops/{id}/publish` atomically validates schema and references, persists immutable snapshot and updates `published_version_id`.
- Publish versions keep timestamp, author, checksum, snapshot, optional notes. Allow rollback by creating a **new** version copied from a previous one (never change historical version).
- Publish failure leaves existing public version intact.

### 6.2 Multi-device editing and conflicts
P0 behavior: do not silently overwrite. When conflict occurs, show "This shop changed elsewhere" with options **Reload latest** or **Save local as copy**. P1 may add block-level merge. Offline draft changes may be queued locally, but only after clear user feedback; prevent unexpected publication.

### 6.3 Asset behavior
- Images uploaded using server-authorized path/presigned URL and records referencing user/shop ownership.
- Server verifies file signature, MIME, dimensions and upload size; strips EXIF where applicable; generates WebP/AVIF thumbnails for web and suitable RN formats.
- Suggested limits: 10 MB original image, max 6000×6000 pixels, shop quota initially 500 MB (configurable). Reject unsupported/decompression-bomb assets.
- Asset metadata: ownerId, mimeType, width, height, sizeBytes, checksum, variants, moderation status, alt text.
- Do not delete a referenced image when draft removes it; garbage collect unreferenced assets after retention window.

### 6.4 Publish validations
- All block IDs unique; valid nested placement; supported schemaVersion; referenced products/media accessible to shop.
- Heading and text contrast pass minimum accessibility standard where applicable, or show actionable warnings. Treat severe readability/accessibility failures as release blockers under configured policy.
- At least one visible profile identity element; if seller_enabled and store publicly open, accessible product/catalog entry point.
- Broken assets, unsafe links, invalid dimensions and missing required metadata block publish with specific field-level errors.

---

## 7. Feature specifications outside editor

### 7.1 Authentication, profile, identity (`P0`)
- Supabase Auth with email/password and optional Google/Apple after credentials configured.
- JWT validated by FastAPI against correct project JWKS and issuer/audience; never trust supplied user IDs.
- Handles case-insensitive and unique; 3–30 chars, letters/numbers/underscore/dot (define exact validation and reserved names).
- Profiles support avatar, bio, social links, follow counts, privacy preferences.
- Block/mute user, report profile, and account deletion workflow (launch gate).

### 7.2 Catalog (`P0`)
- Product CRUD: title, slug, description, price_minor, currency, photos, category, tags, status, SKU, variants (size/color), inventory, weight/dimensions, shipping/returns info.
- Seller can create draft, publish, archive and mark sold out. Products must only belong to one shop.
- Variant-specific price and inventory; max 100 variants/product at pilot (configurable).
- Collections with title, cover image, manual product ordering.
- Server authorizes seller ownership on every product mutation.
- Public product pages show truthful price, stock state, shipping details and returns summary.

### 7.3 Search and discovery (`P0`)
- Initial discovery = curated new shops, featured creators (admin-managed), trending/new products (clear deterministic sorting), product categories and keyword query.
- Search products by title, description, tags and shops by display name, handle, aesthetics.
- Filters: category, min/max price, stock, newest/relevance; sorting: relevance/newest/price ascending/descending.
- Start with PostgreSQL full-text/trigram where applicable; upgrade to Meilisearch via indexing abstraction only if necessary.
- No undisclosed sponsored ranking in MVP.
- Pagination/cursor-based API; normalize filters in URL and mobile deep link.

### 7.4 Following and favorites (`P0`)
- User can follow/unfollow shop and favorite/unfavorite product. Counts should be server-maintained or derived reliably.
- Private sellers' unpublished shop drafts never visible to followers.
- Following feed becomes P1; follow feature itself is P0.

### 7.5 Cart and checkout (`P0 sandbox / launch gate for real money`)
- Only same-shop items per cart/checkout. Selecting product from another seller creates separate cart or prompts to switch; never silently mix fulfillment.
- Server validates each cart item/variant, prices, stock, promotions, shipping/address.
- All financial values stored in integer minor units; tax/shipping/discount line items retained as immutable order price snapshots.
- Checkout state machine: `draft` → `pending_payment` → `paid` → `fulfillment_pending` → `shipped` → `delivered`; alternate `payment_failed`, `cancelled`, `refunded`, `disputed`.
- Unique idempotency key on order creation and payment attempt; payment callbacks/webhooks authenticated, verified and idempotent.
- Inventory reservation with expiration or transactional decrement strategy. Concurrency test ensures last item is never oversold; restore reserved stock on failed/expired checkout.
- A failed payment must never become `paid` due to client callback alone.
- Receipt/order detail and order confirmation notification.
- Checkout adapter: `PaymentProvider.createCheckout`, `verifyWebhook`, `refund`, `getPaymentStatus`, `getConnectedAccountStatus` (if applicable). Provide `SandboxPaymentProvider` for tests. Production provider selection is a launch-gate decision.

### 7.6 Seller order management (`P0`)
- Seller sees orders only for their shop with item snapshot, buyer shipping info required for fulfillment, statuses and timestamps.
- Seller can mark processing/shipped and optionally enter tracking number/provider; cannot mark paid or manipulate totals.
- Buyers can view own order and request support/refund (case management minimal MVP).
- Automatic inventory accounting and audit trail for state transitions.

### 7.7 Blog, announcements, and drops (`P1`)
- Draft/publish/schedule blog posts using safe rich text, images, embedded product links.
- Post feed appears on seller profile and in Following feed.
- Drop: launch timestamp, optional collection link, countdown block, follower reminders, early-access flags (`P2`).
- Abuse protections: posting limits, content reports, notification opt-outs.

### 7.8 Guestbook (`P1`)
- Public messages only from verified authenticated accounts; author sees own messages; shop owners can hide/report/delete entries under clearly logged moderation rules.
- Rate limiting, anti-spam, profanity/report workflow, spam review queue. Optional disable on shop settings.
- Guestbook never masquerades as purchase-verified reviews.

### 7.9 AI theme assistant (`P2`)
- Seller prompt → generate a **validated page JSON draft** via structured-output constrained schema, never executable HTML/CSS.
- Show diff/preview, ask seller to Apply, retain old draft for undo.
- For safety, product references and media must be supplied from seller-owned IDs; reject fabricated products, unsupported block types and out-of-bounds styles.
- Rate limit generations and log prompt/model/version with privacy considerations.

### 7.10 Themes marketplace (`P2`)
- Export/import sanitized templates without the originating seller's personal info, order data, unlicensed imagery or product IDs.
- Attribution, licensing, version compatibility and marketplace commissions decided before monetization.

---

## 8. Recommended technology stack and boundaries

### 8.1 Final recommendation
| Concern | Choice | Notes |
|---|---|---|
| Monorepo | pnpm + Turborepo | Deterministic lockfile, shared packages |
| Web | Next.js App Router + TypeScript | Server rendering/SEO for public shops and products; browser builder |
| iOS/Android | Expo + React Native + Expo Router | Genuine native apps, deep links, push later |
| Cross-platform UI | Tamagui + shared tokens, selective shared components | Platform-specific DnD/editor UIs allowed |
| Web drag/drop | dnd-kit (or maintained equivalent) | Keyboard sensor and accessible fallback mandatory |
| Mobile gesture reorder | react-native-gesture-handler + react-native-reanimated | Or maintained sortable list satisfying UX criteria |
| State | TanStack Query (server), Zustand (editor local) | Prevent stale and excessive draft writes |
| Validation | JSON Schema for store layout, Zod forms; Pydantic for API | Generated OpenAPI TS client |
| API | FastAPI / Python | Strong typing, modular routers, async when justified |
| DB | PostgreSQL (Supabase managed) | SQLAlchemy 2 + Alembic; relational constraints |
| Auth | Supabase Auth | Backend validates access tokens; enforce access checks |
| Object storage | Supabase Storage | RLS policies and signed upload paths |
| Search | PostgreSQL FTS/trigram | Upgrade Meilisearch behind interface later |
| Background jobs | lightweight durable queue/worker | Outbox + worker for thumbnails, notifications, reconciliation |
| Payments | provider interface + sandbox | Real-money provider only after verification |
| CI/CD | GitHub Actions | Lint, typecheck, tests, builds, migration checks |
| Observability | Sentry + structured logs + OpenTelemetry optional | Redact customer PII and payment data |
| Web hosting | Vercel or comparable SSR host | Public shop SEO and safe cache invalidation |
| API hosting | managed container provider (e.g., Azure Container Apps) | Separate worker and API |
| Mobile builds | EAS Build/Submit | Dev/staging/prod release channels |

**Rationale:** Expo can support web, but separate Next.js web and Expo mobile clients provide flexibility for an advanced browser editor and SEO-centric public shops; share schema/design tokens/business logic rather than promising one identical UI implementation. Expo's documented static and server rendering capabilities remain a viable alternative if simplifying to one UI project later. 

### 8.2 Repository layout
```
apps/
  web/                    # Next.js, responsive web, web editor
  mobile/                 # Expo RN iOS/Android, mobile editor
  api/                    # FastAPI, SQLAlchemy, Alembic
  worker/                 # background tasks (can share Python code)
packages/
  ui/                     # shared Tamagui components and design tokens
  storefront-schema/      # authoritative JSON schema, migrations, fixtures
  storefront-renderer/    # block semantics + optional shared components
  api-client/             # generated OpenAPI client, domain query hooks
  config/                 # TS, ESLint, Prettier, env schema
  assets/                 # licensed shared icons/stock placeholders
infra/
  docker/
  terraform-or-bicep/    # pick one IaC system, document choice
  github-actions/
docs/
  decisions/              # ADRs (payments, schema versioning, renderers)
  api/
  runbooks/
```

### 8.3 Dependency guidelines
Use stable versions verified at implementation time; pin exact versions in lockfiles. Do **not** assume future compatibility of Next.js, React Native, Expo SDK, Tamagui or gesture packages. Establish minimal web/mobile builds first before depending on elaborate editor packages. Maintain ADRs for deviations.

### 8.4 System request flows
**Public shop:** browser/native → public shop API → published version JSON + product references → renderer → CDN images. Web server SSRs essential indexable text and metadata, using safe cache invalidation upon publish.

**Edit:** authenticated owner → draft API → editor local state → schema validation → optimistic save → preview renderer → publish endpoint → immutable published snapshot → cache purge/revalidation.

**Checkout:** buyer → quote API → order transaction/reservation → payment provider → signed webhook → transactional order transition + ledger records → seller/buyer notifications.

---

## 9. Database schema (initial relational design)

Every table has `id` (UUID/ULID consistently), `created_at`, `updated_at` when applicable. Use FK constraints, unique indexes, check constraints and migrations; soft delete only where domain retention requires it.

| Table | Important columns / relations | Constraints / notes |
|---|---|---|
| `profiles` | user_id PK/Auth id, handle, display_name, bio, avatar_asset_id, state | unique lower(handle); privacy settings |
| `shops` | id, owner_user_id, slug, name, bio, status, seller_enabled, onboarding_status, currency | unique lower(slug); one shop/owner MVP |
| `shop_members` | shop_id, user_id, role | future extensibility; owner protected |
| `shop_followers` | shop_id, user_id, created_at | unique(shop_id,user_id) |
| `assets` | id, owner_user_id, shop_id nullable, bucket_path, mime, dimensions, checksum, status | ownership verified; no raw user path trust |
| `storefront_drafts` | shop_id PK, schema_version, doc_json JSONB, revision, updated_by | monotonic revision; owner-only |
| `storefront_versions` | id, shop_id, version_no, schema_version, doc_json JSONB, checksum, published_by, published_at | immutable; unique(shop_id,version_no) |
| `shop_publications` | shop_id PK, version_id FK | atomic pointer to current publication |
| `themes` | id, slug, name, schema_version, template_json, visibility | seeded template catalog |
| `products` | id, shop_id, slug, title, description, status, category_id, base_price_minor, currency | unique(shop_id,slug); money ≥0 |
| `product_variants` | id, product_id, sku, option_values JSONB, price_minor nullable, stock_on_hand, stock_reserved | nonnegative counts, unique(product_id,sku) |
| `product_images` | product_id, asset_id, sort_order, alt | ordered images |
| `collections` | id, shop_id, title, slug, status | unique(shop_id,slug) |
| `collection_items` | collection_id, product_id, position | unique(collection_id,product_id) |
| `product_favorites` | user_id, product_id | unique pair |
| `carts` | id, user_id or anon token, shop_id, status | **single shop** |
| `cart_items` | cart_id, variant_id, quantity | price never trusted from client |
| `orders` | id, shop_id, buyer_user_id, state, currency, subtotal_minor, shipping_minor, discount_minor, tax_minor, total_minor, address_snapshot JSONB | financial amounts immutable once submitted, state transition auditing |
| `order_items` | id, order_id, product/variant refs, title_snapshot, sku_snapshot, qty, unit_price_minor | preserve historical truth |
| `inventory_reservations` | id, variant_id, order_id, quantity, expires_at, status | expiration release; unique active reservation/order variation as needed |
| `payments` | id, order_id, provider, provider_payment_id, status, amount_minor, currency | unique provider reference, audit webhook events |
| `payment_webhook_events` | provider, external_event_id, payload_hash, processed_at | idempotent processing unique(provider,external_event_id) |
| `order_events` | id, order_id, actor_id/system, from_state, to_state, metadata, created_at | append only |
| `addresses` | id, user_id, fields/encrypted sensitive values | user ownership; snapshots for orders |
| `posts` | id, shop_id, author_id, slug, title, body_json, state, published_at, scheduled_at | `P1` |
| `post_product_refs` | post_id, product_id | `P1` |
| `guestbook_entries` | id, shop_id, author_id, text, state, moderated_by | `P1` |
| `notifications` | id, user_id, type, payload, read_at | no sensitive data in push payload |
| `reports` | id, reporter_id, target_type, target_id, reason, status | moderation queue |
| `audit_logs` | id, actor, action, resource, before/after hashes, timestamp | restrict PII, append only |
| `outbox_events` | id, event_type, payload, processed_at, attempts | reliable async dispatch |

**Indexes:** `shops(slug)`, `products(shop_id,status,created_at)`, `product_variants(product_id)`, `storefront_versions(shop_id,version_no DESC)`, `orders(shop_id,created_at DESC)`, `orders(buyer_user_id,created_at DESC)`, GIN/trigram indexes for public search, foreign-key join indexes.

**DB access design:** FastAPI application identity is the central authority for business operations. If using a privileged database service role, implement and test ownership/tenant filters rigorously. Exposing Supabase directly to the clients requires strict RLS on every accessible table. Restrict client Storage policies and never expose service-role keys. Pick and document ONE data access model; do not accidentally mix it.

---

## 10. REST API contract v1

All endpoints under `/api/v1`. JSON responses use stable typed envelopes for errors; paginated endpoints return cursor/hasMore. Authenticate all writes, including editor mutations. Define full Pydantic models and publish OpenAPI.

### 10.1 Identity and profiles
```
GET    /me
PATCH  /me
GET    /users/{handle}
POST   /me/seller-onboarding
GET    /me/seller-onboarding/status
```

### 10.2 Shops and storefront editor
```
POST   /shops
GET    /shops/{slug}                   # public shell and shop metadata
GET    /shops/{shopId}/published       # current version JSON / ETag
GET    /shops/{shopId}/draft           # owner only
PATCH  /shops/{shopId}/draft           # owner only; If-Match revision
POST   /shops/{shopId}/publish         # owner only; returns new version
GET    /shops/{shopId}/versions        # owner only
POST   /shops/{shopId}/restore         # copies prior version into draft
GET    /themes                        # public, paginated
POST   /shops/{shopId}/follow
DELETE /shops/{shopId}/follow
```

**Draft PATCH request:** `{ "document": StorefrontDocument, "baseRevision": 13, "clientMutationId": "uuid" }`. Response includes server `revision`, `updatedAt`, `etag`, validationWarnings. Support conflict `409` with server revision metadata and no silent replacement. `POST publish` accepts `{ "expectedRevision": 14, "note": "Fall drop" }` and returns `{versionId,versionNo,publishedAt}`. Validate cross-referenced assets/products atomically.

### 10.3 Catalog and discovery
```
GET    /discover
GET    /search?q=&type=&category=&priceMin=&priceMax=&sort=&cursor=
POST   /shops/{shopId}/products
GET    /shops/{shopId}/products
GET    /products/{idOrSlug}
PATCH  /products/{id}
POST   /products/{id}/publish
POST   /products/{id}/archive
POST   /shops/{shopId}/collections
PATCH  /collections/{id}
POST   /products/{id}/favorite
DELETE /products/{id}/favorite
```

### 10.4 Storage
```
POST   /uploads/initiate
POST   /uploads/{uploadId}/complete
GET    /assets/{id}
DELETE /assets/{id}
```

`initiate` returns server-authorized upload target and constraints, never arbitrary destination from client. `complete` validates actual content + ownership before asset can be referenced in published document.

### 10.5 Cart, order, payment
```
GET    /cart?shopId=
PUT    /cart/items/{variantId}
DELETE /cart/items/{variantId}
POST   /checkout/quote               # authoritative totals
POST   /checkout/session             # idempotency key required
GET    /orders                        # buyer orders
GET    /orders/{id}                   # buyer or owning shop
GET    /shops/{shopId}/orders         # owner only
POST   /shops/{shopId}/orders/{id}/ship
POST   /orders/{id}/cancel-request
POST   /webhooks/payments/{provider}   # signed inbound webhook
```

**Error structure:**
```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Your storefront was updated from another device.",
    "details": {"currentRevision": 14},
    "requestId": "req_abc"
  }
}
```

Standard response statuses: `400` malformed, `401` unauthenticated, `403` unauthorized, `404` hidden/missing resource, `409` conflict, `422` validation, `429` rate limited, `5xx` server failure. Never leak private existence through unauthorized detail.

### 10.6 P1 routes
```
GET/POST /shops/{shopId}/posts
PATCH    /posts/{id}
POST     /posts/{id}/publish
GET      /feed/following
GET/POST /shops/{shopId}/guestbook
POST     /reports
```

---

## 11. Payment, shipping, and trust architecture

### 11.1 Explicit production payment decision gate
Do not blindly assume a specific marketplace payout arrangement is available to a Malaysian entity or its sellers. Before production payment enablement verify, **with provider and legal/compliance counsel**:
- Whether entity and seller countries are supported for a multi-vendor marketplace/platform product.
- Connected-account onboarding and required identity checks.
- Charge ownership, merchant of record, funds flow, payout timing, platform fees, refunds/chargebacks and negative balances.
- Regulatory, consumer protection, tax/e-invoicing, PDPA and merchant terms for the selected business model.
- Provider production approval and end-to-end refunds/disputes test.

If unavailable, limit app to catalog + **sandbox checkout** or approved external/merchant-per-seller checkout model. Do NOT improvise collection or redistribution of seller funds into an unreviewed bank account.

### 11.2 Checkout and inventory invariants
- Price is snapshotted from DB in one transaction and never supplied as an authoritative client value.
- All order, payment and inventory state changes are transactional/idempotent.
- Lock or atomically decrement available inventory to prevent concurrent oversell.
- Webhook retries cannot create duplicate orders or double-decrement inventory.
- Refund and cancel behavior properly reconcile reserved versus sold inventory (return-to-stock policy configurable).

### 11.3 Fulfillment MVP
Seller-defined domestic shipping options and flat-rate rules; collect accurate address and tracking optional. No invented live carrier rates. Integrate carrier APIs later. Seller must show shipping estimate and return policy before buyer pays.

### 11.4 Moderation and customer trust
- Report shops/products/posts, admin takedown, shop suspension and audit trail.
- Product category and restricted-goods rules configured by jurisdiction, including counterfeit and unsafe items.
- Separate verified purchase reviews from guestbook messages.
- Seller identity verification marker only when genuinely verified; never fabricate ratings.
- Clear buyer support, cancel/refund pathways and data handling policies.

---

## 12. Security, privacy, and robustness

### 12.1 Mandatory controls
- Auth JWT issuer/audience/signature verification and token expiration handling.
- Ownership/authorization checks on every shop, asset, product, order, post and moderation endpoint.
- Rate limits on login-adjacent actions, search, uploads, guestbooks, checkout and AI.
- Validate uploaded MIME/magic bytes/size/dimensions, use safe transform service, no executable SVG or HTML asset uploads.
- Block SSRF: no server fetching arbitrary seller URLs without strict validation; external links rendered, not fetched.
- Sanitize rich text and links; strict schema allowlist avoids XSS/custom JavaScript.
- CSRF protections for cookie-auth web mutations (or correctly used token auth); secure CORS allowlists.
- Server-side payment verification, constant-time signature comparison via trusted libs, webhook replay handling.
- Admin tools require distinct role checks and audit every sensitive action.
- No card credentials stored; never log tokens, full addresses, credentials or gateway secrets.
- Backup, restore drill, retention policy and secure deletion paths.

### 12.2 Privacy / compliance review
Before launch, review Malaysian Personal Data Protection Act obligations and applicable e-commerce rules, consent and notices, deletion/retention periods, any cross-border processors and policies. Legal/compliance review is a project **gate**, not a feature the model can declare complete.

### 12.3 Accessibility
- WCAG 2.2 AA target for core buyer and editor flows.
- Semantic headings, alt text, keyboard navigation, 44 logical point mobile tap targets, screen reader labels and focus indicators.
- Contrast analyzer in theme editor warns on inaccessible pairings; accessible defaults and safe foreground fallbacks.
- Respect reduced motion, OS text scaling, screen safe areas and keyboard avoidance.

---

## 13. Design system, performance, and SEO

### 13.1 Design philosophy
- The **app chrome** stays modern, quiet, consistent; the **user's shop content** is expressive and playful.
- Three-tab navigation never visually disappears under shop customizations.
- Theme editing must feel playful but not intimidating. Start from beautiful templates with one-tap variations.
- New seller gets meaningful default content/placeholders, not an empty blank canvas.

### 13.2 Design tokens
Tokens for `colors`, `space`, `radii`, `font sizes`, `shadows`, `breakpoints`, `motion`, `zIndex`. Separate platform UI design tokens from seller-controlled shop theme tokens; malicious seller theme cannot change native app nav/checkout.

### 13.3 Performance targets (pilot SLOs)
- Public storefront web: Core Web Vitals targets LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75 on appropriate mobile field data, acknowledging network/device variation.
- Initial editor interactions responsive (<100ms perceived response for typical block edit); full page preview 60fps where feasible for modest templates.
- Draft save: clear status within 1s of network acknowledgment under normal connectivity.
- Optimize images via responsive sizes, lazy-loading below fold, placeholder while loading; CDN cache published assets.
- Search API p95 target <500ms for reasonable catalog size, measured rather than guaranteed.

### 13.4 SEO and sharing (web)
- SSR public `/shop/[slug]`, `/product/[slug]`, and posts when P1 implemented.
- Canonical URLs, unique titles/descriptions, Open Graph image and social share preview, sitemap, robots rules, structured Product schema only with truthful live price/availability.
- Draft or private editor routes: `noindex`, require auth.
- Shop slug changes use controlled redirects; avoid broken inbound social links.

---

## 14. Testing strategy and acceptance criteria

### 14.1 Tooling
- Frontend: Vitest + React Testing Library; Playwright desktop/mobile-web E2E and screenshot tests.
- Mobile: Jest/RNTL for units and Maestro/Detox (choose working runner) for device E2E.
- API: pytest, pytest-asyncio (as needed), httpx, SQLAlchemy integration tests against real test PostgreSQL.
- Contract: OpenAPI-generated TS client checked against FastAPI; JSON Schema cross-language fixtures; migrations up/down on disposable database.
- Security: dependency scans, static checks, secret scanning, authorization matrix tests.

### 14.2 Editor release-critical acceptance tests (`P0`)
- **E01** New seller applies one of eight templates and publishes without any manual JSON/code.
- **E02** On **mobile**, seller changes font family, H1 font size, background color, hero image/crop, moves product grid above gallery, and publishes successfully.
- **E03** On **web**, drag block from library into valid section, copy/duplicate it, edit inspector fields, undo, redo, and publish.
- **E04** Changing section order immediately updates canvas and preview; refresh preserves autosaved changes.
- **E05** Phone/tablet/desktop previews retain layout integrity; long words and oversize media never cause horizontal page overflow at 320px viewport.
- **E06** Block can't be dropped into forbidden structure; invalid schema can't publish.
- **E07** Published shop remains unchanged while draft is edited; publishing updates public view atomically.
- **E08** Version restore creates draft copy; old published snapshot remains available for audit.
- **E09** Two devices update same draft; stale save gets `409`, never erases newer content.
- **E10** Offline editing communicates offline state; reconnection cannot silently destroy remote edits.
- **E11** Unsafe external links/scripts/HTML are rejected; malformed asset references fail safely.
- **E12** Screen reader focus and keyboard action controls allow edit without drag gestures.
- **E13** A seller cannot read/update another seller's draft or private asset.
- **E14** Shop buyer mode works on both native apps and public web from exact same published schema.
- **E15** Theme controls never override or obscure checkout UI, global navigation or pricing.

### 14.3 Commerce release-critical tests
- **C01** Seller creates product with 2 variants, pictures, MYR price and stock; product appears publicly.
- **C02** Browser filters/search finds matching shop/product; private products absent.
- **C03** Buyer can follow shop and favorite product, with idempotent operations.
- **C04** Checkout quote ignores tampered client price and uses server price.
- **C05** Two buyers racing for final unit: only one succeeds; inventory never <0.
- **C06** Duplicate payment webhook creates exactly one paid transition.
- **C07** Buyer cannot access someone else's order; seller cannot view competing shop order.
- **C08** Failure/refund/cancel transitions preserve consistent payment and inventory state.
- **C09** UI always states `Sandbox checkout` when no approved live provider is configured.
- **C10** App has exactly three bottom navigation destinations on Android and iOS.

### 14.4 Quality gates
For each PR: formatting/lint, typecheck, unit tests, API tests, key web E2E and build. For releases: device smoke tests iOS/Android, web responsive screenshots, schema migration smoke test, load test key endpoints, security review and manual pilot UX testing.

---

## 15. Step-by-step implementation plan (vertical slices)

**Important:** Do not implement all models/APIs first and UI last. Every milestone must demonstrate a working path from UI → API → DB → verification, and must include tests.

### Milestone M0 — Foundation (P0)
**Build:** monorepo, Next.js web, Expo mobile, FastAPI API, managed/local PostgreSQL, migrations, Supabase Auth integration, shared tokens/schema, CI, Docker local dev, `.env.example`, health checks.

**Done when:** `pnpm install`, dev commands, DB migrations, API health endpoint, both clients run, one shared authenticated API call works, CI green.

### Milestone M1 — Accounts, profile and navigation (P0)
**Build:** auth screens, handle selection, profile, exactly three tabs, native/web nested routes, login/logout/session refresh, seller enablement flags.

**Done when:** register/login, open profile, sign out, web deep link and native navigation work; no extra tabs.

### Milestone M2 — Storefront renderer + eight themes (P0)
**Build:** JSON Schema, block registry, theme tokens, responsive renderer, fixture pages, seed templates, SSR public shop pages, tests for unsupported blocks.

**Done when:** same template JSON renders coherently on web and both native clients; snapshots at 320/390/768/1280 widths pass.

### Milestone M3 — Full storefront editor (P0, highest priority)
**Build:** desktop 3-pane editor and native mobile edit mode; block catalog, add/delete/duplicate/reorder, inspector content/style/layout/responsive, custom typography/backgrounds, image management/crop, draft autosave, preview, publish/version restore, conflict/offline states, advanced mode.

**Done when:** acceptance E01–E15 pass; pilot seller can achieve requested example storefront using only UI. **Do not move on if this is half-implemented.**

### Milestone M4 — Catalog and discovery (P0)
**Build:** create/publish products, variants, collection ordering, shop/product public pages, search/filter, follow/favorite, Discover feed.

**Done when:** sample seller publishes product; shopper finds it and visits themed shop. Search is scoped to public products only.

### Milestone M5 — Sandbox orders and operational tools (P0)
**Build:** shop cart, checkout quote, inventory reservations, payment adapter & sandbox, idempotent webhook simulation, order state machine, buyer/seller order UI, flat-rate shipping, admin suspend/report.

**Done when:** order end-to-end in sandbox passes C04–C09; concurrency test prevents oversell. Production charges **not** enabled automatically.

### Milestone M6 — Polish + pilot (P0)
**Build:** comprehensive device QA, accessibility, performance, telemetry, moderation/runbooks, onboarding tours, demo content, SEO, deployment pipeline.

**Done when:** all P0 criteria met; demo web + installable staging mobile apps; known issues list; successful pilot walkthrough.

### Milestone M7 — Social layer (P1)
**Build:** seller blog composer, following feed, launches, countdown, guestbooks, moderation and notification preferences.

**Done when:** posts appear on seller page/feed; product tags buyable; spam control tested.

### Milestone M8 — Growth and design ecosystem (P2)
**Build:** AI-to-JSON theme generator, themes marketplace, creator templates, analytics, collaborative collections, custom domains where supported.

---

## 16. Definition of done and agent delivery contract

For every milestone agent should deliver:
1. Working code checked into repository with clear directory structure.
2. Executable local setup instructions and `.env.example`; no hard-coded tokens.
3. DB migrations + seed scripts/fixtures.
4. API endpoint examples and updated OpenAPI/JSON Schema.
5. Passing tests relevant to implemented features, with commands and results.
6. Screenshots of desktop/mobile renderings and editor workflow, or test artifacts in CI (no fake screenshots).
7. List of genuinely implemented features, known gaps, security/payment launch gates and next steps.
8. Reasonable error, loading, empty-state and retry paths, not only happy-path screens.

**Hard stop conditions:** no demo-only local state pretending to be saved; no clickable buttons without behavior; no production payment claims without approval; no direct unsafe HTML injection; no fake product prices or reviews; no additional persistent bottom tabs.

### 16.1 Commands and makefile contract
At a minimum, provide commands (names may be adjusted but document exact equivalents):
```bash
pnpm install
pnpm dev:web
pnpm dev:mobile
pnpm dev:api
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
# Python/API equivalents:
uv run pytest
uv run alembic upgrade head
```

### 16.2 Fixtures / seed data
Seed 8 shops, one per visual template; ≥3 products/shop, two variants on at least two products, one public collection/shop, sample followers, sample past orders only in sandbox, one draft distinct from published version, sample broken-link validation fixture.

### 16.3 Demo flow
- Sign in as seeded shop owner → My Space → Customize.
- Select Y2K Diary → change accent to purple → upload hero → resize heading → reposition product grid → phone preview → Publish.
- Open public link in private browser and native app; confirm same published content.
- Update draft without publishing; confirm public page unchanged.
- Create product, find from Discover, favorite/follow, place test order, update fulfillment.
- Demonstrate stale-revision conflict from two sessions, XSS prevention and final-unit oversell protection.

---

## 17. Decisions register / questions to resolve later (do not block scaffold)

| Decision | MVP default | When must decide |
|---|---|---|
| Final brand/name/domain | Placeholder `MySpace for Shops` | Before public marketing |
| First seller niche | Malaysian independent creative sellers | Before pilot recruitment |
| Seller verification process | Sandbox/seller enabled, live payments disabled | Before taking payments |
| Payments provider/platform fund flow | `SandboxPaymentProvider` behind interface | Before production checkout |
| Merchant of record and legal entity | Unresolved | Before production checkout |
| Shipping carrier integration | Manual/flat-rate seller shipping | When scaling fulfillment |
| Supported catalog restrictions | Physical goods, configurable restricted list | Before public selling |
| AI design assistant | P2 only, schema-restricted | After editor quality baseline |
| Monetization | No upfront paywall; defer fee setting | Before live transactions |
| Theme marketplace licensing | P2, content assets cannot be copied implicitly | Before marketplace feature |
| Custom domains | P2 | After public slug/SEO stable |

---

## 18. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Editor overwhelming on phones | High | Beginner mode, templates, contextual inspector, usability tests |
| Arbitrary customization breaks mobile UI | High | Grid/stack schema, bounded style values, breakpoint defaults, snapshots |
| Cross-platform visual parity drifts | High | Shared document schema/tokens + golden fixtures, per-platform renderer tests |
| Marketplace payment/payout model unsupported | Critical | Strict gateway adapter and launch gate, sandbox default |
| Fake sellers/counterfeits | High | Seller checks, reports, moderation, audit trail |
| Inventory overselling | Critical | Transactional reservation, idempotent webhook, concurrency tests |
| Slow user-built pages | Medium–high | Block/image limits, CDN variants, lazy load, performance budgets |
| Schema upgrade corrupts old pages | High | Explicit schema version, migration fixtures, rollback snapshots |
| Unsafe user content/XSS | Critical | Strict JSON schema, sanitization, server validation, security tests |
| Too-broad initial scope | High | Milestones M0–M6 first; social/AI deferred |

---

## 19. Agent start instruction (copy/paste)

> Read `SOCIAL_COMMERCE_APP_TECHNICAL_SPEC.md` fully. Treat Sections 0, 4, 5, 6, 14 and 15 as highest-priority requirements. Build the app in end-to-end milestones M0 → M6, starting with repo setup, auth, three-tab navigation and the shared versioned storefront schema. The seller storefront editor must work on both web and native mobile, with real add/move/duplicate/delete controls, accessible style inspectors, advanced font/layout/background customization, responsive preview, drafts/autosave, versioning/publishing and reliable persistence. Use Next.js + Expo + FastAPI + PostgreSQL in a pnpm/Turborepo monorepo; JSON Schema is the shared contract. Deliver working code, migrations, test fixtures, documentation and E2E tests for each milestone. Do not leave placeholder implementations or switch on live payment processing; use an explicit sandbox adapter. If a business decision is unresolved, implement the safe documented default and record it in an ADR. Provide actual verification output at the end of each milestone.

---

## 20. Authoritative technical reading (validate current versions at implementation)

- Expo Router web static rendering: https://docs.expo.dev/router/web/static-rendering/
- Expo Router web server rendering: https://docs.expo.dev/router/web/server-rendering/
- Tamagui: https://tamagui.dev/
- Next.js App Router: https://nextjs.org/docs/app
- FastAPI: https://fastapi.tiangolo.com/
- Supabase Storage Access Control/RLS: https://supabase.com/docs/guides/storage/security/access-control
- Stripe Connect availability/country support (verify applicability and actual agreement): https://docs.stripe.com/connect
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

**End of spec.**
