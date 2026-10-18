# Coding Agent Implementation Prompt

Build the **seller-first social commerce platform** specified in `SOCIAL_COMMERCE_APP_TECHNICAL_SPEC.md`. Read the entire specification before writing code. The storefront customization editor is the differentiator and must be implemented with the same care as payments or auth.

## Rules

1. Use a pnpm/Turborepo monorepo with Next.js (responsive web), Expo React Native (iOS/Android), FastAPI (backend), PostgreSQL + SQLAlchemy/Alembic, Supabase Auth/Storage, and a shared versioned JSON Schema for storefront pages. Implement platform-specific editing controls when necessary while sharing renderer semantics and theme tokens.
2. Bottom navigation must always contain exactly **Discover, My Space, Settings**. Put all other flows inside nested screens, not additional bottom tabs.
3. Every user has a profile that can be customized and can optionally become a shop.
4. The editor must support prebuilt templates, add/remove/duplicate/reorder blocks, drag/drop on web, mobile long-press reorder plus accessibility buttons, comprehensive font/colors/background/images/spacing/layout controls, responsive breakpoints, undo/redo, autosave, draft/published versions, preview, and restore.
5. No unsafe custom HTML/JS/CSS. Validate schema on server and clients. Use `If-Match` revisions to avoid clobbering changes.
6. Commerce must use authoritative server pricing, transactional inventory reservation, and idempotent order/webhook processing. Use **sandbox-only** payments until marketplace legal/provider approval.
7. Build milestone-by-milestone (M0–M6), with a working UI→API→DB→test slice at each stage. Do not stop at mockups or placeholder screens.
8. Maintain TypeScript/Python strict typing, automated tests, migrations, sample data, security rules, env examples, and onboarding docs.
9. At each milestone report exactly what works, test output, known problems and any deviations from the specification. Only claim features complete when verified.

## Start now

First inspect the repository and report a brief implementation plan, then implement **M0** and **M1**. Continue through the milestones with real working implementations, prioritizing **M2 and M3 (the cross-platform storefront renderer and highly customizable editor)** before broad marketplace features. Do not block on branding choices: use a temporary name and eight seed shop themes. Follow the full acceptance checklist in Section 14 of the spec.
