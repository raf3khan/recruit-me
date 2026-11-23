# Recruit Me

An application assistant for GCC job seekers, starting with fresh graduates. The candidate pastes their CV and a job posting; the app prepares an English resume and cover letter tailored to that job, using only facts from the candidate's own CV. Nothing is sent anywhere: the candidate reviews, edits and downloads. The interface is Arabic, right-to-left, in Saudi dialect.

The app is **وظيفة (Wadhifa)**: Arabic by default (RTL, at `/ar`) with an English version (LTR, at `/en`). It covers:

- phone sign-in with a one-time code, then onboarding (form of address أنتَ/أنتِ, CV, check, job preferences)
- an assistant home, a jobs list, and per-job review: tailored resume, editable cover letter, then send (job site, email on Plus, or Word files). Every send is the candidate's tap.
- applications with status and a 5-day follow-up reminder, profile editing, plans with a free limit of 5 packs a month (enforced on the server, Riyadh month), and account settings with data export and delete (PDPL)

The job feed, scheduled preparation, payments and outreach come later.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for real tailoring
npm run dev                  # http://localhost:3000
```

Without an API key the app runs in **demo mode** with a mock model. Without `DATABASE_URL` it uses an embedded Postgres in `.data/pglite`, and sign-in codes are shown on the page and printed to the server log. In development there are buttons to load a sample CV and sample jobs, and to switch plans. None of these work in production, which needs `DATABASE_URL`, an SMS provider and (later) payments.

Database migrations live in `drizzle/` and run when the app opens the database. After changing `src/lib/db/schema.ts`, run `npm run db:generate`.

```bash
npm test          # unit tests (no network)
npm run typecheck
npm run lint
npm run build
```

## How tailoring works

```
CV text ──extract_profile──▶ CandidateProfile (English, ids per item)
                                   │
Job posting ──analyze_job──▶ JobAnalysis (must-haves, keywords)
                                   │
                    tailor_resume ─┴─▶ TailoredResume (picks ids, rewrites bullets)
                                   │
               write_cover_letter ─┴─▶ CoverLetter
                                   │
              assembleResume + checks (deterministic) ──▶ ApplicationPack ──▶ Word / text
```

The model can only **choose, order and reword**. It refers to profile items by id; names, institutions, titles and dates are copied from the profile when the resume is assembled. Then deterministic guards run (`src/lib/tailoring/assemble.ts`):

- items with unknown ids are dropped
- every degree is kept, even if the model left it out
- skills not found anywhere in the profile are dropped
- a bullet that contains a number not present in that same profile item is dropped
- numbers in the summary or cover letter that are not in the profile are flagged

Every intervention is shown to the candidate as a warning.

## Layout

| Path | What |
|---|---|
| `src/lib/llm/` | Provider layer. `LlmProvider` interface, Claude (`anthropic.ts`), mock, and `getProvider()` |
| `src/lib/tailoring/schemas.ts` | Zod schemas, used both for validation and as structured-output formats |
| `src/lib/tailoring/prompts.ts` | Prompts for each step |
| `src/lib/tailoring/pipeline.ts` | The steps and `buildApplicationPack()` |
| `src/lib/tailoring/assemble.ts` | Fact guards and the final resume document |
| `src/lib/render/docx.ts` | ATS-friendly Word export and plain text |
| `src/lib/db/` | Drizzle schema and connection (Postgres, or PGlite in dev and tests) |
| `src/lib/auth/` | Phone numbers, one-time codes, sessions, SMS sender |
| `src/lib/app/service.ts` | Everything the app does with data, always scoped to one user |
| `src/lib/i18n.ts` | `t(en, ar, arFeminine)` and Arabic plurals |
| `src/app/[lang]/` | Pages, and `actions.ts` with every server action |
| `src/app/api/` | Word downloads and the data export |
| `src/proxy.ts` | Sends `/` to `/ar` or `/en` |

## Stack and why

- **Next.js + TypeScript, one app.** UI and API in one codebase and one deploy, which suits a solo founder. Strong RTL and Arabic font support.
- **Claude behind a provider interface.** Every call is "prompt in, schema-validated object out", so adding a Saudi-hosted model (for example ALLaM on a KSA cloud region) means writing one class and one `case` in `getProvider()`. Claude calls use structured outputs, plus server-side refusal fallbacks on models that support them.
- **Model per tier.** Free users get Claude Haiku 5.5 (well under one US cent per resume and cover letter); paid users get Claude Sonnet 5.5. The tier is decided on the server (`src/lib/tier.ts`), never by the browser. Plus users get the paid model.
- **Zod** for one set of schemas shared by the API, the model and the UI.
- **docx** to generate Word files: recruiters and portals in the GCC expect .docx, and it keeps text ATS-readable.
- **Vitest** for fast tests with no network.
- **Postgres with Drizzle.** Plain SQL migrations, typed queries. PGlite runs the same Postgres in-process for development and tests, so there is nothing to install. Every user's rows are deleted with the account.

## Not in this step

The job feed, the overnight queue, real SMS and payments, PDF/Word CV upload (paste text for now), the chat with the assistant, email outreach, and Arabic-language documents.

## Billing (Paddle)

Paddle is the merchant of record: it sells Plus to the user and charges and pays GCC VAT. The code talks to a
`BillingProvider` interface (`src/lib/billing`), so Tap can be added later for mada, STC Pay, KNET and Benefit.

- Plans page: "Subscribe" runs `checkoutAction`, which creates a Paddle transaction tagged with the user id and
  sends them to `/ar/pay?_ptxn=...`, where Paddle.js opens the overlay checkout (full screen on phones, Apple Pay in Safari).
- `POST /api/billing/webhook` verifies `Paddle-Signature`, stores the subscription (`subscriptions` table) and sets
  `users.plan` to `plus` (active, trialing, past_due) or `free`. Late or repeated events are skipped.
- "Manage subscription" opens Paddle's customer portal. Deleting an account cancels the subscription first.
- Without `PADDLE_API_KEY`, development uses mock billing: checkout switches you to Plus at once.

Paddle dashboard: create the product and prices, an API key and a client-side token; set the default payment link to
`https://<domain>/ar/pay`; add a webhook to `https://<domain>/api/billing/webhook` for `subscription.*` events. Copy
everything into the variables in `.env.example`.

## Legal pages

`/ar|en/terms`, `/privacy` and `/refunds` are public and linked from sign-up. The text is a draft in
`src/lib/legal/content.ts`; set the `LEGAL_*` variables and have a lawyer review it before launch.
