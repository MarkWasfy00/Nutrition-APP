# FUELX: nutrition and S&C for club athletes

Next.js 15 web app in Egyptian Arabic (RTL) and English, for **competitive athletes in clubs and teams** (not individual gym-goers).

- **Coaches** register their club team, pay through **Paymob per athlete seat**, and share an invite link. They set the season phase (off-season, general preparation, specific preparation, pre-competition, competition) plus practice and match days, add InBody scans for athletes, edit any athlete's S&C sessions (exercises, sets, reps, RPE, rest; optionally for the remaining weeks), confirm guardian consent for athletes aged 16–17, schedule dated sessions (whole team or one athlete) and record attendance, assign **biomotor field tests** (strength, power, speed, agility, endurance, flexibility) and record results with a printable squad report, and see every athlete's status, weight trend, attendance and check-ins.
- **Athletes** join through the invite link, pick their sport from a fixed list, and add an **InBody** scan (photo read by AI, or typed in). The app then builds:
  - a 4-week nutrition plan, with separate training-day and rest-day macros (practice, match and S&C days count as training days)
  - a sport-specific **strength & conditioning** program for the sport and season phase: no heavy leg or plyometric work in the 2 days before a match, and recovery only the day after
  - a daily tracker showing calories and macros left for the day
  - weekly check-ins that adjust calories automatically
  - a schedule of team sessions plus sessions they add themselves, with the attendance their coach recorded
  - the biomotor tests their coach assigned, where they enter their own scores, and a report with a 0–100 profile per ability (compared with the squad), change since the last test, and bests

Without Paymob, `npm run db:seed` (outside production) creates a demo club. Logins are listed at the top of `prisma/seed.ts`.

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

- **Local Qwen instead of Gemini:** install [Ollama](https://ollama.com), run `ollama pull qwen3-vl:8b-instruct`, then set `AI_ENABLED=true` and `AI_PROVIDER=ollama` in `.env`. Optional: `OLLAMA_URL` (default `http://localhost:11434`; use `http://host.docker.internal:11434` from Docker), `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`.
- **Without `GEMINI_API_KEY`** (and no local model): photo reading is disabled (manual entry only). Meal plans then come from the built-in deterministic builder.
- **Without Paymob keys:** checkout is simulated. This works only when `NODE_ENV` is not `production`.
- **Pricing:** `SUBSCRIPTION_PRICE_EGP` is the monthly price **per athlete seat** (default 499). Adding seats mid-period is charged pro rata for the days left. Lowering seats takes effect at the next renewal.

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
| `npm test` | Unit tests: macros, weekly adjustment, meal builder, S&C generator and match-day scheduling, progress, seat pricing, Paymob HMAC, biomotor scoring |
| `npm run i18n:check` | Ensures `messages/en.json` and `messages/ar-EG.json` have the same keys |
| `npm run db:seed` | Upserts exercises and foods (plus a demo club outside production) |

## Where things live

- `src/lib/sports.ts`: the fixed sports list and sport categories
- `src/lib/team.ts`, `src/lib/coach.ts`: invite codes, seat pricing, age/consent rules, athlete status for coaches
- `src/lib/nutrition/`: calorie and macro math (`calc.ts`), weekly adjustment (`adjust.ts`), meal builder (`meals.ts`), daily remaining (`remaining.ts`, `daily.ts`)
- `src/lib/training/`: S&C library (`library.ts`), session templates by sport and phase plus match-day scheduling (`sessions.ts`), program generator (`generate.ts`: 4 weeks, week 4 deload), progress (Epley 1RM, PRs, double progression)
- `src/lib/biomotor.ts`: biomotor test library (units, ranges, lower/higher is better), score parsing, change, squad percentiles and the ability profile
- `src/lib/ai/gemini.ts`: InBody extraction, meal weeks (foods restricted to the database; macros recomputed server-side), follow-up messages
- `src/lib/plan/`: plan creation, schedule rebuilds and weekly check-in orchestration
- `src/lib/payments/paymob.ts` and `src/lib/subscription.ts`: per-seat team payments and access
- `src/app/[locale]/`: pages. `(app)` requires login, `(app)/(paid)` is the athlete app (team subscription and consent required), `(app)/coach` is the coach area, and `join/[code]` is the public athlete invite page.

The app gives general fitness guidance and is not medical advice. Athletes must be 16 or older. Athletes under 18 need a coach to confirm guardian consent, never get more than a 10% deficit, and never have caffeine or mass gainers added to their plan.
