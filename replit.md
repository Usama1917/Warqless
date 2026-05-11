# Warqless

A digital platform for educational books — replacing traditional printed books with a smarter, protected, and interactive digital experience for students in Egypt and the Arab world.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router file-based routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo React Native app (student-facing)
- `artifacts/api-server/` — Express API server
- `artifacts/mobile/app/(tabs)/` — Main 5-tab navigation (Home, Browse, Library, Borrowed, Account)
- `artifacts/mobile/app/book/[id].tsx` — Book detail & purchase screen
- `artifacts/mobile/app/reader/[id].tsx` — Secure in-app book reader
- `artifacts/mobile/app/auth/index.tsx` — Login / Register screen
- `artifacts/mobile/context/AppContext.tsx` — Auth + library state management
- `artifacts/mobile/data/mockData.ts` — Book catalog, mock data
- `artifacts/mobile/constants/colors.ts` — Design tokens (deep navy + gold palette)

## Architecture decisions

- Frontend-only for MVP: All data persisted in AsyncStorage via context; no database needed for first build
- Deep navy (#1A4A7C) primary + gold (#E8A22C) accent palette — premium educational feel
- Protected reader UI: watermarking, reading mode (light/sepia/dark), page navigation, annotations, bookmarks, notes
- Book lending system: owner loses access while borrower holds the license
- Device restriction model: licenses tied to account + device (simulated)

## Product

- **Home**: Welcome, continue reading, featured books, offers, browse by grade/subject
- **Browse**: Search + multi-filter (grade, subject, type) book catalog
- **Library**: Purchased books with reading progress bars and quick-open
- **Borrowed**: Books borrowed from others + books lent out tracking
- **Account**: Profile, stats, purchase history, devices, security, support
- **Book Detail**: Full info, pricing, features, purchase flow, related books
- **Reader**: Page reader with light/sepia/dark modes, bookmarks, highlights, text notes, TOC, font size control, watermarking

## User preferences

- Target market: Egyptian & Arab world students and educational publishers
- Brand: "Warqless = books without paper" — "Your books. No paper."
- Premium, modern mobile UI with deep navy + gold color scheme
- No emojis in the UI

## Gotchas

- Reader uses simulated page content (4 sample pages cycling) — real PDF rendering requires native modules not available in Expo Go
- All data is mock/AsyncStorage-based for now — wire to API server when backend is built
- expo-linear-gradient is pre-installed in the mobile package

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
