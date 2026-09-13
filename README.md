# Naap

Timber-mill operations tool — intake, cut planning with predicted-vs-actual
recovery, stock, offcut bank, despatch, and reports. Built per
`docs/architecture.md` and `docs/ui-spec.md`.

## Stack

Next.js 15 (App Router, TypeScript) · PostgreSQL 16 + Drizzle ORM · Tailwind ·
next-intl (hi/mr/gu/en) · IndexedDB offline outbox.

## Getting started

```bash
cp .env.example .env.local   # set DATABASE_URL, SESSION_SECRET
pnpm install
pnpm db:generate              # generate SQL migration from lib/db/schema.ts
pnpm db:migrate                # apply migrations
pnpm db:seed                   # one mill, two demo users, masters
pnpm dev
```

Demo login (seeded): phone `9000000001` (owner) or `9000000002` (manager),
PIN `1234`.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm test` — Vitest unit tests (`lib/volume.ts`, `lib/predict.ts` are the
  non-negotiable ones — see architecture §12)
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:studio`
