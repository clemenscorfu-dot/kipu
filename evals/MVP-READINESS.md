# Kipu MVP Readiness Audit

## Definition of done
Kipu is private-beta ready when a user can capture something, Kipu preserves the original, enrichment is trustworthy or explicitly uncertain, and the memory can later be found or rediscovered without data loss or cross-user leakage.

## Release gates

### P0 — before private beta
- [ ] Capture survives AI/web/geocoding/image failures; original input is never lost.
- [ ] Text, voice, photo and link flows each have at least 5 real golden cases.
- [ ] Place resolution passes named POIs, ambiguous places and wrong-coordinate regressions.
- [ ] Duplicate detection distinguishes same entity from similar entity / another branch.
- [ ] Search retrieves known memories from vague natural-language recollections.
- [ ] Rediscover rotates and does not repeat the same memory inside the cooldown unless the pool is exhausted.
- [ ] Nearby map: pin focuses pin; locate focuses user; no document scroll; bottom card remains visible on Android/iOS.
- [ ] Auth/session persistence tested across reload and PWA reopen.
- [ ] RLS/user isolation verified with two separate test users for every user-owned table/API path.
- [ ] Delete idea works and removes/invalidates associated user-visible data.
- [ ] No secret/API key is exposed client-side.
- [ ] Production build and automated tests pass.
- [ ] Basic observability exists for capture/enrichment/search failures without storing unnecessary sensitive input.

### P1 — before public MVP
- [ ] Explicit sign-up/login/logout/account deletion flow.
- [ ] Minimal onboarding explains capture → Kipu understands → find later.
- [ ] Privacy policy, imprint/contact and clear AI/data-processing disclosure.
- [ ] Graceful offline/poor-network capture queue and retry state are user-visible.
- [ ] Accessibility pass: labels, focus, contrast, touch targets, keyboard where relevant.
- [ ] Performance budget on representative Android device; home usable quickly on 4G.
- [ ] Analytics for activation and core loop: first capture, successful enrichment, search, rediscover open, D1/D7 return.
- [ ] Beta feedback mechanism.

### P2 — after product signal
- Native stores, subscriptions, sharing/family, integrations, advanced agents, richer recommendation engine.

## Eval policy
1. `evals/golden-cases.json` is the source of truth for regressions.
2. Every production bug in the core loop gets a golden case before/with the fix.
3. P0 golden cases may never be deleted merely to make tests green.
4. Deterministic logic should be asserted automatically. AI/web-dependent cases are scored against explicit expectations and reviewed when uncertain.
5. Before a beta release: run unit tests, build, then a manual device matrix (Android Chrome/PWA + iPhone Safari/PWA).

## Initial scorecard
| Area | Status | Main risk |
|---|---|---|
| Capture | Yellow | failure-path/data-loss proof incomplete |
| Enrichment/entity resolution | Yellow | external/AI ambiguity; needs broader eval corpus |
| Places/maps | Yellow | recent regressions show device + geocoding edge cases |
| Duplicate detection | Yellow/Green | deterministic tests exist; broaden entity types |
| Search/retrieval | Yellow | needs measured fuzzy-recall cases |
| Rediscover | Yellow | rotation added; needs behavior verification |
| Auth/user isolation | Red | must be explicitly audited before external testers |
| Privacy/account lifecycle | Red | product flows/legal surface incomplete |
| Reliability/observability | Red/Yellow | needs release-level monitoring and failure tests |
| UI core | Yellow/Green | strong base; cross-device acceptance still required |

## Target metrics for private beta
- 100% original capture persistence in failure tests.
- ≥95% pass on P0 deterministic golden expectations.
- 0 critical wrong-entity/wrong-user incidents.
- Named-place coordinate error: ≤1 km for the golden POI set unless explicitly marked uncertain.
- Search: expected memory in top 3 for ≥90% of golden fuzzy queries.
- Rediscover: no repeat inside 72h while at least 3 eligible alternatives exist.

## Next corpus expansion
Grow from 15 to 40–50 cases: 10 places, 8 books/media/links, 6 products, 6 personal notes/intents, 5 duplicate traps, 5 fuzzy-search questions, plus photo/voice fixtures. Keep cases based on real Kipu failures and realistic user phrasing.
