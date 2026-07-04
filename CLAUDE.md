# nk-planner-v0 — Claude working guide

Independent MVP of Nuki's **Planner** module (planning + cost/sell-price formation for
personalization memorials). Built to validate cost-structure hypotheses with beta clients,
**separate** from the production `nk-admin-portal`.

## Stack
- **Next.js 14** (App Router) · **TypeScript strict** · **Tailwind + HeroUI** · Manrope + teal tokens
- **React Query** for server state · **Prisma** ORM · **Supabase** (Postgres + Auth, `@supabase/ssr`)
- UI copy in **Brazilian Portuguese (PT-BR)**

## Non-negotiable rules
- **No `any`. No `unknown` as a value annotation.** (`unknown` only where idiomatic — e.g. a
  `catch (e: unknown)`.) ESLint enforces `@typescript-eslint/no-explicit-any: error`.
- Match the **nk-admin-portal** look, structure and naming — it's the design/convention
  reference (see `docs/conventions.md`). It is a *reference*, never an import dependency.
- PT-BR for all user-facing copy. Currency `R$`, comma decimals, `DD/MM/AAAA` dates.
- Every domain row is **org-scoped** (`organizationId`) so beta orgs are isolated.

## Folder map
```
src/
  app/
    (planner)/            # authenticated shell (Sidebar + Header) + screen routes
    api/                  # Next.js route handlers (Phase 5)
    layout.tsx providers.tsx globals.css page.tsx
  components/ui/          # HeroUI-wrapped primitives
  components/layout/      # Sidebar, Header
  features/               # per-feature folders: components/ + hooks/ + types
  lib/
    api/                  # typed client fns (http.ts wrapper) used with React Query
    supabase/             # server.ts + client.ts
    hooks/                # reusable hooks
    prisma.ts utils.ts    # Prisma singleton, cn()
  shared/{types,constants,enum,utils}/
prisma/schema.prisma      # STUB until Phase 5
docs/                     # product context, screen map, conventions, decisions, plans
```

## Commands
- `npm run dev` — start dev server (http://localhost:3000, redirects to /dashboard)
- `npm run typecheck` — `tsc --noEmit` (must pass, strict)
- `npm run build` / `npm run lint`
- `npm run prisma:generate` — regenerate the typed client after schema changes

## Build phases (each starts only on the user's command — never chain them)
1. **Scaffold** (this repo) — done.
2. **Clean/extract** the prototype in `../Nuki-Planner-v1/` → `docs/prototype-inventory.md`.
3. **Refine flows** — iterative loop with the user → `docs/flows/<screen>.md`.
4. **Migration plan** (doc only) → `docs/migration-plan.md`.
5. **API + DB plan** (doc only) → `docs/api-plan.md`.

See `docs/decisions.md` for locked decisions and open questions.
