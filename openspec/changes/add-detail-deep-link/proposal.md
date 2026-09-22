# Proposal

## Why

The detail modal currently only opens from a card click, so a detail view can't be reloaded or shared. Routing the modal's open/close state through `vue-router` makes detail URLs shareable and reloadable.

## What Changes

- Introduce `vue-router` and route the detail modal's open/close state through it, so reloading (F5) or opening a shared link resolves the detail cold, directly against `pokemonDetail.store.ts`, without going through the catalog list.
- **Open design decision (to be resolved in design.md):** route `/pokemon/:idOrName` vs. query param `?detail=id` over the catalog list route. Tradeoff: a query param keeps the list mounted behind the modal and makes close a trivial history pop; a nested route is cleaner semantically but requires the list to be kept alive behind it.
- Handle `NotFoundError` on the cold-load path for an invalid id/name in the URL.
- Advance the catalog's pagination to the page holding the deep-linked Pokémon when — and only when — that Pokémon is present in the currently active `filteredList`; an invalid identifier or one excluded by the active search query or type filter leaves `currentPage` untouched.

## Capabilities

### New Capabilities
- `pokemon-detail-deep-link`: shareable, reloadable URLs for a Pokémon's detail view, resolved cold against `pokemonDetail.store.ts`.
- `pokemon-detail-deep-link`: on a resolved deep link, one-time synchronisation of the catalog's `currentPage` to the page containing that Pokémon in the active filtered list, skipped whenever the Pokémon is not in that list.

### Modified Capabilities
- `pokemon-detail`: modal open/close state becomes router-driven instead of local component state.

## Impact

- New dependency: `vue-router` (already installed, first usage wired into `src/main.ts`).
- New/modified files: router configuration (e.g. `src/router.ts`), `src/App.vue` (router-view integration), `PokemonDetailModal.vue` / `PokemonCard.vue` (navigation instead of local open state).
- Modified file: `src/stores/pokemonList.store.ts` (a pagination-sync action over `filteredList`).
- Dependency: requires `add-pokemon-detail-modal` to be implemented first — it re-wires that slice's modal state to the router rather than introducing a new modal.
