# Design

## Context

See proposal.md — Why. This change builds on `add-pokemon-catalog`, which already ships the pieces this slice reuses unchanged: `httpClient.ts` (8s abort timeout, bounded retry with backoff, failures classified into `NotFoundError` / `RateLimitError` / `NetworkError`), `pokemonMapper.ts` (`extractIdFromUrl`, `buildSpriteUrl`), the `AppError` hierarchy in `src/domain/errors.ts`, and `PokemonCard.vue` inside `PokemonGrid.vue` — the trigger point for the modal.

Constraints that shape the approach:

- **CLAUDE.md conventions:** Vue 3 `<script setup>` with strict TypeScript (no `any`, no `as unknown as T`), Pinia native only, Tailwind, Vitest + `@vue/test-utils`, multi-word PascalCase components with a `Base` prefix for UI-agnostic ones, type-based `defineProps`/`defineEmits` with reactive destructuring defaults, TDD, commits under 400 lines.
- **Accessibility is normative, not decorative.** CLAUDE.md §4 requires dialogs to follow WAI-ARIA, so focus trap, focus restore, dialog semantics, and dismissal are spec requirements with tests, not styling details.
- **PokéAPI is shared and rate-limited.** `GET /pokemon/{idOrName}` must be issued at most once per Pokémon per session, and concurrent opens of the same Pokémon must collapse into one request.
- **Hexagonal separation:** the raw `PokemonDetailResponseDTO` never reaches a component. The mapper converts it into a `PokemonDetail` domain model, including the unit conversion PokéAPI's decimetre/hectogram encoding requires.

## Goals / Non-Goals

**Goals:**

- An accessible detail modal, opened from a catalog card, meeting the WAI-ARIA dialog pattern end to end (semantics, focus trap, focus restore, dismissal).
- A detail store that caches by both numeric ID and name, dedupes in-flight requests, and keeps per-Pokémon errors independent of the catalog's own status.
- Correct SI unit conversion and null-safety at the mapper boundary, so no component ever renders `NaN`.
- Detail-scoped failures that leave the catalog fully browsable.
- Reusable `BaseModal.vue` / `useAccessibleModal.ts` primitives that the later deep-link change can drive without rewriting.
- A content-shaped loading skeleton that keeps the modal's dimensions stable from open to loaded, so opening a Pokémon never produces a visible reflow.

**Non-Goals:**

- URL deep linking, `vue-router` wiring, or any route-driven open/close — deferred to `add-detail-deep-link`. In this slice the modal is opened by local component state only.
- Evolution chains, moves, held items, species flavour text, or any second endpoint beyond `GET /pokemon/{idOrName}`.
- Persistence of the cache beyond the session (no `localStorage`).
- Animated transitions or open/close motion design (the skeleton's shimmer is the only animation in scope).
- Prefetching detail data for visible cards.

## Decisions

### 1. A dedicated `pokemonDetail.store.ts`, separate from `pokemonList.store.ts`

Detail state lives in its own Pinia setup store rather than being folded into the catalog store.

*Alternative considered:* extending `pokemonList.store.ts` with detail fields. Rejected — the catalog store owns one whole-catalog load with a single `status`/`error` pair; detail is N independent per-Pokémon loads, each with its own lifecycle. Merging them would force per-entity status into a store whose contract is a single global status, which is exactly the coupling that makes a failed detail request able to corrupt the catalog view.

*Verified by:* a store test asserting that a rejected detail request leaves the catalog store's `status` untouched (its initial `'idle'` in the test's fresh Pinia instance, or whatever it already was) with `error` at `null`, while the detail error is exposed per-ID.

### 2. Identity map keyed by both ID and name

`cache: Map<string | number, PokemonDetail>` stores each loaded detail under both its numeric ID and its lowercase name, so `getPokemonDetail(25)` and `getPokemonDetail('pikachu')` hit the same entry.

*Alternative considered:* caching by numeric ID only and resolving names to IDs first. Rejected — a name can only be resolved to an ID by fetching the very resource we are trying to avoid re-fetching, so an ID-only cache would make every name-keyed lookup a guaranteed miss. Double-keying costs one extra `Map` entry per Pokémon and makes both access paths O(1). The upcoming deep-link change will address Pokémon by either form, so this is the access pattern to support now.

*Verified by:* a store test asserting that after loading by name, a subsequent lookup by numeric ID returns the cached value with no additional HTTP call.

### 3. `loadingIds: Set` for in-flight deduplication, `errors: Map` for per-entity failures

`getPokemonDetail(idOrName)` returns immediately on a cache hit; on a miss it consults `loadingIds` and skips issuing a duplicate request when one is already in flight for that key, and records failures into `errors` keyed the same way.

*Alternative considered:* a single `status`/`error` pair, as the catalog store uses. Rejected — that shape cannot represent "Pikachu failed while Bulbasaur is still loading", which is reachable simply by closing and reopening the modal on a different card during a slow request. Per-entity keying makes each entry's state independent by construction.

*Verified by:* store tests asserting that two concurrent calls for the same key issue exactly one HTTP call, and that a failure recorded for one key leaves another key's cached value and error state untouched.

### 4. `useAccessibleModal.ts` composable owning the a11y mechanics

Focus trap, focus restore, Escape/outside-click dismissal, and the body scroll lock live in one composable, not scattered across `BaseModal.vue`.

*Alternative considered:* implementing the behavior directly in `BaseModal.vue`, or adding a library like `focus-trap`. Rejected — inlining it in the component makes the trap untestable without mounting a full modal and unusable by any future dialog; a third-party dependency is disproportionate for behavior that is roughly forty lines and is itself a graded requirement of this change. A composable is unit-testable in isolation and reusable by the deep-link change.

*Verified by:* `useAccessibleModal.spec.ts` asserting Tab from the last focusable element wraps to the first, Shift+Tab from the first wraps to the last, focus returns to the recorded trigger element on close, and every listener added on open is removed on close/unmount.

### 5. Scroll lock compensates for scrollbar width

On open, the composable measures `window.innerWidth - document.documentElement.clientWidth` and applies that value as `padding-right` on `<body>` alongside `overflow: hidden`, restoring both to their prior values on close.

*Alternative considered:* setting `overflow: hidden` alone. Rejected — removing the scrollbar reclaims its width, and the page behind the modal visibly jumps sideways at the moment the modal opens. Compensating padding keeps the underlying layout static.

*Verified by:* a composable test asserting body `overflow` and `padding-right` are set on lock and restored to their pre-lock values on unlock.

### 6. `BaseModal.vue` is UI-agnostic; `PokemonDetailModal.vue` carries the domain

`BaseModal.vue` takes `open`, a `titleId`, a `#title` and a default slot, emits `close`, and knows nothing about Pokémon. `PokemonDetailModal.vue` composes it, reads the detail store, and renders the loading / error / loaded states.

*Alternative considered:* one `PokemonDetailModal.vue` doing both. Rejected — it would bind the accessibility contract to one screen, so the next dialog in the app would either reimplement or copy it. The `Base` prefix in CLAUDE.md §6 exists for exactly this split.

*Verified by:* a component test mounting `BaseModal.vue` with arbitrary slot content, asserting the dialog attributes and `close` emission on Escape, backdrop click, and the close control — with no Pokémon-specific fixture involved.

### 7. Unit conversion and null-safety belong in the mapper, not the template

`mapToPokemonDetail` divides `height` by 10 (decimetres → metres) and `weight` by 10 (hectograms → kilograms), and yields `null` for any absent or non-finite value.

*Alternative considered:* formatting in the component template. Rejected — it would put a domain rule (PokéAPI's unit encoding) into the view layer, violating the hexagonal separation CLAUDE.md §4 requires, and would have to be repeated in every future view showing a measurement. Guarding at the boundary also means `NaN` can never reach a template.

*Verified by:* `pokemonMapper.spec.ts` asserting `height: 7 → 0.7`, `weight: 69 → 6.9`, and `null` (never `NaN`) for missing and non-numeric inputs.

### 8. The modal is opened by local state in this slice, with an interface the router can drive later

`App.vue` (or the grid's parent) holds `selectedPokemon` and passes it down; `PokemonCard.vue` emits a `select` event rather than reaching into the store.

*Alternative considered:* introducing `vue-router` now and opening the modal from a route. Rejected — that is the whole substance of `add-detail-deep-link`, and pulling it forward would merge two reviewable slices into one and push this change past the 400-line commit limit. Because the trigger is a prop plus an emitted event, swapping local state for a route parameter later touches only the parent.

*Verified by:* a component test asserting `PokemonCard.vue` emits `select` with its item on click and on Enter/Space, without referencing any store.

### 9. A content-shaped `PokemonDetailSkeleton.vue`, not a spinner

The loading state renders placeholder blocks laid out in the same grid as the loaded detail — artwork square, title bar, a row of type badges, one bar per stat — inside a container marked `aria-busy="true"` with the blocks themselves `aria-hidden`. The shimmer is a CSS animation disabled under `@media (prefers-reduced-motion: reduce)`.

*Alternative considered:* a centred spinner, which is what the loading state would otherwise be. Rejected on two counts. First, a spinner occupies a different footprint than the loaded content, so the modal visibly resizes the instant data arrives — the same layout-shift problem decision 5 already solves for the page behind the modal, reintroduced inside it. Second, a spinner communicates only "something is happening", while a content-shaped skeleton also communicates *what* is coming, which is the whole reason the pattern exists.

*Alternative considered:* reusing the skeleton for the error state too. Rejected — a skeleton signals "content is arriving", which is precisely false once the request has failed; the error state must replace it outright, not decorate it.

*Verified by:* a component test asserting the skeleton renders for the loading state and is absent in both the loaded and error states, that its container carries `aria-busy="true"` while its placeholder blocks are `aria-hidden`, and that the number of stat placeholder rows matches the number of stat rows the loaded state renders.

## Risks / Trade-offs

- **[The hand-rolled focus trap may miss focusable-element edge cases a library handles — `<details>`, shadow DOM, elements hidden by CSS]** → The selector covers the standard interactive set (`a[href]`, `button`, `input`, `select`, `textarea`, `[tabindex]:not([tabindex="-1"])`) and filters out disabled and `hidden` elements; the modal's own content is fully controlled by this change, so the exotic cases are not reachable here. If a future dialog needs them, decision 4 keeps the swap to a library confined to one file.
- **[The cache is never invalidated for the session]** → Pokémon detail data changes only with new PokéAPI game data releases, never within a session, so a per-session cache without invalidation is the correct trade for eliminating repeat requests against a rate-limited shared API.
- **[Double-keying the cache stores two `Map` entries per Pokémon]** → Bounded by the number of Pokémon a user actually opens in one session — tens, not thousands — and buys O(1) lookup on both access paths (decision 2).
- **[Body scroll lock via direct style mutation conflicts if two modals ever open at once]** → Out of scope here: this slice opens exactly one modal, driven by a single `selectedPokemon`. A nested-dialog case would need lock reference counting, which the composable's single ownership point makes straightforward to add later.
- **[Opening the modal is a cold network request, so the first paint is always a loading state]** → Accepted deliberately: prefetching detail for every visible card would issue 20 requests per page against a rate-limited API to serve a modal the user may never open, which is exactly the trade `add-search-and-type-filter` already rejected for type indices.
- **[A skeleton that does not match the loaded layout is worse than a spinner — it promises a shape it then fails to deliver]** → The stat placeholder count is asserted against the loaded state's stat row count in the same test file, so the two drifting apart fails the suite rather than shipping as a flicker.
- **[On a fast connection or a cache hit the skeleton could flash for a few frames]** → A cache hit renders the loaded state directly and never enters the loading state at all (decision 2, and its own spec scenario). The remaining cold-request case is a genuine network wait, which is exactly what the skeleton is for; a minimum-display delay would add latency to hide an artifact that only appears when there is something real to wait for.
