# nk-planner-v0

Independent MVP of Nuki's **Planner** module (Next.js 14 + HeroUI + Tailwind + React Query +
Prisma + Supabase). See [`CLAUDE.md`](./CLAUDE.md) for the working guide and [`docs/`](./docs)
for product context, the screen map, conventions, and the phased build plan.

## Quick start
```bash
cp .env.example .env        # fill in Supabase + database credentials
npm install
npm run prisma:generate
npm run dev                 # http://localhost:3000 → /dashboard
```

Status: **Phase 1 — scaffold.** Screens are migrated from the prototype in later phases.
