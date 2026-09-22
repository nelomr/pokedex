# Tasks

## 1. Debounce Composable (TDD)

- [ ] 1.1 Write failing tests for `src/composables/useDebounce.ts` in `src/composables/useDebounce.spec.ts`, using `vi.useFakeTimers()`, covering: the debounced value does not update until the configured delay elapses; rapid successive changes to the source value collapse into a single update after the delay; the pending timer is cleared when the consuming component unmounts — verify with `pnpm test` showing all new tests failing (red)
- [ ] 1.2 Implement `src/composables/useDebounce.ts` (a composable accepting a reactive source and a delay in ms, returning a debounced ref, with cleanup on unmount) to make the tests from 1.1 pass — verify with `pnpm test` showing all `useDebounce` tests green

## 2. Store Filtering (TDD)

- [ ] 2.1 Write failing tests in `src/stores/pokemonList.store.spec.ts` covering: `filteredList` narrows by case-insensitive partial name match; `filteredList` narrows by `selectedType` membership once the relevant `typeIndex` entry is loaded; a combined search query and selected type return only entries satisfying both (AND composition); `setSearchQuery()` resets `currentPage` to 1; `setTypeFilter()` resets `currentPage` to 1; `totalPages`/`paginatedItems` are derived from `filteredList` rather than `rawCatalogIndex`; selecting a type issues exactly one mocked HTTP call to `GET /type/{type}` (assert call count); re-selecting the same type issues no additional call; clearing the selected type restores the full (unfiltered by type) set; a rejected type fetch leaves catalog `status` at `'success'` while exposing a distinct filter-scoped error — verify with `pnpm test` showing all new tests failing (red)
- [ ] 2.2 Implement the store changes in `src/stores/pokemonList.store.ts` (`searchQuery`, `selectedType`, `availableTypes`, `typeIndex: Map<string, Set<number>>`, `filteredList` computed, `setSearchQuery()`, `setTypeFilter()` actions, repointed `totalPages`/`paginatedItems`/`hasNextPage`/`hasPrevPage`, filter-scoped error state) to make the tests from 2.1 pass — verify with `pnpm test` showing all store tests green

_Commit boundary: keep the debounce composable (group 1) as its own commit, separate from the store changes (group 2), if the combined diff approaches the 400-line CLAUDE.md limit._

## 3. Components

- [ ] 3.1 Write failing component tests (`@vue/test-utils`) for `SearchBar.vue` asserting it emits the entered value (debounced via `useDebounce`) — verify with `pnpm test` showing the new tests failing (red), then implement `SearchBar.vue` to make them pass (green)
- [ ] 3.2 Write failing component tests for `TypeFilterSelect.vue` asserting it renders all 18 `availableTypes` options with no HTTP call issued on mount, and emits the selected type value (including a cleared/empty selection) — verify with `pnpm test` showing the new tests failing (red), then implement `TypeFilterSelect.vue` to make them pass (green)
- [ ] 3.3 Wire `SearchBar.vue` and `TypeFilterSelect.vue` into `App.vue`, connecting their emitted values to `setSearchQuery()`/`setTypeFilter()`, and write a component test asserting the no-results state renders distinguishable content from the loading, error, and empty-catalog states for the corresponding store conditions — verify with `pnpm test` showing the new test failing (red), then wire the rendering to make it pass (green)

_Commit boundary: keep `SearchBar.vue` + `TypeFilterSelect.vue` (3.1–3.2) as one commit and the `App.vue` wiring (3.3) as a second if the combined diff approaches 400 lines._

## 4. Integration Verification

- [ ] 4.1 Run `pnpm test`, `pnpm build` (vue-tsc typecheck), and `pnpm lint`, and verify all three complete with no errors
- [ ] 4.2 Manually load the app in a browser with devtools network tab open and verify exactly one `GET /type/{type}` request is issued per distinct type selected, no request is issued on re-selecting an already-selected type, and search/type filtering, pagination reset, and the no-results state behave as specified
