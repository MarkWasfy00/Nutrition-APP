# FUELX: athlete nutrition & training

Next.js 15 web app in Egyptian Arabic (RTL) and English. Athletes subscribe through **Paymob** and add an **InBody** scan, either a photo read by **Gemini Flash** or typed in by hand. The app then builds:

- a 4-week nutrition plan, with separate training-day and rest-day macros
- a training program based on the athlete's chosen split
- a daily tracker showing calories and macros left for the day
- weekly check-ins that adjust calories automatically

## Setup

### Everything in Docker

```bash
cp .env.example .env          # then fill in the values (DATABASE_URL is overridden inside compose)
docker compose up -d --build  # Postgres + migrations/seed + app on :3000 + daily cron jobs
```

### Local development

```bash
cp .env.example .env          # then fill in the values
docker compose up -d db       # Postgres only, on :5432 (or point DATABASE_URL at your own)
npm install
npx prisma migrate deploy
npm run db:seed               # exercise library + Egyptian food database
npm run dev
```

- **Without `GEMINI_API_KEY`:** photo reading is disabled (manual entry only). Meal plans then come from the built-in deterministic builder.
- **Without Paymob keys:** checkout is simulated. This works only when `NODE_ENV` is not `production`.

## Paymob configuration

1. Create an **online card integration**. Set its *Transaction processed callback* to `https://<your-domain>/api/paymob/webhook`. Also enable card tokenization (saved cards).
2. Create a **MOTO integration** for charging saved cards on renewal. Its ID goes in `PAYMOB_MOTO_INTEGRATION_ID`.
3. Copy your secret key, public key, HMAC secret and API key into `.env`.

Every webhook is HMAC-SHA512 verified, and applying a payment is idempotent (each transaction is applied once).

## Scheduled jobs (run daily)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/checkin-reminders
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/renew-subscriptions
```

On Vercel, add both routes to `vercel.json` crons. Otherwise use system cron.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm test` | Unit tests: macros, weekly adjustment, meal builder, training generator, progress, Paymob HMAC |
| `npm run i18n:check` | Ensures `messages/en.json` and `messages/ar-EG.json` have the same keys |
| `npm run db:seed` | Upserts exercises and foods |

## Where things live

- `src/lib/nutrition/`: calorie and macro math (`calc.ts`), weekly adjustment (`adjust.ts`), meal builder (`meals.ts`), daily remaining (`remaining.ts`, `daily.ts`)
- `src/lib/training/`: splits, program generator (4 weeks, week 4 deload), progress (Epley 1RM, PRs, double progression)
- `src/lib/ai/gemini.ts`: InBody extraction, meal weeks (foods restricted to the database; macros recomputed server-side), follow-up messages
- `src/lib/plan/`: plan creation and weekly check-in orchestration
- `src/lib/payments/paymob.ts` and `src/lib/subscription.ts`: payments and access
- `src/app/[locale]/`: pages (`(app)` requires login; `(app)/(paid)` also requires an active subscription)

The app gives general fitness guidance and is not medical advice. Users must be 18 or older.
