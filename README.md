# Recruit Me

An application assistant for GCC job seekers, starting with fresh graduates. The candidate pastes their CV and a job posting; the app prepares an English resume and cover letter tailored to that job, using only facts from the candidate's own CV. Nothing is sent anywhere: the candidate reviews, edits and downloads. The interface is Arabic, right-to-left, in Saudi dialect.

This repo currently covers **step 2 of the plan: resume and cover letter tailoring**. The job feed, scheduled preparation and outreach come later.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for real tailoring
npm run dev                  # http://localhost:3000
```

Without an API key the app runs in **demo mode** with a mock model, so the whole flow (sample CV, sample job, Word downloads) works offline.

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
| `src/app/api/*` | `profile` (CV → profile), `tailor` (profile + job → pack), `export` (→ .docx) |
| `src/app/tailor-flow.tsx` | The RTL candidate screen |

## Stack and why

- **Next.js + TypeScript, one app.** UI and API in one codebase and one deploy, which suits a solo founder. Strong RTL and Arabic font support.
- **Claude behind a provider interface.** Every call is "prompt in, schema-validated object out", so adding a Saudi-hosted model (for example ALLaM on a KSA cloud region) means writing one class and one `case` in `getProvider()`. Claude calls use structured outputs, plus server-side refusal fallbacks on models that support them.
- **Model per tier.** Free users get Claude Haiku 5.5 (well under one US cent per resume and cover letter); paid users get Claude Sonnet 5.5. The tier is decided on the server (`src/lib/tier.ts`), never by the browser. Until accounts exist everyone is on the free tier; plans and usage limits arrive with accounts.
- **Zod** for one set of schemas shared by the API, the model and the UI.
- **docx** to generate Word files: recruiters and portals in the GCC expect .docx, and it keeps text ATS-readable.
- **Vitest** for fast tests with no network.
- **No database yet.** The flow is stateless; storage (likely Postgres) arrives with accounts and the job queue.

## Not in this step

Accounts and saved profiles, the job feed, the overnight queue, any sending (every send will need the candidate's tap), email outreach, and Arabic-language documents.
