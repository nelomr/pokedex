## 1. Store-owned retry

- [x] 1.1 RED: add store spec — `retryCatalog()` from `error` moves status to `loading` and issues a new catalog request
- [x] 1.2 RED: add store spec — `retryCatalog()` from `success` issues no request and keeps `success`
- [x] 1.3 GREEN: implement `retryCatalog()` in `pokemonList.store.ts` and export it
- [x] 1.4 Replace the view's `retry()` body with `store.retryCatalog()`; confirm `PokemonCatalogView.spec.ts` retry test stays green

## 2. View state resolution

- [x] 2.1 RED: add `src/views/catalogViewState.spec.ts` covering all six outputs of `resolveCatalogViewState` (`idle`, `loading`, `error`, `empty`, `noResults`, `populated`)
- [x] 2.2 GREEN: create `src/views/catalogViewState.ts` with the `CatalogViewState` type and the pure `resolveCatalogViewState` function

## 3. State components

- [x] 3.1 RED: add `CatalogErrorState.spec.ts` — renders the message and emits `retry` when the retry button is clicked
- [x] 3.2 GREEN: create `CatalogErrorState` (keeps `catalog-error` / `catalog-retry` hooks and current markup)
- [x] 3.3 Create `CatalogLoadingState`, `BaseEmptyState` (`message`, `testId` props) and `CatalogPopulatedState` (wraps `PokemonGrid` + `PaginationControls`, emits `prev`/`next`) moving existing markup unchanged
- [x] 3.4 Create `CatalogStateRenderer` rendering `<component :is>` with `v-bind`/`v-on` from a typed `StateEntry`
- [x] 3.5 Export the new components from `src/components/index.ts`

## 4. Wire the view

- [x] 4.1 RED: add a view spec — before the first load starts (`idle`), the `catalog-loading` hook is rendered
- [x] 4.2 GREEN: in `PokemonCatalogView.vue`, add the `catalogViewState` computed and the `Record<CatalogViewState, StateEntry>` map (`idle` → loading entry); replace the `v-else-if` chain with `<CatalogStateRenderer>`
- [x] 4.3 Remove now-unused view code (`isNoResults`, inline state markup)
- [x] 4.4 Verify: `pnpm test`, `pnpm lint`, `pnpm build` pass with existing `PokemonCatalogView.spec.ts` assertions unchanged
