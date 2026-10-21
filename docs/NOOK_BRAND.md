# Nook brand and design system

Nook is **a cosy corner of the internet where small shops move in and make it theirs.** The product metaphor drives the copy, the shapes and the motion: shoppers *wander the neighbourhood*, sellers *move in, decorate and open the door*, and **My Space** is the seller's own room.

## Voice

Warm, a little cheeky, never corporate. Short sentences. Verbs from the metaphor (move in, decorate, open the door, peek inside, neighbours, nooks). Keep core actions literal (Save, Follow, Sign in, Place sandbox order) so nothing is cute at the expense of clarity. The three destinations stay exactly **Discover, My Space, Settings**.

## Identity

- **Mark:** a dark arch (a doorway) around a lit butter-yellow niche with a persimmon lamp sitting in it. Web: `apps/web/components/brand.tsx` (`NookMark`, `Logo`). Native: `apps/mobile/components/brand.tsx` (built from plain views). The favicon is `apps/web/app/icon.svg`; native icons are in `apps/mobile/assets`.
- **Wordmark:** lowercase `nook` in Caprasimo.
- **Shapes:** arches. Shops show up as arched windows, hero doorways and the profile photo on My Space.
- **Stickers:** chunky ink outlines, hard offset shadows, slightly tilted chips and price tags, hand-written notes, a rotating stamp, a swinging OPEN sign. Dense admin surfaces (editor, tables, settings) use the same palette with calmer lines.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#F8F1E4` | page background (with a very light grain on web) |
| card | `#FFFBF3` | surfaces |
| ink | `#211A2E` | text, outlines, shadows, active controls |
| persimmon | `#FF5A36` | primary actions, brand accent (use ink text on it) |
| butter | `#FFD15C` | prices, highlights |
| lilac | `#CDB8FF` | the nod to the old Lilac name; soft actions, stat stickers |
| pink / mint / sky | `#FFB5CC` / `#B7E4C7` / `#B8DAFF` | shop "walls", stat stickers |

Text on persimmon is ink, never white (contrast). Muted text is `#6B6279` or darker on paper. Tokens live in `apps/web/app/globals.css` (`:root`) and `packages/ui/src/index.ts`.

## Type

- **Caprasimo** for headlines, the wordmark and big numbers.
- **Bricolage Grotesque** (400-800) for everything else.
- **Caveat** for hand-written notes only.

Fonts are bundled locally (web: `apps/web/public/fonts`, native: `apps/mobile/assets/fonts`, loaded in `app/_layout.tsx`). Seller storefronts keep their own font choices; the editor's "Inter" option maps to a system sans (`--shop-sans`) rather than the app font.

## Motion

Short, springy, and switched off for reduced motion on both platforms.

- Web: `components/motion.tsx` (`Reveal` scroll reveals, `Words` headline rise, `CountUp`, `useParallax`), `app/template.tsx` (page enter), a sliding pill in the header and mobile dock, hero doors that float and follow the pointer, a marquee ticker, hearts that burst, buttons that sink onto their shadow.
- Native: `components/motion.tsx` (Reanimated: `RevealScroll` + `Reveal`, `Bob`, `Swing`, `Spin`, `Marquee`, `Key` physical-key buttons, `PopIn`), a floating dock whose pill springs between tabs, a spring-in sheet and toast.

## Where seller expression lives

My Space opens as the shop's own room. It borrows the colours of the look the seller has published, shows their name, handle, vibe chips and cover in an arched window, then offers a "furnish your nook" checklist, stats stickers, the template gallery ("Try on a new look") and a live preview of the public shop inside a little browser window. Public shop pages use the same window frame, so a visit feels like stepping into someone's place. Everything a shop publishes still goes through the safe block schema; Nook chrome never leaks into a seller's own theme (product cards and buttons inside a storefront are neutral and follow the seller's colours).

## Not changed

Internal identifiers that predate the rename (`@lilac/*` packages, `lilac` databases, `lilac-*` storage keys, the `demo@lilac.local` account) are unchanged on purpose; see the README.
