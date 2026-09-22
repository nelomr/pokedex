# Design

## Context

See proposal.md — Why. This change builds directly on the catalog slice from `add-pokemon-catalog`: `pokemonList.store.ts` already holds `rawCatalogIndex` (the full `{ name, url }` index, loaded once) and derives `paginatedItems`/`totalPages` from it. PokéAPI has no partial-name search endpoint, so name search must operate over the already-loaded index rather than a server query. Type filtering, by contrast, needs data the catalog index does not carry — membership requires `GET /type/{type}`, one request per distinct type the user selects.

Constraints that shape the approach:

- **CLAUDE.md conventions** (unchanged from change #1): Vue 3 `<script setup>` with strict TypeScript, Pinia native only, Tailwind, Vitest + `@vue/test-utils`, multi-word PascalCase components with a `Base` prefix for UI-agnostic ones, type-based `defineProps`/`defineEmits` with reactive destructuring defaults, TDD, commits under 400 lines.
- **The existing pipeline** (`rawCatalogIndex → paginatedItems`, `design.md` decision 6 of change #1) was deliberately built so a filtering stage inserts as `rawCatalogIndex → filteredList → paginatedItems` without touching the network layer, the mapper, or the pagination components.
- **PokéAPI is shared and rate-limited.** A per-type index must be fetched at most once per type per session, reusing the existing `httpGet` resilience contract (timeout, bounded retry, typed errors).
- **Number search reuses existing infrastructure at zero extra network cost.** `extractIdFromUrl` already exists in `pokemonMapper.ts` and `PokemonCardItem.id` is already typed `number | null`, so matching by exact ID needs no new endpoint and no new derived data — it only adds a comparison over data already loaded.

## Goals / Non-Goals

**Goals:**

- Instant, client-side name search over the loaded catalog index, debounced so it does not re-filter on every keystroke.
- Type filtering that composes with name search (AND) and hits the network at most once per distinct type per session.
- Pagination (`totalPages`, `paginatedItems`, boundary navigation) recomputed transparently over the filtered set rather than the raw index.
- A distinct "no results" state, separate from the existing loading/error/empty-catalog states.
- A failed per-type fetch that does not corrupt the catalog `status` and leaves the catalog browsable.
- Explicit, user-selected search by name or by exact ID, with an input restricted to what the active mode accepts.

**Non-Goals:**

- Server-side or fuzzy search — PokéAPI offers no partial-name search endpoint.
- Prefix or range matching on IDs — only exact ID match is in scope.
- Multi-type selection (selecting more than one type simultaneously).
- Any caching layer beyond the in-session `typeIndex` map — no `localStorage`, no persisted cache across reloads.
- Detail view, routing, or deep linking (later changes).

## Decisions

### 1. Client-side filtering over the already-loaded full index, not server-side search

`filteredList` is a computed crossing `searchQuery` and `selectedType` over `rawCatalogIndex`, evaluated entirely in memory.

*Alternative considered:* a server-side search endpoint. Rejected — PokéAPI exposes no partial-name search; the only whole-catalog view is the index endpoint change #1 already loads in full. Filtering a fewer-than-1300-entry in-memory array is cheap and requires no new endpoint dependency.

*Verified by:* store tests asserting `filteredList` narrows correctly for a case-insensitive partial name match, with no additional HTTP call issued for a name-only search.

### 2. 300ms debounce via a `useDebounce` composable, applied only to the search input

`SearchBar.vue` binds through `useDebounce(rawInput, 300)`; the debounced value is what `setSearchQuery()` receives. The type select applies immediately, since a `<select>` change is a single discrete event, not a keystroke stream, and immediate feedback is expected for it.

*Alternative considered:* debouncing both inputs uniformly. Rejected — a `<select>` change does not repeat rapidly the way keystrokes do, so debouncing it would only add a perceived 300ms lag to what should be an instant selection with no corresponding benefit.

*Verified by:* `useDebounce.spec.ts` using `vi.useFakeTimers()` — the debounced value updates only after the delay elapses, rapid successive changes collapse into a single update, and the timer is cleared on unmount.

### 3. Lazy per-type index: `typeIndex: Map<string, Set<number>>`

Built on demand from `GET /type/{type}` via the existing `httpGet` client, reusing its timeout/retry/error contract unchanged. IDs are extracted from each entry's resource URL using the existing `extractIdFromUrl` mapper helper. The result is cached in the `Map` keyed by type name, so re-selecting an already-fetched type issues no second request.

*Alternative considered:* fetching all 18 type indices eagerly on catalog load. Rejected — most sessions will only ever select zero or one type, so eagerly fetching 18 endpoints on every load would be 18x the necessary requests against a shared rate-limited API for a filter the user may never touch.

*Verified by:* store tests asserting the mocked HTTP client is called exactly once for a given type across repeated selections of that type, and not called at all until that type is first selected.

### 4. Filter composition: name substring AND type membership

`filteredList` = `rawCatalogIndex` filtered by case-insensitive substring match on `name`, further filtered (only when `selectedType` is set) by membership of the entry's extracted ID in `typeIndex.get(selectedType)`. Both conditions apply together, never as an OR.

*Alternative considered:* an OR composition (name match or type match). Rejected — a search box and a type filter are conventionally understood by users as successively narrowing constraints, not alternatives; OR composition would make the type filter widen results in a way that contradicts its label.

*Verified by:* store tests asserting a combined query (a name substring plus a selected type) returns only entries satisfying both conditions.

### 5. Pagination re-derived from `filteredList`

`totalPages`, `paginatedItems`, `hasNextPage`, and `hasPrevPage` are repointed at `filteredList` instead of `rawCatalogIndex`, exactly as anticipated in change #1's design. `setSearchQuery()` and `setTypeFilter()` both reset `currentPage` to 1, since a changed filter invalidates the user's current page position.

*Alternative considered:* preserving `currentPage` across filter changes and clamping it if now out of range. Rejected — silently jumping to a clamped page (e.g., landing on page 3 of a 2-page filtered result) is more confusing than always returning to page 1, which is the predictable, discoverable behavior.

*Verified by:* store tests asserting `currentPage` is `1` immediately after either setter is called from a non-first page, and that `totalPages`/`paginatedItems` reflect the filtered set's length.

### 6. `availableTypes`: a static hardcoded list of the 18 canonical type names

`TypeFilterSelect.vue` is populated from a constant list of the 18 known Pokémon types, avoiding an extra `GET /type` index request on load merely to populate a dropdown.

*Alternative considered:* fetching `GET /type` on mount to populate the select. Rejected — the set of top-level Pokémon types is a fixed, well-known, rarely-changing list; spending a network request and a loading state on it merely to render dropdown options is a poor trade against a small hardcoded constant, and every listed type still resolves its members lazily via decision 3.

*Verified by:* a component test asserting `TypeFilterSelect.vue` renders all 18 options with no HTTP call issued on mount.

### 7. A distinct "no results" state, separate from "catalog is empty"

A successful catalog load whose `filteredList` is empty (because the active filters exclude every entry) renders a "no results for your filters" state, distinct from the existing empty-catalog state (which means the catalog itself, unfiltered, has no entries — an edge case already covered by change #1).

*Alternative considered:* reusing the existing empty-catalog message for both cases. Rejected — the two conditions have different causes and different resolutions (adjust your filters vs. the catalog itself is empty), and conflating them would mislead the user into thinking the whole catalog is unavailable when only their filter is too narrow.

*Verified by:* a component test asserting the no-results state renders distinguishable content from the empty-catalog state for the corresponding store conditions.

### 8. Per-type fetch failure is filter-scoped and does not corrupt catalog `status`

A failed `GET /type/{type}` call sets a separate, filter-scoped error field and leaves `status` (the catalog's own load state) untouched, so the catalog remains browsable with the type filter simply unavailable or reverted.

*Alternative considered:* routing a type-fetch failure through the same `status`/`error` fields the catalog load uses. Rejected — that would show a full error state and hide the already-successfully-loaded catalog behind it merely because a secondary, optional filter request failed, which is a disproportionate failure mode for a narrowing feature.

*Verified by:* a store test asserting that a rejected type fetch leaves catalog `status` at `'success'` while exposing a distinct filter-scoped error.

### 9. Explicit search mode (name | id) with exact ID matching, skipping null IDs

The user explicitly selects a `searchMode` of `name` or `id`; there is no automatic inference of intent from the query's content. In `id` mode, `filteredList` matches only entries whose extracted ID is strictly equal to the numeric query; entries whose extracted ID is `null` are excluded from matching and are never coerced to `0` or any other number.

*Alternative considered:* auto-detecting intent from the input (all-digits → ID mode). Rejected because a Pokémon can legitimately be searched by a name containing digits, and, more importantly, an implicit mode gives the user no way to know or control what is being matched, making empty results inexplicable. Prefix matching on IDs was also considered and rejected: the `?limit=100000` catalog index includes alternate forms with IDs above 10000, so prefix matching on a short numeral would return hundreds of irrelevant entries and make the feature useless.

*Verified by:* store tests asserting an exact-ID query returns exactly one entry, a non-matching numeral returns none, entries with a `null` extracted ID are excluded from ID-mode results and are NOT coerced to `0`, and the same query string behaves differently under each mode.

### 10. Per-mode input restriction and accessible mode selector

Number mode restricts the search input to digits only, stripping any non-digit character as it is entered; name mode accepts plain text. Switching mode clears the current query and resets `currentPage` to 1, since a leftover query from one mode is invalid in the other. The mode selector is always visible and labeled, and the search input's accessible name changes with the active mode so assistive technology announces what is being searched.

*Alternative considered:* a native `type="number"` input. Rejected because it permits characters like `e`, `-`, and `.` that are meaningless for a Pokémon number, renders spinner controls that break the Tailwind layout, and can yield `NaN` in intermediate typing states.

*Verified by:* a component test asserting non-digit input is rejected in number mode, that switching mode clears the query and emits the reset, and that the input's accessible name reflects the active mode.

## Risks / Trade-offs

- **[Filtering 1300+ entries in-memory on every keystroke could visibly lag the UI]** → 300ms debounce on the search input plus `computed` caching (Vue only re-evaluates `filteredList` when its reactive dependencies change) keeps the filter pass infrequent and bounded to actual query changes.
- **[`typeIndex` entries are fetched once and never refreshed for the session]** → Type membership data changes only with new PokéAPI game data releases, not within a user session, so a per-session cache without invalidation is an acceptable trade for eliminating repeat requests.
- **[A failed type fetch leaves the user with a selected type that yields no narrowing]** → The filter-scoped error message surfaces the failure explicitly so the user understands why the filter did not apply, rather than silently ignoring their selection.
- **[Users may expect a numeral typed in name mode to find that ID]** → The mode selector is visible and labeled at all times, and the input's placeholder/accessible name states the active mode.
- **[Exact ID matching returns at most one result, which can feel abrupt versus name search]** → This is the deliberate trade recorded in decision 9; the no-results state explains that no Pokémon carries that number.
