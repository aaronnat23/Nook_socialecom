# Physical iPhone smoke test

Tested the **native Expo app on the user's connected physical iPhone through iPhone Mirroring**. Android and simulator testing were not used for this walkthrough. This is manual smoke-test evidence, not a complete release acceptance or accessibility certification.

## Environment

- Expo Go SDK 57; project upgraded to Expo 57.0.30, React Native 0.86.3 and React 19.2.3 to match the installed phone client.
- Same Expo account signed in on the phone and local CLI; local sandbox buyer/seller account inside Lilac.
- Local PostgreSQL/FastAPI, web-hosted sample images and Metro over the Mac's Wi-Fi address.
- Fictional product/address data; all payments and refunds use the no-charge sandbox provider.

## Observed results

| Flow                             | Result                                                                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch and navigation            | Discover loads catalog/photos; exactly Discover, My Space and Settings remain available in the app and nested commerce/editor screens.                                  |
| Demo seller sign-in              | Native sign-in sheet authenticates and loads Studio Hening's owner space.                                                                                               |
| Text, typography, color          | Changed the hero headline, chose Arial, reduced heading size from 48 to 46 and selected background `#C7ADE5`. The corrected font and color visibly render on the phone. |
| Autosave and reopening           | “All changes saved” appears; leaving and reopening the editor retains changes. API readback confirms saved document values.                                             |
| Publish and buyer view           | Native publication succeeds; the buyer shop shows the new headline, font and lilac background from the published document.                                              |
| Reorder, undo, redo              | Moved product grid above hero through layer arrows; canvas order changes. Undo restores the hero, redo restores the grid, and undo returns the intended layout.         |
| Buyer preview                    | Preview removes editing outlines while retaining the app navigation.                                                                                                    |
| Version restore                  | Restored version 15 into the draft while publication 16 remained unchanged; API readback confirmed separation. Restored version 16 as the working draft afterward.      |
| Product editing                  | Renamed the lamp sample to Quiet corner table lamp, corrected its description and saved through the phone. Both variants, prices and stock remain intact.               |
| Collection ordering              | Reordered Everyday favorites to mug → lamp → vessel and saved. API readback confirms the stored order.                                                                  |
| Variant price and cart           | Selected the Soft lilac mug variant: RM73.00. Cart retains that variant and price.                                                                                      |
| Sandbox checkout                 | Entered a fictional address; quote showed RM73 + RM8 shipping = RM81. Order completed with sandbox/no-real-charge labeling.                                             |
| Sandbox refund                   | Refunded the order in the phone UI. State becomes refunded; API readback confirms RM81 and restoration of the variant stock to 6.                                       |
| Settings and session persistence | Enabled the demo order-updates preference, reloaded the app through Expo Go, and reopened Settings. Sign-in and the enabled preference persist.                         |

Readback details are in [physical-iphone-verification.json](../artifacts/physical-iphone-verification.json). Screenshots in `artifacts/physical-iphone-*.png` show the actual phone session. The floating blue gear belongs to Expo Go's development tools.

After browser regressions, restored the phone-tested design from immutable version 16 and published it as version 20. The final phone screenshot confirms the lilac storefront, Arial heading and minimal back chevron. The phone remains open on this public storefront.

## Issues fixed during the walkthrough

- SDK 54 could not run in the installed SDK 57 Expo Go. Upgraded compatible native dependencies and aligned transitive animation/worklet peers; Expo Doctor reports 21/21 checks passed and the package manager reports no peer issues.
- Native headings ignored a selected block font. Added shared heading-font resolution that respects block and responsive overrides; corrected native iOS font mappings, size and weight handling, and aligned web headings. Added a contract regression and browser font regression.
- Seller overview could retain an older publication after returning from the editor. It now reloads publication/catalog data on focus.
- iOS back buttons exposed the internal `(tabs)` route name. Back navigation now uses the minimal chevron.
- Switching inspector panels retained an unrelated panel's scroll offset. Each panel starts at its own top; content is retained during dismissal.
- A sample lamp photograph had a bowl title. Corrected the saved sample product and future seed title.

## Still required before a release

Native photo-library permission/upload/crop coverage, all eight themes on device, full native offline/conflict tests, add/duplicate/delete and long-press gesture coverage, VoiceOver/large-type/keyboard audit, multiple device sizes and signed staging builds remain open. Android QA is deferred by user request. Hosted Supabase/provider/deployment/operational gates remain in [PILOT_READINESS.md](PILOT_READINESS.md).
