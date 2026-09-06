# Kipu Evals

## What this is
The golden corpus in `golden-cases.json` is the regression source of truth for the MVP core loop. `npm test` validates the corpus/contracts. `run-live.ts` exercises the real deployed/local capture pipeline and can also probe Rediscover.

## Safety
Live capture evals create temporary ideas and delete them after scoring. Use a dedicated eval/test account whenever possible. The runner refuses to write unless `KIPU_EVAL_ALLOW_WRITES=1` is set. Set `KIPU_EVAL_KEEP=1` only when you intentionally want to inspect generated test ideas.

## Required environment
- `KIPU_EVAL_BASE_URL` — e.g. `https://kipu-nine.vercel.app` or `http://localhost:3000`
- `KIPU_EVAL_ACCESS_TOKEN` — Supabase access token for the eval account
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `KIPU_EVAL_ALLOW_WRITES=1`

## Commands
```bash
npm test
npm run eval:live -- --id place-muttseehuette
npm run eval:place
npm run eval:p0
npm run eval:live -- --area memory
npm run eval:live -- --priority P0 --rediscover
```

A live run writes `evals/results/latest.json` and `evals/results/latest.md`. These files are ignored by git so a report reflects the environment in which it was actually run rather than becoming stale repository documentation.

## Case types
- `capture`: executable against `/api/ideas/capture`, then scored from the resulting Supabase idea after enrichment reaches `ready` or `failed`.
- `rediscover`: executable against `/api/rediscover`.
- `search`: defined golden behavior; next runner extension should seed a controlled fixture set and score `/api/search` top-k/grounding.
- `contract`: deterministic/unit behavior that should be backed by focused tests.
- `manual`: device/media behavior where a browser/PWA or fixture is required.

## Release rule
A real bug in capture → understand → find/rediscover should add or tighten a golden case before/with the fix. Do not weaken P0 expectations merely to raise the score.
