# Hacktoberfest issue drafts

Parsed by `scripts/hacktoberfest-setup.sh`. Skip the spare/skipped notes at the bottom.

---
TITLE: Add a mock mode so contributors can run the server without paid API keys
LABELS: help wanted,hacktoberfest,difficulty: medium
BODY:
Right now `POST /api/review` returns 503 when `ANTHROPIC_API_KEY` is missing (`server/index.js` ~L607), so nobody can run a roast locally without a Claude key.

Add `ROASTMYPR_MOCK=1`. When it's set, `generateRoastFromClaude()` (~L434) should return a fixture roast JSON from `server/fixtures/` instead of calling Anthropic. `/api/gifs` (~L722) should return 1–2 placeholder GIFs instead of returning `[]`.

Jev already skips when `TYPESAFE_API_KEY` is missing (`server/jev-gate.js` `validateReview`, L248), so leave that alone.

Log `Mock mode: ON` at startup next to the other ✓/✗ lines (~L838).

**Done when** `npm run dev` + the extension shows a roast with zero external keys.

---
TITLE: Make the extension's API URL configurable (and fix the stale README step)
LABELS: good first issue,hacktoberfest,difficulty: easy
BODY:
`background.js` L5 hardcodes `API_BASE_URL = 'https://roastmypr-production.up.railway.app'`, so local dev means editing source.

Read an optional `apiBaseUrl` from `chrome.storage.local` (production stays the default) and add a small **API URL (advanced)** field to `options.html` / `options.js`.

Also fix README "Local setup → step 2". It says `manifest.json` "already allows both localhost and the Railway host", but `host_permissions` no longer lists localhost.

Please **do NOT** add localhost to the shipped `manifest.json`. Use `manifest.dev.json` for unpacked local API work, and do not commit localhost hosts into the store package.

---
TITLE: Tests for roast JSON normalisation (Claude output → panel)
LABELS: good first issue,hacktoberfest,difficulty: medium
BODY:
`server/index.js` has pure helpers that shape Claude's roast JSON: `clampLevel` (~L428), `sanitizeGifQueries` (~L557), `normalizeRoast` (~L570), `ensureEnglishRoasts` (~L531) and `roastNeedsEnglishRetry` (~L551). None of them are tested.

Move them into `server/roast-utils.js` (no behaviour change), export them, and add `node --test` tests (Node ≥18, no new deps). Wire up `"test": "node --test"` in `server/package.json` if it is not already there.

Cover: missing `alternativeRoasts`, duplicate alts, roastLevel 0/9/"abc", banned GIF queries, non-coding GIF queries, and a Hinglish line falling back to English.

---
TITLE: Tests for the Jev gate scoring (the bit that keeps roasts on point)
LABELS: good first issue,hacktoberfest,difficulty: easy
BODY:
`server/jev-gate.js` decides pass / soft fail / hard fail in `evaluateAnswers()` (L143). It uses `CONFIDENCE_THRESHOLD = 0.80` and `HARD_FAIL_NOUL = 0.50` on the `HARD_CHECKS`, and `retryHint()` (L208) builds the "rewrite it" prompt.

Export both (leave `module.exports` as it is otherwise) and add `node --test` cases with fake Jev answers. No network and no key needed.

Cover:
- everything ≥0.80 → passed
- a hard check at 0.40 → `blockingFailed`
- 0.65 → uncertain, not blocking
- missing answer → error
- tone ≠ `funny_constructive` → fail
- `validateReview()` with no `TYPESAFE_API_KEY` → skipped (fail-open)

---
TITLE: New roast archetype (bring your best PR stereotype)
LABELS: good first issue,hacktoberfest,difficulty: easy
BODY:
Archetypes live in `ARCHETYPES` in `server/index.js` (~L353–376) and get injected into Claude's `SYSTEM_PROMPT`. Propose **ONE** new archetype that you can spot from the diff itself. For example "The Test-Free Zone" (only `src/` changed, nothing under `test/`) or "The Rename Ritual" (mostly file moves).

Add it to the list, and in the PR paste one real public PR diff it fits plus the roast you got.

Heads-up: Jev's `archetype_fits` check (`server/jev-gate.js` L66) scores the label against the real diff. Archetypes you can't see in the diff will flunk. Example: lockfile jokes, because lockfiles are filtered out in `content.js` `EXCLUDED_FILE_PATTERNS`.

---
TITLE: Archetype → GIF search map
LABELS: good first issue,hacktoberfest,difficulty: easy
BODY:
When Claude's GIF queries are weak, `groundedGifQueries()` (`server/index.js` ~L491) falls back to size-based queries only. Add an `ARCHETYPE_GIF_QUERIES` map (e.g. The 2AM Hotfix → `"programmer coffee night"`) and use it before the generic fallbacks in `sanitizeGifQueries()` (~L557).

Every query must still pass `looksLikeCodingGifQuery()` and the banned-word filter. Add a test that checks every archetype in `ARCHETYPES` has at least one valid query. That stops new archetypes from shipping without a GIF.

---
TITLE: content.css is dead weight — load it or delete it
LABELS: good first issue,hacktoberfest,difficulty: easy
BODY:
The drawer styles are inlined in `content.js` as `DRAWER_CSS` (L157). Nothing ever loads `content.css` (668 lines), but `manifest.json` still lists it under `web_accessible_resources` and README says it's "also inlined".

Pick one source of truth. Either inject `chrome.runtime.getURL('content.css')` into the shadow root and remove `DRAWER_CSS`, or delete `content.css` and its manifest/README/zip references.

Bonus: the root-level `icon16/48/128.png` duplicate `icons/`. The manifest only uses `icons/`. Check the dark theme still works (`resolveTheme()`, `content.js`).

---
TITLE: Firefox port (MV3)
LABELS: help wanted,hacktoberfest,difficulty: hard
BODY:
Firefox MV3 doesn't run `background.service_worker`. It needs `background.scripts` plus `browser_specific_settings.gecko.id`, so add a `manifest.firefox.json` (or a tiny build script) instead of changing the Chrome manifest.

Google login uses `chrome.identity.getRedirectURL()` / `launchWebAuthFlow` (`background.js` ~L367). The server only allows `*.chromiumapp.org` redirects (`server/auth.js` L22), so add the Firefox redirect host there.

**Done when:** load-temporary-add-on in Firefox, roast a PR, Insert works. Please include a short screen recording.
