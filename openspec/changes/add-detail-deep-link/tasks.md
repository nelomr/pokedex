# Tasks

## 1. Router Foundation and Catalog View Extraction

- [x] 1.1 Create `src/router/index.ts` exporting the route table and a `createWebHistory` router: a catalog route at `/` named `pokemon-catalog` rendering `PokemonCatalogView.vue`, with a child route at `pokemon/:idOrName` named `pokemon-detail` rendering `PokemonDetailModal.vue` with `props: true`; add a `src/router/routeNames.ts` (or equivalent exported constants) so route names are never written as bare strings in components
- [x] 1.2 Write `src/router/index.spec.ts` asserting the exported route table resolves `/pokemon/25` to the `pokemon-detail` route with `params.idOrName === '25'`, resolves `/pokemon/pikachu` with `params.idOrName === 'pikachu'`, and that the detail route is a child of the catalog route — verify with `pnpm test`
- [x] 1.3 Move the entire catalog implementation out of `src/App.vue` into a new `src/views/PokemonCatalogView.vue` verbatim — the `usePokemonListStore()` instance, the `onMounted` `initCatalog()` call, `retry`, `handleQueryChange`, `handleSearchModeChange`, `handleTypeChange`, `isNoResults`, and every rendering branch with its `data-testid` hooks — and add a nested `<router-view />` inside it for the detail child
- [x] 1.4 Reduce `src/App.vue` to the application shell: the root layout wrapper, the page heading with `tabindex="-1"` and a stable `data-testid` so it can serve as the focus-restore fallback, and a single top-level `<router-view />`
- [x] 1.5 Move `src/App.spec.ts` to `src/views/PokemonCatalogView.spec.ts` changing only the import and the mount target, leaving every assertion unchanged, and verify with `pnpm test` that the whole moved suite is green — any assertion needing an edit means the extraction was not faithful and must be corrected rather than the test
- [x] 1.6 Wire the router into `src/main.ts` with `app.use(router)` before `mount`, and verify with `pnpm build` (vue-tsc typecheck) and `pnpm lint` that the refactor typechecks and lints clean

_Commit boundary: groups 1 is one commit — a pure refactor plus router wiring with no behavior change, reviewable on its own._

## 2. Route Parameter Normalisation (TDD)

- [x] 2.1 Write failing tests in `src/services/detailRouteKey.spec.ts` for `normalizeDetailKey(raw: string)` covering: `'25'` yields the number `25`; `'025'` yields the number `25`; `'PIKACHU'`, `'Pikachu'` and `' Pikachu '` each yield the string `'pikachu'`; `''` and `'   '` each yield `null` — verify with `pnpm test` showing the new tests failing (red)
- [x] 2.2 Implement `normalizeDetailKey` in `src/services/detailRouteKey.ts` returning `string | number | null` with no `any` and no type assertions, to make the 2.1 tests pass — verify with `pnpm test` showing them green

## 3. Router-Driven Modal Open and Close (TDD)

- [x] 3.1 Write failing tests in `src/views/PokemonDetailRoute.spec.ts` mounting the real router covering: loading directly at `/pokemon/25` mounts the detail modal with the catalog view mounted behind it; navigating from `/pokemon/25` to `/pokemon/26` does not re-mount the catalog view; loading at `/pokemon/pikachu` then navigating to `/pokemon/25` issues exactly one detail request and the second navigation never enters the loading state — verify with `pnpm test` showing them failing (red)
- [x] 3.2 Update `src/components/PokemonDetailModal/PokemonDetailModal.vue` to take its identifier from the `idOrName` route prop, normalise it with `normalizeDetailKey`, call `getPokemonDetail` on mount and on a watcher over the normalised key, and bind its loading/error/loaded states to that Pokémon's own detail state without reading `usePokemonListStore().status` — make the 3.1 tests pass and verify with `pnpm test`
- [x] 3.3 Write a failing test asserting that mounting at `/pokemon/25` with the catalog request left permanently pending still reaches the modal's loaded state and renders the detail content while `usePokemonListStore().status` is `'loading'`, then make it pass — verify with `pnpm test`
- [x] 3.4 Write failing tests covering dismissal by route navigation: Escape, the close control, and a backdrop click each navigate to the `pokemon-catalog` route and unmount the modal; a click inside the modal surface leaves the route unchanged; and, mounted cold at `/pokemon/25` with no prior history entry, Escape still ends at `/` with the catalog visible — verify with `pnpm test` showing them failing (red)
- [x] 3.5 Replace the modal's local close handling with a single handler performing `router.push` to the named catalog route (never `router.back()`) so all three dismissal paths route through it, and make the 3.4 tests pass — verify with `pnpm test`
- [x] 3.6 Delete the `selectedPokemon` local state and the `select` handler from the catalog view so the route is the only authority on whether the modal is open, and verify with `pnpm test` that no test still asserts on local selection state

_Commit boundary: groups 2–3 as one commit — parameter normalisation plus the route-driven open/close, the behavioral core of this change._

## 4. Catalog Cards as Links (TDD)

- [x] 4.1 Write failing tests in `src/components/PokemonCard/PokemonCard.spec.ts` asserting the card's rendered root is an anchor whose `href` is `/pokemon/<lowercase name>`, that the component declares no `select` emit, and that activating it navigates to the detail route — verify with `pnpm test` showing them failing (red)
- [x] 4.2 Change `src/components/PokemonCard/PokemonCard.vue` to render `RouterLink` as its root targeting `{ name: 'pokemon-detail', params: { idOrName: item.name } }`, remove the `select` emit together with the hand-rolled `tabindex`, `role`, and Enter/Space keydown handling the anchor makes redundant, keep the visible focus ring, and make the 4.1 tests pass — verify with `pnpm test`
- [x] 4.3 Update `src/components/PokemonGrid/PokemonGrid.spec.ts` and the catalog view spec for the removed `select` emit, and verify with `pnpm test`, `pnpm build` and `pnpm lint` that all three are clean

## 5. History Navigation and Focus Restore (TDD)

- [x] 5.1 Write failing tests covering history-driven open/close: navigating `/` → `/pokemon/25` → `router.back()` unmounts the modal and makes the catalog route current; a following `router.forward()` re-mounts the modal with focus inside it — verify with `pnpm test` showing them failing (red)
- [x] 5.2 Write failing tests asserting that a history-driven close releases everything a dismissal-driven close releases: `document.body` overflow and padding are restored to their pre-open values, and no document listener added by the modal remains registered after the Back navigation — verify with `pnpm test` showing them failing (red), then make 5.1–5.2 pass, confirming the teardown runs from `useAccessibleModal`'s unmount path rather than adding any popstate or `afterEach` listener
- [x] 5.3 Write failing tests for the focus-restore fallback: entering cold at `/pokemon/25` and closing moves focus to the catalog heading and never leaves it on `document.body`; entering from a card click and closing still restores focus to that card — verify with `pnpm test` showing them failing (red)
- [x] 5.4 Extend `useAccessibleModal.ts` so that when the captured trigger is absent, is the document body, or is no longer in the document at close time, focus moves to the catalog heading instead, and make the 5.3 tests pass — verify with `pnpm test` showing all composable and modal tests green

## 6. Invalid Identifier Handling (TDD)

- [x] 6.1 Write failing tests asserting that loading `/pokemon/99999` with the detail request rejecting `NotFoundError` renders the modal's not-found error message with its retry action, that `router.currentRoute.value.fullPath` is still `/pokemon/99999` with no redirect having occurred, and that the catalog remains browsable after the modal is closed — verify with `pnpm test` showing them failing (red)
- [x] 6.2 Make the 6.1 tests pass by surfacing the store's per-entity error for the normalised key in the modal's existing typed error state, adding no redirect and no URL rewrite, and verify with `pnpm test`
- [x] 6.3 Verify with a test that a `RateLimitError` or `NetworkError` on a deep-linked URL renders that failure class's message and that retry re-issues the request for the same route parameter

_Commit boundary: groups 4–6 as one commit, or groups 4 and 5–6 as two if the combined diff approaches the 400-line CLAUDE.md limit._

## 7. Integration Verification

- [x] 7.1 Run `pnpm test`, `pnpm build` (vue-tsc typecheck), and `pnpm lint`, and verify all three complete with no errors
- [x] 7.2 Manually verify sharing and reloading in a browser: clicking a card changes the address to `/pokemon/<name>`, reloading that address reopens the same modal, pasting it into a new tab opens it cold, and middle-clicking a card opens the detail URL in a new tab
- [x] 7.3 Manually verify against `pnpm build && pnpm preview` — not only `pnpm dev` — that a hard reload of `/pokemon/25` serves the app rather than a 404, and record the static-host rewrite rule (unknown paths to `index.html`) that `createWebHistory` requires in deployment
- [x] 7.4 Manually verify with the devtools network tab that a cold load of `/pokemon/25` issues exactly one detail request and one catalog request, that the modal's content paints before the catalog finishes, and that visiting `/pokemon/pikachu` then `/pokemon/25` issues no second detail request
- [x] 7.5 Manually verify with the keyboard only and a screen reader: Enter on a focused card opens the modal, Escape closes it and focus returns to that card, a cold-entered modal returns focus to the catalog heading on close, Back and Forward open and close the modal correctly, and the page behind never stays scroll-locked after any close

## 8. Catalog Pagination Sync in the Store (TDD)

- [x] 8.1 Write failing tests in `src/stores/pokemonList.store.spec.ts` for a new `goToPageOf(key: string | number | null)` action covering: a numeric key matching an entry's `id` on the third page of the active filtered list sets `currentPage` to `3`; a lowercase-name key matching an entry's `name` does the same; a key absent from `filteredList` leaves `currentPage` at its prior value; a `null` key is a no-op — verify with `pnpm test` showing them failing (red)
- [x] 8.2 Write failing tests asserting the filtered-list definition of accessibility: a valid Pokémon excluded by an active `searchQuery` leaves `currentPage` unchanged, and a valid Pokémon excluded by an active `selectedType` leaves `currentPage` unchanged, even though both exist in `rawCatalogIndex` — verify with `pnpm test` showing them failing (red)
- [x] 8.3 Implement `goToPageOf` in `src/stores/pokemonList.store.ts` — find the index in `filteredList` by comparing a numeric key against `item.id` and a string key against `item.name`, compute `Math.floor(index / pageSize) + 1`, and delegate to the existing `goToPage`; return early on a `null` key or a missing index — with no `any` and no type assertions, and make the 8.1–8.2 tests pass with `pnpm test`
- [x] 8.4 Write a failing test asserting the sync does not pin the page — after `goToPageOf` moves `currentPage` to `3`, calling `setSearchQuery`, `setSearchMode` or `setTypeFilter` still resets `currentPage` to `1` — then confirm it passes with no change to those handlers, with `pnpm test`

## 9. Wiring the Pagination Sync to Route Resolution (TDD)

- [x] 9.1 Write failing tests in `src/views/PokemonDetailRoute.spec.ts` asserting that loading cold at a detail URL for a Pokémon on a later page of a loaded catalog advances `usePokemonListStore().currentPage` to that page, and that loading at `/pokemon/99999` with the detail request rejecting `NotFoundError` leaves `currentPage` unchanged — verify with `pnpm test` showing them failing (red)
- [x] 9.2 Write failing tests for the catalog-still-loading race: mounting at a detail URL with the catalog request pending leaves `currentPage` unchanged while the catalog status is `'loading'`, and once the catalog request resolves `currentPage` becomes that Pokémon's page; a catalog request that rejects drops the pending sync without surfacing an error in the modal — verify with `pnpm test` showing them failing (red)
- [x] 9.3 Call `goToPageOf(normalisedKey)` from the detail route's resolution path in `src/components/PokemonDetailModal/PokemonDetailModal.vue`, holding the key and deferring the call via a watcher on the catalog store's `status` when it is not yet `'success'`, so the sync runs exactly once per resolution and never reads catalog status into the modal's own loading or error state — make the 9.1–9.2 tests pass with `pnpm test`
- [x] 9.4 Write a failing test asserting a Back/Forward re-resolution of a detail route re-runs the sync for the newly matched Pokémon, and that changing the search query while the modal is open still resets `currentPage` to `1`, then make it pass — verify with `pnpm test`

## 10. Pagination Sync Verification

- [x] 10.1 Run `pnpm test`, `pnpm build` (vue-tsc typecheck), and `pnpm lint`, and verify all three complete with no errors
- [x] 10.2 Manually verify in a browser that pasting a detail URL for a Pokémon late in the catalog opens the modal over the page containing its card, that the same URL under an active search or type filter that excludes it leaves the catalog page where it was, and that typing in the search box afterwards returns to page 1

_Commit boundary: groups 8–9 as one commit (store action plus its route wiring), with group 10 folded into it._

