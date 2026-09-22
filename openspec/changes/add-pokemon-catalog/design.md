# Design

## Context

See proposal.md — Why. This is the foundation slice: the repository currently holds only a Vite + Vue 3 shell (`src/main.ts` mounts `App.vue`, which renders a single heading; `src/components/` is empty). Pinia, vue-router, and Tailwind v4 are installed but unused; Vitest runs with `jsdom` and `passWithNoTests`.

Constraints that shape the approach:

- **PokéAPI v2 is a shared public API.** It rate-limits, it has no partial-name search endpoint, and the only cheap whole-catalog view is `GET /pokemon?limit=N`, which returns `{ name, url }` pairs and nothing else.
- **Project conventions** (CLAUDE.md): Vue 3 `<script setup>` with strict TypeScript (no `any`, no `as unknown as T`), Pinia native only — TanStack Query and Pinia Colada are forbidden — Tailwind, Vitest + `@vue/test-utils`, multi-word PascalCase component names with a `Base` prefix for UI-agnostic components, TDD, commits under 400 lines, and API infrastructure isolated from domain models by mappers.
- **`openspec/initial-specs.md` is the source of truth** and already fixes the directory layout, the store shape, the sprite-derivation trick, and the resilience contract. This design explains *why* those choices hold and how they are staged so changes #2–#4 layer on without restructuring.

## Goals / Non-Goals

**Goals:**

- A layered boundary where PokéAPI response shapes never reach a component.
- A single network call for the whole catalog view, with zero per-card requests.
- A resilience contract (timeout, bounded retry, typed errors) that every later PokéAPI caller reuses unchanged.
- Store shape that accepts search and type filtering later as an insertion, not a rewrite.
- A small, high-value test set concentrated where bugs actually live.

**Non-Goals:**

- Text search, type filter, `availableTypes`, and `typeIndex` (change #2).
- Detail view, accessible modal, and `pokemonDetail.store.ts` (change #3).
- Routing and deep linking — `vue-router` stays installed and unregistered (change #4).
- Any caching layer beyond the in-session catalog index: no `localStorage`, no service worker, no HTTP cache tuning. The index is re-fetched on reload, and that is acceptable for a single cheap call.
- No SSR, no prerendering. The app is a client-only SPA.
- No virtualized list: a 20-item page does not need one.

## Decisions

### 1. Four-layer separation with a mandatory DTO → domain mapper boundary

`src/api/` owns transport and raw PokéAPI contracts (`*DTO` suffix). `src/domain/` owns UI-facing types and error classes and depends on nothing. `src/services/` holds pure mapper functions — the only place a DTO is allowed to turn into a domain model. `src/stores/` orchestrates. `src/components/` consumes domain models exclusively. Dependencies point inward: components → stores → services → api, and everything may read `domain`.

*Alternative considered:* let components read `NamedAPIResourceDTO` directly and derive the sprite URL in the template. Rejected because the DTO is a foreign contract we do not own. A PokéAPI field rename would then ripple into every `.vue` file, sprite derivation logic would be duplicated per component and untestable without mounting, and the `PokemonCardItem` shape that changes #2 and #3 both consume would never exist as a single named thing. One pure function file is far cheaper to test and to change than the alternative.

### 2. Load the full catalog index once (`GET /pokemon?limit=100000`) instead of server-side offset pagination

`initCatalog()` issues exactly one request for the complete `{ name, url }` index and keeps it in memory for the session. Pagination is a client-side slice over it.

*Alternative considered:* `GET /pokemon?limit=20&offset=N` per page. It is the obvious REST-shaped choice and it keeps memory near zero. It loses for a decisive reason: **PokéAPI has no partial-name search endpoint**, so change #2's instant search must hold the whole index in memory regardless. Offset pagination would mean building server pagination now, then tearing it out one change later — and in the meantime it charges one request per page click against a rate-limited shared API, on top of an index load that becomes mandatory anyway.

*Honest cost:* the response is roughly 1–1.5 MB of JSON for ~1300 entries and parses into a few MB of JS heap. That is a real, one-time cost paid at cold start, on a modern browser with tens or hundreds of MB of headroom. We accept it in exchange for instant pagination, instant future search, and one request instead of one-per-interaction. We keep `rawCatalogIndex` as the raw `{ name, url }` pairs and map to `PokemonCardItem` only inside the page slice, so the retained shape stays minimal and mapping cost is bounded by `pageSize`.

### 3. Derive the sprite URL from the resource URL — never fetch `/pokemon/{id}` per card

Each index entry carries `url: ".../pokemon/25/"`. The mapper parses the trailing numeric segment and composes `${SPRITE_BASE_URL}/${id}.png` against the official-artwork CDN path fixed in `initial-specs.md`. Rendering a page costs **zero** additional API requests; the browser fetches images directly from the CDN, in parallel, outside our rate-limit budget.

*Alternative considered:* fetch `/pokemon/{name}` for each visible card to read `sprites.other['official-artwork'].front_default`. Rejected — this is the single most consequential performance decision in the slice. It is a textbook N+1 waterfall: 20 requests per page view against a rate-limited public API, so a user clicking through ten pages fires 200 requests and will plausibly be throttled into the retry path, turning a browse into a stall. It also makes every page render depend on 20 independent failure modes instead of one. The trade is that we synthesize a URL the API did not hand us; risk 2 below covers the case where that URL 404s.

ID extraction is total, not partial: the mapper returns a `number | null` (or equivalent) from a URL parse rather than trusting `Number(...)` to produce something usable, so a malformed or trailing-slash-free URL can never yield `NaN` in a template or an `/NaN.png` request.

### 4. Retry policy: 2 retries, exponential backoff with jitter, and a hard no-retry rule for 404

The client wraps `fetch` with an `AbortController` timeout of 8s per attempt. Classification:

- **404** → `NotFoundError` immediately, **never retried**. A 404 is a definitive statement about the resource, not a transient condition; retrying it cannot change the answer, wastes the user's time by exactly the backoff budget, and spends rate-limit headroom we need for requests that can succeed.
- **429 / 5xx / connection drop** → retry, up to 2 times, waiting ~1s then ~2s plus jitter. After the budget is exhausted, the *last* failure decides the thrown class: 429 → `RateLimitError`, 5xx or a dropped connection → `NetworkError`. Classifying on the last failure (not the first) keeps the message truthful about the condition actually still blocking the user.

*Why jitter matters specifically here:* the rate limit is shared and global, so throttling tends to hit many clients — and many in-flight requests within one client — at the same instant. Deterministic backoff makes every one of them retry in the same 1s and 2s slots, reproducing the thundering herd that caused the 429 and guaranteeing the retry also fails. Randomizing the delay spreads the retries across the window and is what makes the retry budget worth having at all.

*Why the budget is capped at 2:* the cap exists to bound worst-case latency, not to be generous. Worst case for a single request is 3 attempts × 8s timeout + ~1s + ~2s backoff ≈ **27 seconds** before the UI shows a typed error. That is already long; a third retry would push it past 35s with backoff growing geometrically, which reads to a user as a hung app. Two retries covers the realistic transient blip while keeping the ceiling explainable. The store surfaces `status: 'loading'` throughout, so the worst case is a slow, honest load — never an indefinite one.

*Alternative considered:* an unbounded retry-until-success loop with a circuit breaker. Rejected as disproportionate for a catalog fetch with a visible "retry" affordance — the user is a better circuit breaker than a state machine we would have to build and test.

### 5. Error taxonomy: named classes extending `Error` in `src/domain/errors.ts`

`NotFoundError`, `RateLimitError`, and `NetworkError` are classes extending a shared base (`AppError`), each carrying a literal discriminant field so narrowing works both by `instanceof` and by a `switch` on that field. The UI maps each to a distinct message and affordance: `NotFoundError` → "we couldn't find that" with no retry button; `RateLimitError` → "PokéAPI is busy right now, try again in a moment" with retry; `NetworkError` → "connection problem" with retry.

*Alternative considered:* a plain discriminated union of object literals (`{ kind: 'rate_limit', ... }`), which is lighter and structurally cleaner. Classes win because the resilience layer `throw`s, and thrown values in TypeScript are typed `unknown` — an `instanceof` check narrows a class safely and with zero assertions, whereas narrowing a thrown object literal invites exactly the `as unknown as T` that CLAUDE.md forbids. A `catch (e: unknown)` followed by `instanceof` chains keeps the whole error path free of `any` and of assertions. The literal discriminant field is kept anyway so the store can persist and the UI can `switch` on a serializable tag without re-throwing.

### 6. Pinia setup store, with pagination as a computed slice rather than fetched state

`defineStore('pokemonList', () => { ... })` returning refs, computeds, and actions — the setup style `initial-specs.md` mandates, and the one that reads like the `<script setup>` components around it and gives the best inference under strict TS without extra type parameters.

State: `rawCatalogIndex`, `currentPage` (1-indexed), `pageSize` (20), `status`, `error`. Computed: `paginatedItems`, `totalPages`, `hasNextPage`, `hasPrevPage`. Actions: `initCatalog()` (cold-load guard: no-op if the index is already present), `goToPage()`.

Pagination is *derived*, not fetched. `paginatedItems` is a computed slice over the index, mapped to `PokemonCardItem[]` at the slice boundary. Page navigation therefore touches no network, cannot fail, and needs no loading state of its own — `status` describes the index load only.

*How this anticipates change #2:* the pipeline is deliberately `rawCatalogIndex → (source) → paginatedItems`. Change #2 inserts `filteredList` as that source — a computed crossing `searchQuery` and `selectedType` over the index — and repoints `paginatedItems` and `totalPages` at it. Nothing else moves: the components, the page-slice logic, the actions, and the network layer are untouched. Had pagination been fetched state, adding search would have meant re-deriving server offsets from a client-side filter, which does not compose at all.

*Alternative considered:* Pinia options stores. Rejected for consistency with `<script setup>` and because computed chaining is more direct in the setup form.

### 7. Testing: three focused suites, fake timers for the retry path

Tested, because these are where bugs hide and where a wrong answer breaks the feature silently:

- **`pokemonMapper`** — ID extraction from resource URLs (trailing slash, no trailing slash, unexpected shape), null/`NaN` safety, and the composed sprite URL for known IDs (1, 25). Pure functions, so these are near-free and catch the `/NaN.png` class of bug.
- **`httpClient`** — the behavioral contract, not the implementation: 404 throws `NotFoundError` after exactly **one** `fetch` call (asserting the call count is the actual test — it is what proves the no-retry rule); 429 and 500 retry to the cap and then throw `RateLimitError` / `NetworkError` respectively; a success on retry #1 resolves normally.
- **`pokemonList.store`** — pagination boundaries: first page, last page with a partial final slice, `totalPages` for an exact multiple and for a remainder, `hasNextPage` / `hasPrevPage` at both ends, an empty index, and `goToPage()` clamping out-of-range input. Each test uses a fresh `createPinia()` so state cannot leak between cases.

Deliberately **not** tested: Tailwind classes and visual styling, Pinia/Vite/router wiring, trivial getters, and snapshot tests of component markup — they break on cosmetic edits and assert nothing about behavior.

*Retries without real waiting:* the retry suite uses Vitest fake timers (`vi.useFakeTimers()`) and advances them explicitly, with `fetch` stubbed via `vi.fn()`. Otherwise these tests would sit through the real 1s + 2s backoff — three seconds per case, on every run, forever — and the 8s timeout path would be untestable in practice. Fake timers also let us assert the timeout branch deterministically by advancing past 8s rather than racing a real clock. Following TDD, each suite is written red before the implementation that greens it.

## Risks / Trade-offs

- **[The initial index load is a single point of failure: if PokéAPI is slow or rate-limiting at cold start, the user sees nothing at all]** → The 8s-per-attempt timeout plus 2 jittered retries covers transient blips; `status`/`error` drive an explicit error state with a retry action rather than an indefinite spinner, and the typed error produces a message that tells the user *which* problem occurred. Worst case is a bounded ~27s, never a hang. The index loads once per session, so the exposure window is a single request at startup rather than a recurring one.
- **[The derived CDN sprite URL 404s for entries with no official artwork — forms, regional variants, and high-ID entries]** → `PokemonCard.vue` handles the image `error` event and swaps in a local placeholder, with `alt` text carrying the Pokémon name so the card stays meaningful and accessible without the image. Images are loaded lazily (`loading="lazy"`) so off-screen misses cost nothing. This is the accepted price of decision 3: a handful of missing thumbnails instead of 20 API requests per page.
- **[~1–1.5 MB of index JSON is slow on a poor connection and holds a few MB of heap]** → We fetch the lightweight index endpoint, which returns only names and URLs — the cheapest full view the API offers — and pay it exactly once per session rather than per page. `rawCatalogIndex` stores the raw pairs and mapping to domain objects happens only for the 20 visible items, so retained memory stays close to the payload itself. A skeleton/loading state keeps the shell responsive while it streams in. If telemetry ever shows this is a real problem, the mitigation is a persisted cache of the index — deliberately deferred, since it is additive and changes no interface here.
- **[Client-side pagination means `totalPages` reflects the index, so any future filter must recompute it consistently]** → `totalPages` is already derived from whatever the current source computed is, not from a stored count, so change #2 repointing the source keeps it correct by construction.
- **[Deriving IDs by parsing URLs couples us to PokéAPI's URL format]** → The parse lives in exactly one pure, tested function; if the format changes, one function changes. The alternative coupling — to the response body shape — would be spread across every card.
