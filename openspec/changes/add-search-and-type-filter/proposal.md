# Proposal

## Why

Browsing 1000+ Pokémon by pagination alone is impractical; users need to narrow the catalog by name and by type. PokéAPI has no partial-name search endpoint, so the only viable design is a single lightweight full-index fetch (already loaded by the catalog slice) plus fully client-side, in-memory filtering.

## What Changes

- Add `src/composables/useDebounce.ts` and apply a 300ms debounce to the search input so filtering doesn't run on every keystroke.
- Extend `pokemonList.store.ts` with `searchQuery`, `selectedType` state, a `filteredList` computed crossing text search and type filter, an `availableTypes` list, and a `typeIndex: Map<string, Set<number>>` lazily built and cached per type from `GET /type/{type}` (IDs extracted from each entry's resource URL).
- Add `setSearchQuery()` and `setTypeFilter()` actions, both resetting `currentPage` to 1; `setTypeFilter()` loads and caches the relevant `typeIndex` slice on demand.
- Add `SearchBar.vue` and `TypeFilterSelect.vue` components (or a `Base`-prefixed input/select if implemented as pure UI-agnostic components).

## Capabilities

### New Capabilities
- `pokemon-search-filter`: client-side name search and type filtering over the catalog index, including debounced input and lazy per-type index loading.

### Modified Capabilities
- `pokemon-catalog`: pagination now operates over the filtered result set (`filteredList`) rather than the full raw catalog.

## Impact

- New files: `src/composables/useDebounce.ts`, `src/components/SearchBar.vue`, `src/components/TypeFilterSelect.vue`.
- Modified files: `src/stores/pokemonList.store.ts` (new state, computed, actions).
- Dependencies wired: none new.
- Dependency: requires `add-pokemon-catalog` to be implemented first — it builds directly on `rawCatalogIndex`, `pokemonList.store.ts`, and the existing pagination/grid components.
