# Deploy notes

Naap is one Next.js app plus one Postgres 16 database. This is the checklist
for taking it from this dev environment to a pilot mill, per architecture
§4 ("Single container, Indian region — data residency is a sales point")
and §14's Day 14 scope.

## 1. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:pass@host:5432/naap`. Use `sslmode=require` once the DB is not co-located with the app. |
| `SESSION_SECRET` | yes | 32+ random bytes (`openssl rand -base64 32`). Rotating it invalidates every session — do it out of business hours. |
| `SMS_API_KEY` | production only | Unset in dev on purpose — OTPs log to the server console instead (`lib/auth/otp.ts`). Set this before the pilot goes live, and wire a real provider into `sendOtpSms()` (currently a stub that still logs even when the key is set — see the `console.warn` in that function). |

No other secrets exist server-side: the owner's rate-lock passphrase never
reaches the server (architecture §8), so there's nothing to rotate there.

## 2. Region and hosting

- **Region:** an Indian region (AWS ap-south-1 / Mumbai, or equivalent) for
  both the app container and the Postgres instance. Keep them in the same
  region to avoid cross-region latency on every request.
- **App:** a single container running `pnpm build && pnpm start`. No
  background workers or queues exist yet — everything is request/response
  or a Postgres transaction.
- **Database:** managed Postgres 16 (RDS, Cloud SQL, or a self-hosted
  instance) with automated backups turned on at the provider level as a
  baseline, on top of the explicit backup job below.

## 3. First deploy

```bash
pnpm install
DATABASE_URL=... pnpm db:migrate   # applies drizzle/*.sql in order
DATABASE_URL=... pnpm db:seed      # ONLY for a fresh demo mill — see §5 for a real pilot mill
pnpm build
DATABASE_URL=... SESSION_SECRET=... SMS_API_KEY=... pnpm start
```

`pnpm db:migrate` is additive and safe to re-run — it tracks applied
migrations in a separate `drizzle` schema. Never run it against a database
you haven't backed up first.

## 4. Backup job

Architecture §11: "untested backups are not backups." Minimum viable job:

```bash
# nightly, e.g. via cron or the hosting provider's scheduled task runner
pg_dump "$DATABASE_URL" --format=custom --file="naap-$(date +%F).dump"
# ship naap-*.dump to off-region object storage (S3/GCS), retain 30 days
```

Test the restore path before the pilot starts, not after the first
incident:

```bash
createdb naap_restore_test
pg_restore --dbname=naap_restore_test naap-<date>.dump
psql naap_restore_test -c "select count(*) from intake;"   # sanity check
dropdb naap_restore_test
```

Put this restore drill on a recurring calendar reminder (monthly is
reasonable) — an untested backup job silently rotting is worse than no job,
because it creates false confidence.

## 5. Seeding a real pilot mill

`pnpm db:seed` (`lib/db/seed.ts`) creates a demo org/mill/users/species —
useful for a sales demo, wrong for a real pilot. Before onboarding the
actual mill:

1. Create the org + mill rows by hand (or a one-off script modeled on
   `seed.ts`) with the mill's real name and the owner's real phone number.
2. Populate Masters > Species with the mill's actual species, trade codes,
   recovery bands and byproduct % — these came from the pilot mill's own
   historical registers, not the seed's placeholder values, and drive every
   prediction the tool makes (architecture §5). Getting this wrong at
   onboarding means every prediction is wrong until corrected.
3. Populate Bays, Size presets, and Parties (suppliers/customers) from the
   mill's existing paper records.
4. Skip data export until there's real data to export — Masters > Data
   export (`/api/masters/export`) is there for when the mill wants a copy,
   not needed before go-live.

## 6. Known gaps before a second mill (architecture §11)

These are accepted for a single pilot mill and must be revisited before
onboarding a second one — don't let "it worked for the pilot" become "it's
fine everywhere":

1. **Real offline sync.** The outbox (`lib/offline/outbox.ts`) survives a
   dropped connection, not days offline.
2. **Multi-tenancy hardening.** Every query filters by `mill_id` in
   application code; there is no Postgres row-level security backstop yet.
3. **Clock drift.** `occurred_at` timestamps trust the client's clock on
   offline-queued writes. Cheap Android devices drift.
4. **Concurrent edits.** Two managers confirming the same conversion is not
   guarded against beyond the transaction's own atomicity.
5. **Translation review.** The Hindi/Marathi/Gujarati strings in this build
   have not been reviewed by a trade-fluent speaker of each language — do
   that before a second mill in a different state.

## 7. End-to-end walkthrough (do this before go-live)

Run the whole loop once, start to finish, as the pilot mill would use it —
this is the manual QA pass that Playwright's per-feature verification
doesn't replace:

1. Sign in as the owner (OTP), set the language to the mill's preferred
   locale, set up rate lock, add the mill's real species and bays.
2. Sign in as the munshi (PIN fast-path after the first OTP), log an intake
   with a mixed piece/bulk tally, close it, confirm the lot code looks
   right.
3. Build a cut plan against that lot, check the offcut matcher and the
   prediction why-panel both make sense for a real species, save and print
   the cut sheet.
4. Confirm the cut with a deliberate variance (so the variance-reason path
   is exercised), check the dashboard's prediction-accuracy tile picks it
   up.
5. Despatch some of the resulting stock, print the challan.
6. As the owner: check the dashboard tiles match what was just entered,
   check the reconciliation report's unexplained-CFT number is either zero
   or explained, export everything to Excel and confirm every sheet has the
   rows just created.
