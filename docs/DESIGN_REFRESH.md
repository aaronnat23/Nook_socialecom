# Lilac design refresh

The design refresh is implemented in the native iPhone app and responsive web app. It preserves the three main destinations, existing catalog and sandbox commerce flows.

## Visual changes

- A richer lilac system: deeper plum accents, softer background surfaces, larger corners, consistent borders, shadows and clearer typography.
- Discover has a new editorial gradient hero and photographic collage. My Space has a seller studio card, direct management shortcuts, a compact published-shop card and a template collection on iPhone.
- Shared native sheets replace the previous plain pages for sign-in, product and collection editing, editor properties, block library, templates and version history. They use a dimmed background, rounded panel, gradient header, clear close action and scrolling content. Template previews include a fixed customization action.
- Native buttons have spring press feedback; sections reveal in sequence; sheets animate in and out; tabs transition between screens. Web adds dialog entrances, card/image hover treatments and staggered reveals. Motion follows the platform's reduced-motion preference; a full native preference-toggle audit remains open.
- Notifications use an accessible, dismissible in-app message, including inside native sheets. Important replacement choices remain explicit. Template replacement backs up the saved draft and leaves the public shop unchanged until publication.

## Templates

All eight existing starter templates now have more distinct styling and presentation. The gallery supports full read-only previews and entry into the editor's application choices.

The subsequent layout revision replaces the fixed preview composition with scaled renders of each actual document. Templates differ in block hierarchy, section count, ordering, image placement and desktop/mobile grids. Their layouts remain editable data. Native column groups now support explicit mobile grids and direct selection of child cards. Product spotlights bind to the seller's own catalog.

| Template        | Structure                                                      |
| --------------- | -------------------------------------------------------------- |
| Minimal Studio  | Split hero, open product grid, quiet studio story              |
| Dark Editorial  | Oversized masthead, cinematic cover, editorial side column     |
| Botanical       | Image-first cover, two-part story, single product spotlight    |
| Y2K Diary       | Centered profile, two-column scrapbook, photo and note cards   |
| Vintage Film    | Photo contact sheet, centered title, mobile archive list       |
| Handmade Market | Maker letter, paired portrait images, worktable story          |
| Streetwear Drop | Product-first drop, oversized type, full-width campaign        |
| Art Gallery     | Asymmetric exhibition cover, paired art wall, curator captions |

Previewing a design does not change the draft. Sellers can apply only the theme palette/font pairing or replace the draft layout. Product records stay in the catalog. Replacement creates an immutable backup and supports undo.

## Verification

- **Physical iPhone via iPhone Mirroring:** refreshed Discover/My Space and three tabs; gallery and full Minimal Studio preview; preview-to-editor options; block library, add and undo; style inspector; template application, automatic backup, public/draft separation and undo; product and collection sheets opened and closed. Saved API readback confirms the final draft matches publication 24 and the temporary test block is gone.
- **Desktop browser:** 11 regression tests passed, including search, persisted profile/favorites, editor save/publish/restore, offline/conflict recovery, collections, responsive storefronts, typography and sandbox checkout/refund. The final focused template test also passed after the last contrast refinements.
- **Template gallery accessibility scan:** zero automated violations in `.template-section`; this is a scoped web scan, not full accessibility certification.
- **TypeScript:** all six packages passed. **Shared document tests:** 17 passed. **PostgreSQL API integration:** 18 passed, with one upstream Starlette test-client deprecation warning.
- **Production web build and iOS bundle export:** passed. Android and emulator testing were not used for this refresh.

Evidence: [readback](../artifacts/design-refresh-verification.json), [web gallery](../artifacts/template-collection-desktop.png), [dark preview](../artifacts/template-dark-preview-desktop.png), and `artifacts/iphone-redesign-*.png` from the actual phone.

An Expo Go development reload briefly reported a missing native module during active refresh. Expo Go's Try again action recovered the app, after which the phone walkthrough continued. This is recorded separately from successful bundle generation and manual app checks.

## Remaining coverage

The new native sign-in sheet uses the existing authentication flow but did not receive a fresh sign-out/sign-in walkthrough during this design pass. Native photo permissions/crop, all-template device coverage, VoiceOver, large type, keyboard behavior, reduced-motion preference toggling and signed staging builds remain release work. See [PILOT_READINESS.md](PILOT_READINESS.md). No live payments, production deployment or remote provider changes were made.

## Layout revision verification

- All eight templates pass schema validation and the API's draft/save/publication checks. A structural regression ignores content and palette and verifies eight unique compositions.
- Browser coverage now opens all eight full previews, checks distinct rendered structures and overflow, and saves one screenshot per design. Applying Dark Editorial, selecting its nested product grid by keyboard, backing up and undoing pass.
- Physical iPhone inspection verifies the photo contact sheet and scrapbook previews. Applying Y2K Diary retains two mobile columns; tapping the nested note opens that card's own inspector. The draft backup and unchanged public page are confirmed by API readback; undo returns the prior layout.
- Evidence: `artifacts/template-layout-*.png`, `artifacts/iphone-layout-*.png` and [template-layout-verification.json](../artifacts/template-layout-verification.json).
- Full eight-template native device coverage and public anchor walkthroughs for multi-section layouts remain open; these checks do not replace the broader release audit.
