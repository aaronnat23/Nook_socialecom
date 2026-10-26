# Starter templates and the storefront vocabulary

Sellers decorate their shop with a JSON document (`packages/storefront-schema`, schema v1) made of
sections and blocks. Starter templates are just documents, so they render the same on web and native,
stay editable block by block, and can never carry markup, script or free-form CSS. Everything a
template (or a seller) can express is an allow-listed token validated on both the web and API sides.

## The 14 starters

| #   | Template        | Mood              | What makes it itself                                                           |
| --- | --------------- | ----------------- | ------------------------------------------------------------------------------ |
| 1   | Minimal Studio  | Soft & considered | Georgia, split hero, open grid, a letter with a drop cap                       |
| 2   | Vintage Film    | Typewriter        | Courier throughout, marquee ticker, film-strip gallery, numbered contact sheet |
| 3   | Y2K Diary       | Pink & playful    | Caveat on graph paper, banner header, circle photo, polaroids, taped notes     |
| 4   | Dark Editorial  | After hours       | DM Serif Display, full-bleed overlay cover, pull quote, lookbook, masonry wall |
| 5   | Handmade Market | Made with feeling | Kraft palette, arched portrait, maker's letter, framed photos, swipeable stall |
| 6   | Streetwear Drop | Loud & limited    | Archivo Black poster type, ticker tape, hazard stripes, mosaic drop            |
| 7   | Botanical       | Naturally quiet   | Sage gradient, arched centered cover, spotlight product, masonry greenery      |
| 8   | Art Gallery     | White cube        | Space Mono labels, stacked cover, framed works with captions, price catalogue  |
| 9   | Candy Counter   | Sweet & bubbly    | Caprasimo, polka dots, pill-shaped photos, pick-and-mix mosaic, sticky notes   |
| 10  | Photocopy Zine  | Cut, paste & copy | Space Mono on newsprint dots, hazard tape, polaroid snaps, taped notes         |
| 11  | Atelier         | Tailored & calm   | Letterspaced wordmark, flipped tall cover, lookbook spreads, wide-left story   |
| 12  | Night Market    | Lantern light     | Navy and amber, overlay cover, swipeable stalls, round medallions              |
| 13  | Seaside Studio  | Salt air          | Ocean gradient cover, arched windows, polaroid postcard, gentle wave           |
| 14  | Terrazzo Studio | Colour blocks     | Archivo Black on a checker, arch / circle / pill photos, cut-paper note        |

The first eight ids are stable: seed data assigns them to the sample shops by position, and new
accounts start from the first. Do not reorder them.

## Vocabulary

**Layout variants** (`block.props.variant`; the first value of each list is the default):

| Block           | Variants                                      |
| --------------- | --------------------------------------------- |
| hero            | split, flip, centered, overlay, poster, stack |
| profileHeader   | row, centered, banner, minimal                |
| text            | plain, quote, note, letter                    |
| image           | plain, framed, polaroid                       |
| gallery         | grid, filmstrip, polaroid, masonry            |
| productGrid     | grid, list, carousel, mosaic, lookbook        |
| featuredProduct | card, spotlight                               |
| announcement    | bar, marquee, pill                            |
| divider         | line, dots, wave, stars, ornament             |
| button          | solid, outline, link                          |
| socialLinks     | links, chips                                  |
| columns         | even, wideLeft, wideRight                     |

**Style tokens** added on top of the original set: `pattern` (none, dots, grid, stripes, checker)
with `patternColor`, `shape` for photos (rect, arch, pill, circle), ten `gradient` names, more
`aspectRatio` values (4:5, 3:2, 21:9), text sizes up to 160, and ten fonts: Inter, Georgia, Arial,
Courier New, Trebuchet MS (system) plus Caprasimo, Caveat, DM Serif Display, Archivo Black and Space
Mono (bundled, SIL Open Font License, licences next to the web font files).

The single source of truth is `scripts/create-contract.py` (JSON schema) and
`packages/storefront-schema/src/index.ts` (types, `variantOptions`, `gradientStops`, labels and
hints the editors read). Web renders variants in `apps/web/components/storefront.tsx`,
`storefront-parts.tsx` and `app/storefront-variants.css` (narrow rules use container queries, so the
editor's phone preview and thumbnails behave like a phone). Native renders them in
`apps/mobile/components/storefront.tsx` and `storefront-parts.tsx`.

## Adding or changing a template

1. Edit `scripts/build-templates.py` (small helpers `B`, `S`, `template`), then run
   `.venv/bin/python scripts/build-templates.py` and `npx prettier --write packages/storefront-schema/fixtures/themes.json`.
2. Add its mood, audience, features and cover to `templateDetails` in `packages/storefront-schema/src/index.ts`.
3. Only the sample photos are allowed in templates: `seed_hero_0-7`, `seed_product_0-23` and the ten
   `seed_cutout_*` images. Hero, image and profile photos need alt text to publish.
4. Keep text readable: the API refuses to publish a block whose text/background contrast is under 3:1
   (check with the pairs you set; patterns and gradients are not measured). Accent colours should also
   reach 4.5:1 on the page background, because prices and links use them.
5. Run `pnpm exec vitest run` (templates must validate, differ in structure and look, and together use
   every variant), `pytest apps/api/tests` and the template e2e spec.

Run `scripts/create-contract.py` only to change the schema; it no longer touches the templates.
