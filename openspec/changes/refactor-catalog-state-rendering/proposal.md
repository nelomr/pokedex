## Why

`PokemonCatalogView.vue` selects what to render through a five-branch `v-if` / `v-else-if` chain that mixes `store.status` with data-derived conditions (`rawCatalogIndex.length`, `filteredList.length`). The branching logic lives in the template, is hard to read and test in isolation, and the view mutates store state directly (`store.status = "idle"`) to retry. As more states are added the chain grows linearly and silently misses cases.

## What Changes

- Introduce a view-level `CatalogViewState` (`idle | loading | error | empty | noResults | populated`) resolved by a pure `resolveCatalogViewState` function and exposed through a `computed` in the view.
- Replace the `v-else-if` chain with an exhaustive `Record<CatalogViewState, StateEntry>` map rendered by a presentational `CatalogStateRenderer.vue` via `<component :is>`.
- Extract one presentational component per state: `CatalogLoadingState`, `CatalogErrorState`, `CatalogPopulatedState`, plus a reusable `BaseEmptyState` shared by the empty and no-results states.
- Add a `retryCatalog()` store action; the view no longer writes `store.status`.
- The `idle` state (before the first load starts) SHALL render the loading state instead of nothing.
- All existing `data-testid` hooks are preserved.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `pokemon-catalog`: the "Distinct Catalog States" requirement now explicitly covers the not-yet-started (idle) catalog, which SHALL render the loading state.

## Impact

- `src/views/PokemonCatalogView.vue` (template and script rewritten around the state map).
- New files next to the view: `catalogViewState.ts` (type + resolver) and its spec.
- New components under `src/components/`: `CatalogStateRenderer`, `CatalogLoadingState`, `CatalogErrorState`, `CatalogPopulatedState`, `BaseEmptyState`; exports added to `src/components/index.ts`.
- `src/stores/pokemonList.store.ts`: new `retryCatalog()` action.
- `src/views/PokemonCatalogView.spec.ts` remains the regression safety net; no dependency changes.
