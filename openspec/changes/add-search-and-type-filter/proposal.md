# Proposal

## Why

Browsing 1000+ Pokémon by pagination alone is impractical; users need to narrow the catalog by name and by type. PokéAPI has no partial-name search endpoint, so the only viable design is a single lightweight full-index fetch (already loaded by the catalog slice) plus fully client-side, in-memory filtering.

## What Changes

- Add `src/composables/useDebounce.ts` and apply a 300ms debounce to the search input so filtering doesn't run on every keystroke.
- Extend `pokemonList.store.ts` with `searchQuery`, `selectedType` state, a `filteredList` computed crossing text search and type filter, an `availableTypes` list, and a `typeIndex: Map<string, Set<number>>` lazily built and cached per type from `GET /type/{type}` (IDs extracted from each entry's resource URL).
- Add `searchMode: 'name' | 'id'` state, and a `setSearchMode()` action that clears the current query and resets `currentPage` to 1 when the mode changes.
- Add `setSearchQuery()` and `setTypeFilter()` actions, both resetting `currentPage` to 1; `setTypeFilter()` loads and caches the relevant `typeIndex` slice on demand. In `id` mode, `filteredList` matches entries whose extracted ID equals the query exactly, skipping any entry whose extracted ID is `null`.
- Add `SearchBar.vue` (now also carrying a name/number search-mode selector and a per-mode input restriction) and `TypeFilterSelect.vue` components (or a `Base`-prefixed input/select if implemented as pure UI-agnostic components).

## Capabilities

### New Capabilities
- `pokemon-search-filter`: client-side search by name or by exact number, plus type filtering, over the catalog index, including debounced input and lazy per-type index loading.

### Modified Capabilities
- `pokemon-catalog`: pagination now operates over the filtered result set (`filteredList`) rather than the full raw catalog.

## Impact

- No new files are needed for the search-mode addition: the mode selector lives inside `SearchBar.vue`.
- New files: `src/composables/useDebounce.ts`, `src/components/SearchBar/SearchBar.vue`, `src/components/TypeFilterSelect/TypeFilterSelect.vue`.
- Modified files: `src/stores/pokemonList.store.ts` (new state, computed, actions).
- Dependencies wired: none new.
- Dependency: requires `add-pokemon-catalog` to be implemented first — it builds directly on `rawCatalogIndex`, `pokemonList.store.ts`, and the existing pagination/grid components.
