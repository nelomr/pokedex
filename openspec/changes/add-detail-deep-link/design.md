# Design

## Context

See proposal.md — Why. This change re-wires the slice delivered by `add-pokemon-detail-modal`: the modal, `BaseModal.vue`, `useAccessibleModal.ts`, and `pokemonDetail.store.ts` all already exist and are not rebuilt here. What changes is **what decides the modal is open**: local `selectedPokemon` state in the catalog parent becomes a route match.

Current state this design has to work with:

- `src/main.ts` mounts `App.vue` with Pinia only — there is no router instance and no `<router-view>` anywhere in the tree. `vue-router` (v5) is already a dependency in `package.json` but has never been used.
- `src/App.vue` is not a shell: it is the catalog screen. It owns `usePokemonListStore()`, the `onMounted` `initCatalog()` call, the retry handler, the search/type-filter handlers, and every branch of the catalog's idle/loading/error/empty/no-results/populated rendering.
- `src/App.spec.ts` mounts `App.vue` directly and asserts on `data-testid` hooks (`catalog-loading`, `catalog-error`, `catalog-empty`, …) that will live in the extracted view component after this change.
- `pokemonDetail.store.ts` (from `add-pokemon-detail-modal`, decision 2) already caches each entry under both its numeric ID and its lowercase name and exposes `getPokemonDetail(idOrName)`. That double keying was chosen precisely so this change could address a Pokémon by either URL form; it is consumed here, not modified.
- `usePokemonListStore().initCatalog()` is idempotent and self-guarding — it returns early when `status` is `'success'` or `'loading'` — so calling it from a new place cannot produce a duplicate catalog request.
- `PokemonCard.vue` currently renders a plain `<div>`; `add-pokemon-detail-modal` task 5.2 gives it a `select` emit and keyboard activation. This change decides whether that stays.

Constraints that shape the approach:

- **CLAUDE.md conventions:** Vue 3 `<script setup>` with strict TypeScript (no `any`, no `as unknown as T`), Pinia native only, Tailwind, Vitest + `@vue/test-utils`, multi-word PascalCase components with a `Base` prefix for UI-agnostic ones, type-based `defineProps`/`defineEmits` with reactive destructuring defaults, TDD, commits under 400 lines.
- **Accessibility stays normative.** The WAI-ARIA dialog requirements from `add-pokemon-detail-modal` do not relax because the opener became a URL. Focus restore, the focus trap, and the scroll lock must survive every new entry and exit path this change introduces — including the two it invents: a cold deep-link entry with no trigger element, and a Back/Forward navigation that opens or closes the modal without any user interaction inside the page.
- **The API is shared and rate-limited.** A deep link must not become a way to issue the whole-catalog request plus a detail request where one would have sufficed, and must not re-fetch a Pokémon already in the session cache.
- **Hexagonal separation.** The route parameter is a transport-level string. Normalising it into the key shape the store understands is a boundary concern, not something a component improvises inline.

## Goals / Non-Goals

**Goals:**

- A canonical, shareable, reloadable URL per Pokémon: `/pokemon/25` and `/pokemon/pikachu` both open that Pokémon's detail modal, on reload and from a pasted link.
- A cold-load path that resolves the detail directly from `pokemonDetail.store.ts` without waiting on the catalog list, so a deep link paints detail content as fast as the single detail request allows.
- Browser Back and Forward driving the modal's open/close state, with the accessibility machinery (focus trap, focus restore, scroll lock) correct on every one of those transitions.
- A defined, testable outcome for an invalid `:idOrName` in the URL — no blank screen, no silently swallowed `NotFoundError`, no lying URL.
- A router introduction that is a mechanical refactor of existing markup, reviewable on its own, before any deep-link behavior is added on top.

**Non-Goals:**

- Server-side rendering, prerendering, or any SEO work; this stays a client-rendered SPA.
- Route-driven state for search, type filter, or pagination. Those stay in `pokemonList.store.ts`, unserialised, exactly as `add-search-and-type-filter` left them; decision 11 moves `currentPage` *from* a resolved route, but the page is never written into the URL and is never read back out of it.
- Scroll-position restoration of the catalog across navigations beyond what keeping the parent mounted already gives for free.
- Route-level code splitting or lazy `import()` of views. The app is two routes; splitting is unearned complexity.
- Navigation guards that prefetch or block on detail data. Resolution happens in the component, not in a guard (decision 4).
- Any change to how detail data is fetched, cached, deduped, or mapped. `pokemonDetail.store.ts` and `pokemonMapper.ts` are consumed unchanged.

## Decisions

### 1. Nested route `/pokemon/:idOrName` under the catalog route, not `?detail=id`

The proposal left this open. It is now decided: the detail is a **child route** of the catalog route, and the catalog view renders a nested `<router-view>` in which the modal appears.

```
{ path: '/', component: PokemonCatalogView, children: [
    { path: 'pokemon/:idOrName', name: 'pokemon-detail', component: PokemonDetailModal, props: true }
] }
```

*Alternative considered:* a query parameter, `/?detail=25`, over a single flat catalog route. Rejected — a query parameter is a modifier of a collection view: it is how `?page=2`, `?type=fire`, or `?q=pika` are correctly expressed, because those genuinely describe *which slice of the list* is being shown. A specific Pokémon's detail is not a slice of the list; it is a distinct resource, and the canonical URL for a resource is a path. Encoding it as a query parameter makes `/?detail=25` and `/pokemon/25` disagree about what the application's addressable nouns are, and it is the harder shape to grow: a future `/pokemon/25/moves` is natural from a path and impossible from a filter parameter.

**The cost accepted with this choice, stated plainly:** the query-param shape had two real advantages that the nested route gives up. First, the catalog parent stays mounted behind the modal — with a nested route that is a requirement, not a side effect, so `PokemonCatalogView.vue` must never be unmounted by the child match and its list state must survive the child's whole lifetime. Second, close is no longer a trivial history pop of a parameter on the same route; it is a navigation back to the parent route, which forces decision 6 to think about where "back" actually goes when the user arrived by deep link and there is no prior entry. Both costs are contained and paid for in decisions below; neither is a surprise discovered later.

*Verified by:* a router test asserting that `/pokemon/25` matches the child route with `params.idOrName === '25'`, that the parent `PokemonCatalogView.vue` is mounted simultaneously with the child, and that navigating from `/pokemon/25` to `/pokemon/26` does not re-mount the parent.

### 2. `src/router/index.ts`, `createWebHistory`, wired in `src/main.ts`

The router lives in `src/router/index.ts`, not a flat `src/router.ts`.

*Alternative considered:* a single flat `src/router.ts`. Rejected on consistency, not on size: every other unit of this codebase that is a concern rather than a file lives in a folder — `src/stores/`, `src/services/`, `src/composables/`, `src/domain/`, `src/api/`. A flat `router.ts` would be the only top-level module beside `main.ts` and `App.vue`, and the route-name constants of decision 7 already want a second file next to the route table. `src/router/index.ts` keeps the import specifier (`./router`) identical either way, so this costs nothing and pre-empts the later move.

*Alternative considered:* `createWebHashHistory`. Rejected — hash URLs (`/#/pokemon/25`) are ugly to share and put the resource identity in a fragment the server never sees, which forecloses any future prerendering. `createWebHistory` is the right default; its only requirement is a dev/host rewrite of unknown paths to `index.html`, which Vite's dev server does by default for the history fallback and which is a one-line deploy configuration.

*Verified by:* `src/router/index.spec.ts` resolving `/pokemon/25` against the exported route table, plus the existing `pnpm build` typecheck proving `main.ts` wires `app.use(router)` before `mount`.

### 3. `App.vue` becomes a shell; the catalog markup moves to `PokemonCatalogView.vue`

`App.vue` is reduced to the application shell — the page chrome (the heading and the root layout wrapper) and a single top-level `<router-view />`. Every catalog concern currently in `App.vue` — the store instance, the `onMounted` init, `retry`, `handleQueryChange`, `handleSearchModeChange`, `handleTypeChange`, `isNoResults`, and all six rendering branches — moves verbatim into a new `src/views/PokemonCatalogView.vue`, which additionally renders the nested `<router-view />` for the detail child. The name satisfies CLAUDE.md §6 (multi-word, PascalCase); `App.vue` keeps its name under §6's explicit root exception.

This is a **pure refactor with no behavior change**, and it should be implemented and committed as one, before any deep-link behavior is layered on. Its most visible consequence is on tests: `src/App.spec.ts` mounts `App.vue` and asserts on the catalog's `data-testid` hooks, all of which now live one component down. That file must be renamed to `src/views/PokemonCatalogView.spec.ts` and re-targeted at the extracted component; because the extracted component is identical markup with identical store wiring, every existing assertion should pass unchanged once the mount target is swapped. `App.spec.ts` is not replaced by a new shell test — a shell whose only content is `<router-view />` has no behavior worth an isolated test, and the route-to-view wiring is covered by decision 2's router test and by the integration tests of decisions 5 and 6, which mount the real router.

*Alternative considered:* leaving the catalog markup in `App.vue` and giving the detail route a sibling top-level route. Rejected — the modal must render *over* a live catalog, so a sibling route would unmount the catalog on every deep-link open and force it to reload on every close, which is exactly the behavior decision 1 accepted a cost to avoid. Keeping `App.vue` as the catalog *and* the router host would also mean the component that must be swappable by the router is the one component the router cannot swap.

*Verified by:* moving `src/App.spec.ts` to `src/views/PokemonCatalogView.spec.ts` with its assertions unchanged and only the mount target swapped, and confirming the suite is green — a passing pre-existing suite against a new mount point is exactly the proof that this step changed no behavior.

### 4. Cold load resolves the detail directly from the store; the catalog initialises in parallel and never blocks

`PokemonDetailModal.vue` calls `getPokemonDetail(normalisedKey)` from its own `onMounted`/param watcher, and `PokemonCatalogView.vue` keeps calling `initCatalog()` from its `onMounted`. Because the nested route mounts parent and child together, a cold hit on `/pokemon/25` fires both. They are independent promises: the modal's loading state is bound to the **detail** entry's state only, and never reads `pokemonListStore.status`.

The catalog still initialises, rather than being deferred until the modal closes. Two reasons. First, the catalog is the visible page behind the modal and it is where the user lands the instant they close: deferring its load would make every deep-link close show a loading catalog, converting a background fetch the user never waited on into a foreground wait they do. Second, suppressing it would require the catalog view to know it was mounted under a child route — coupling a parent's data loading to which child happens to be matched, which is the coupling the separate stores exist to prevent. The parallelism costs one extra concurrent request on the cold path, against an endpoint the catalog would have hit a few hundred milliseconds later anyway.

*Alternative considered:* a `beforeEnter` navigation guard resolving the detail before the route commits. Rejected — a guard delays the URL change and the paint until the request settles, so a deep link would show the previous page (or nothing, on a fresh load) for the whole request duration instead of showing the modal's skeleton immediately. It would also duplicate the store's loading/error/dedupe handling in a second place, and `add-pokemon-detail-modal` decision 9 already built a content-shaped skeleton for exactly this wait.

*Alternative considered:* making the detail request wait for `initCatalog()` so the Pokémon's name could be read out of the catalog index. Rejected — the detail response carries the name itself, so the dependency buys nothing and would serialise a ~1MB catalog download in front of every deep link.

*Verified by:* a test mounting the app at `/pokemon/25` with the catalog request left permanently pending, asserting the modal reaches its loaded state and renders the detail content while `pokemonListStore.status` is still `'loading'`.

### 5. The route param is normalised at the router boundary, onto the store's existing double-keyed cache

A single exported helper — `normalizeDetailKey(raw: string): string | number | null` — converts the raw param once: a string of digits only becomes a `number`; anything else is `trim()`ed and lowercased into a `string`; an empty or whitespace-only value yields `null`. `PokemonDetailModal.vue` passes the result to `getPokemonDetail`, which is why `/pokemon/PIKACHU`, `/pokemon/Pikachu`, and `/pokemon/pikachu` all hit the same cache entry, and why `/pokemon/25` hits the entry `/pokemon/pikachu` already populated — the store keys each loaded detail under both its numeric ID and its lowercase name (`add-pokemon-detail-modal` decision 2), so either URL form resolves to the same object with at most one request per Pokémon per session.

Leading zeros are deliberately *not* stripped: `025` parses to the number `25` under `Number()`, which is the desired collapse, so no separate rule is needed. A numeric-looking name is not a reachable case — PokéAPI names are never all-digits.

*Alternative considered:* passing the raw param straight to the store and normalising inside `getPokemonDetail`. Rejected — the store's key contract is `string | number` and it is already consumed by the modal's non-router callers; pushing URL-shaped cleanup into it would make the store responsible for a transport format it otherwise never sees, which is the hexagonal boundary CLAUDE.md §4 draws. Keeping it in one exported function also makes it unit-testable without a store or a router.

*Alternative considered:* two route patterns with regex constraints, `/pokemon/:id(\\d+)` and `/pokemon/:name`. Rejected — it doubles the route table and the route names to express a distinction the store deliberately erased, and it moves a parsing rule into route-matcher syntax where it cannot be unit-tested directly.

*Verified by:* `normalizeDetailKey` unit tests asserting `'25' → 25`, `'025' → 25`, `'PIKACHU' → 'pikachu'`, `' Pikachu ' → 'pikachu'`, `'' → null`; plus a store-level test asserting that visiting `/pokemon/pikachu` then `/pokemon/25` issues exactly one detail request.

### 6. `NotFoundError` renders the error state inside the modal and leaves the URL untouched

An unresolvable `:idOrName` — `/pokemon/99999`, `/pokemon/pikchu` — resolves the route (the pattern matches any string), issues the detail request, and surfaces the resulting `NotFoundError` in the modal's existing error state, with its existing retry action. The URL is **not** rewritten, and there is no redirect to `/`.

*Alternative considered:* a redirect to the catalog route (with or without a toast). Rejected on three counts. The URL is the user's evidence of what they asked for: rewriting it destroys the thing they would correct or re-share, and makes a typo silently indistinguishable from having clicked a link to the home page. A redirect also throws away the distinction the `AppError` hierarchy exists to preserve — a `NetworkError` or a `RateLimitError` on the same URL is transient and retryable, and a redirect that fires on `NotFoundError` alone means the modal must handle both an in-place error path and a navigate-away path for what is one request failing. Finally, `add-pokemon-detail-modal` already specifies a typed error state with retry for exactly these three classes; reusing it costs nothing, while a redirect is new behavior that contradicts it.

*Alternative considered:* a catch-all `/:pathMatch(.*)*` 404 route. Rejected for this case — it is the right tool for a path that matches no route at all (`/pokemonz`), not for a path that matched correctly and whose *resource* is missing. Those are different failures and conflating them would put a network-transient failure on a 404 screen. A catch-all route redirecting unmatched paths to `/` is fine and orthogonal; it is not how a bad `:idOrName` is handled.

*Verified by:* a test navigating to `/pokemon/99999` with the detail request rejecting `NotFoundError`, asserting the modal renders the not-found error message with a retry control, that `router.currentRoute.value.fullPath` is still `/pokemon/99999`, and that the catalog behind remains browsable.

### 7. Close is `router.push` to the named parent route, never `router.back()`

Every dismissal path — Escape, the close control, the backdrop click — resolves to one handler that performs `router.push({ name: 'pokemon-catalog' })`.

*Alternative considered:* `router.back()`. Rejected — it is correct only when the modal was opened by a forward navigation from within the catalog, and this change's entire purpose is to make the other case, a cold deep-link entry, a first-class one. On a deep-link entry the detail route is the **first** entry in the application's history: `router.back()` there either does nothing (the user presses Escape and the modal stays open, which reads as a broken dialog) or leaves the application entirely for whatever page preceded it, which is a far worse outcome than doing nothing. `router.push` to the parent route is correct in both cases, at the cost of one extra history entry when the user entered from the catalog — a cost that is invisible in the UI and strictly preferable to a dismissal that sometimes does not dismiss.

*Alternative considered:* branching — `router.back()` when a history entry exists, `push` otherwise, gated on something like `window.history.state.back`. Rejected — it makes the most safety-critical interaction in the dialog (Escape must always close) conditional on ambient browser state that is awkward to assert in jsdom, to save a history entry nobody sees.

*Verified by:* a test mounting the app directly at `/pokemon/25` with no prior history entry, pressing Escape, and asserting the route is now `/` with the catalog visible and the modal unmounted; and a second test entering `/` → card → `/pokemon/25` → Escape asserting the same end state.

### 8. Back/Forward drive the modal through the route match; `useAccessibleModal` is driven by mount, not by a click

Because `PokemonDetailModal.vue` is the child route's component, a Back from `/pokemon/25` to `/` unmounts it and a Forward re-mounts it. No popstate listener is written: the router's own history integration is the mechanism.

This works only because `useAccessibleModal`'s lifecycle is tied to the component's open/mount lifecycle rather than to the interaction that caused it, which is how `add-pokemon-detail-modal` decision 4 already built it — focus is captured and moved in on open, the trap and the document listeners are installed on open, and the scroll lock plus every listener is torn down on close **and on unmount**. That unmount teardown is the load-bearing detail here: a Back navigation closes the modal without any close handler running, so a composable that only cleaned up in its `close` path would leave `<body>` with `overflow: hidden` and the page permanently unscrollable after one Back press. The existing `onUnmounted` teardown covers it; this change adds the test that pins it.

*Alternative considered:* a `popstate` listener or a `router.afterEach` hook explicitly closing the modal. Rejected — it would be a second source of truth for "is the modal open" racing the route match, and the class of bug it invites is the modal closing while the URL still says it is open.

*Verified by:* a test navigating `/` → `/pokemon/25` → `router.back()` asserting the modal is unmounted, `document.body.style.overflow` is restored to its pre-open value, and no document keydown listener remains; then `router.forward()` asserting the modal re-opens with focus inside it.

### 9. Focus restore falls back to the modal's close control, then to the catalog heading, when there is no trigger

`add-pokemon-detail-modal` requires focus to return to the triggering card on close. On a cold deep-link entry there is no trigger — the modal mounted from a URL, so nothing in the page has focus and `document.activeElement` is `<body>`. `useAccessibleModal` captures the trigger as whatever was focused at open time; when that capture is absent, `<body>`, or an element no longer in the document at close time, focus on close moves instead to the catalog view's `<h1>`, made programmatically focusable with `tabindex="-1"`.

The heading is the right fallback rather than the first card: it is the page's own landmark, so a screen reader user lands at the top of the view they were just returned to and can navigate forward from a known point, whereas landing on card #1 falsely implies a relationship between the Pokémon they were viewing and the first item in an unrelated list. Focus must go *somewhere* deliberate — leaving it on `<body>` drops keyboard users to the top of the document's tab order with no announcement, which is the failure mode this fallback exists to prevent.

*Alternative considered:* focusing the card matching the Pokémon that was open. Rejected — on a cold entry that card frequently does not exist in the DOM at all: the catalog may still be loading, and even loaded, the Pokémon may sit on a different page of the paginated list or be excluded by an active filter. A fallback that is conditional on the target existing needs a further fallback anyway.

*Alternative considered:* leaving focus unmanaged when there was no trigger. Rejected — it is precisely the "focus is lost to `<body>`" failure the WAI-ARIA dialog pattern names, and it would appear only on the deep-link path, i.e. the one this change introduces.

*Verified by:* a test entering cold at `/pokemon/25`, closing the modal, and asserting `document.activeElement` is the catalog heading; and the existing trigger-restore test from `add-pokemon-detail-modal`, re-run through the router path, asserting focus returns to the originating card when there was one.

### 10. `PokemonCard.vue` becomes a `RouterLink`, replacing its `select` emit

The card renders `<RouterLink :to="{ name: 'pokemon-detail', params: { idOrName: item.name } }">` as its root, and its `select` emit is removed rather than kept alongside.

*Alternative considered:* keeping the `select` emit and having `PokemonCatalogView.vue` call `router.push` in the handler. Rejected — a JavaScript-only click handler produces no `href`, and an element with no `href` cannot be middle-clicked into a new tab, cannot be Cmd/Ctrl-clicked, has no "Open in new tab" or "Copy link address" context menu, and is invisible to anything that scans the page for links. For a change whose entire stated purpose is making detail URLs shareable, shipping a catalog where no detail URL can be copied from a card would defeat the feature at its primary entry point. `RouterLink` also deletes hand-written accessibility: the anchor is natively focusable and Enter-activated, so the `tabindex`, `role`, and Enter/Space keydown handling that `add-pokemon-detail-modal` task 5.2 added exist only to emulate what an anchor already is. One caveat inherited from the platform: a native anchor activates on Enter but **not** on Space, so the card's keyboard behavior changes slightly; this is standard link semantics and is the correct behavior for an element that navigates, so it is adopted rather than patched over with a Space handler.

*Alternative considered:* keeping the emit and *also* wrapping in a link. Rejected — two activation paths for one gesture, one of which fires a navigation and one of which fires a handler, is a double-navigation bug waiting for the first time both are wired.

The param is the Pokémon's lowercase name rather than its numeric ID, because a shared `/pokemon/pikachu` is self-describing where `/pokemon/25` is not; decision 5 makes both forms resolve identically, so this is purely a choice about which URL the application *generates*.

*Verified by:* a component test asserting the card's rendered root is an anchor whose `href` is `/pokemon/<name>`, that it emits no `select` event, and a view-level test asserting a click on a card navigates to the detail route and opens the modal.

### 11. A resolved deep link advances the catalog to the page holding that Pokémon, but only when it is present in `filteredList`

When a detail route resolves successfully, the catalog's `currentPage` moves to the page containing that Pokémon **in the currently active, already-filtered list**. "Accessible" is defined as *present in `filteredList` as it stands* — not present in `rawCatalogIndex`. If the Pokémon is absent from `filteredList` for any reason at all — an invalid or 404 identifier that resolves to nothing, or a perfectly valid Pokémon that the active search query or type filter excludes — the sync is a no-op and the catalog stays on whatever page it was already on. The two cases are deliberately indistinguishable in behavior: from the list's point of view, a Pokémon that is filtered out is exactly as unreachable as one that does not exist.

The match is by index into `filteredList`, which holds mapped `PokemonCardItem`s (`{ id: number | null, name: string, spriteUrl: string | null }`) in the raw catalog's order. The normalised key from `normalizeDetailKey` is `string | number | null`, so the predicate is two-branched and needs no further parsing: a `number` key is compared against `item.id`, a `string` key against `item.name` (both already lowercase — the mapper preserves PokéAPI's lowercase names and decision 5 lowercases the key), and a `null` key short-circuits to a no-op. `item.id` may be `null` when `extractIdFromUrl` fails, which simply means that entry never matches a numeric key. With the index in hand the page is `Math.floor(index / pageSize) + 1`, fed through the existing `goToPage`, whose clamping remains the single place a page number is validated.

*Alternative considered:* defining "accessible" against the unfiltered `rawCatalogIndex`, i.e. advancing to the page the Pokémon would occupy if nothing were filtered. Rejected — with an active filter that excludes the Pokémon, that page index does not even address the same list, so the user lands on an arbitrary page of the filtered results and the highlighted card is nowhere on it. Even if the index were translated correctly, the outcome would be a jump to a page that demonstrably does not contain the thing the jump was for, behind a filter that still excludes it. That defeats the entire purpose of the sync, which is to show the user *where this Pokémon sits in the list they are looking at*. Doing nothing is honest; jumping to a page that cannot show the card is confusing.

*Alternative considered:* clearing the active search query and type filter so the Pokémon becomes visible, then jumping. Rejected — a URL that addresses one resource would then silently destroy state the user deliberately set in another view, and it is unrecoverable: the previous filter is not stored anywhere to restore. A deep link may move the user's position in a list; it may not throw away the list they chose.

*Verified by:* store tests over `pokemonList.store.ts` asserting that syncing to a Pokémon on the third page of the active filtered list sets `currentPage` to `3`; that syncing to an identifier absent from `filteredList` leaves `currentPage` at its prior value; that a valid Pokémon excluded by an active `searchQuery` and one excluded by an active `selectedType` each leave `currentPage` unchanged; and that a `null` key is a no-op.

### 12. The sync is a store action called once per resolution, deferred until the catalog is loaded, and never re-applied

**Where it lives.** The logic is a store action on `pokemonList.store.ts` — `goToPageOf(key: string | number | null): void` — not a computation in the view or the modal. Finding an item's position in the catalog list and choosing a page from it is catalog-list domain logic: it reads `filteredList`, `pageSize` and `totalPages`, and its only effect is on `currentPage`, all of which the store already owns. The caller is the route-resolution path — the same watcher in `PokemonDetailModal.vue` that already observes the normalised key and the detail's resolved state — and it passes the key and nothing else.

*Alternative considered:* computing the index and calling `goToPage` from `PokemonCatalogView.vue` or from the modal directly. Rejected — it would put a reducer over the store's own filtered collection outside the store, where it cannot be unit-tested without mounting a component, and it would have to reach into `filteredList` and `pageSize` from the outside to do work the store is the authority on. That is precisely the infrastructure/domain leak CLAUDE.md §4 draws the line against, and with two plausible callers (the cold deep-link path and a Back/Forward re-resolution) it would be duplicated logic on day one.

**Timing.** Decision 4 has the catalog and the detail loading in parallel, so on a cold deep link the detail routinely resolves while `rawCatalogIndex` is still empty. `filteredList` is then empty and meaningless, and a sync run at that moment would find no match and correctly — but uselessly — do nothing. The sync is therefore deferred: when the catalog's `status` is not yet `'success'` at resolution time, the pending key is held and the sync runs once when a watcher over the catalog status sees `'success'`. If the catalog ends in `'error'`, there is no list to page through and the pending sync is simply dropped. The detail's own loading and error states remain entirely independent of the catalog's status, exactly as decision 4 and its spec requirement state — the deferral governs only when `currentPage` moves.

*Alternative considered:* awaiting `initCatalog()` before resolving the detail so the list is always ready. Rejected outright — it is the serialisation decision 4 explicitly refused, and it would trade a fast first paint for a cosmetic page number.

**One-shot, not pinned.** The sync fires on a resolution — a cold deep-link load, or a Back/Forward that re-resolves a detail route — and then relinquishes control of `currentPage` entirely. It does not pin the page to the open Pokémon. The existing filter handlers (`setSearchQuery`, `setSearchMode`, `setTypeFilter`) keep resetting `currentPage` to `1` unchanged, and ordinary pagination controls keep working while the modal is open. A user who lands on Pikachu's page by deep link and then types in the search box gets page 1 of the new results, as they always did.

*Alternative considered:* a computed "page of the currently open Pokémon" that continuously drives `currentPage` while a detail route is matched. Rejected — it would make the catalog's pagination unusable behind an open modal (every manual page change would be snapped back), and it would fight the filter handlers' page reset, giving `currentPage` two authorities. A one-shot action leaves exactly one writer at any moment.

*Verified by:* a route-level test mounting cold at `/pokemon/<name>` with the catalog request still pending, asserting `currentPage` is unchanged while the catalog is loading and becomes the Pokémon's page once the catalog resolves; a test asserting a catalog request that fails leaves `currentPage` at `1` with no error surfaced from the sync; and a store test asserting that after a sync to page `3`, calling `setSearchQuery` or `setTypeFilter` resets `currentPage` to `1`.

## Risks / Trade-offs

- **[`createWebHistory` 404s on a hard reload of `/pokemon/25` unless the host rewrites unknown paths to `index.html`]** → Vite's dev server already does this, so it will not be caught in development — which is exactly why it is a risk rather than a non-issue. It is a one-line static-host rewrite rule, and it is listed as an explicit manual verification step against `pnpm build && pnpm preview` in tasks, not left to be discovered in production.
- **[The `App.vue` → `PokemonCatalogView.vue` extraction touches the largest existing spec file and is pure churn if it goes wrong]** → Mitigated by sequencing: the refactor is its own task group and its own commit, with the moved spec's assertions unchanged so that a green suite against the new mount point is itself the proof that nothing changed. Any assertion that has to be edited to pass is a signal that the move was not faithful.
- **[Parent and child mount together on a cold deep link, so two requests go out where a query-param design over a non-loading catalog might have issued one]** → Deliberate (decision 4). The catalog request is one the user is about to need the instant they close the modal, the detail request does not wait on it, and `initCatalog()`'s own early return guarantees the pair is issued at most once per session.
- **[Close pushing to the parent route grows the history stack, so repeated open/close from the catalog leaves a run of entries the user must Back through]** → Accepted as the price of decision 7. The alternative is a dismissal that fails to dismiss on a deep-link entry, which is a correctness bug in a dialog; a longer history is a mild annoyance in a case where Back still lands on a valid catalog view every time. `router.replace` was not chosen instead because it would break the Back/Forward symmetry decision 8 depends on.
- **[The modal's open state now has two authorities in the codebase's history — the route, and the `selectedPokemon` local state it replaces]** → The local state is deleted in the same task group that introduces the route, not deprecated alongside it. Leaving both would allow a state where the modal is open and the URL says otherwise, which is the bug class this change exists to close.
- **[Focus restore to the heading is a compromise that satisfies no user perfectly]** → It is a fallback for a path that otherwise has no answer at all (decision 9). The trigger-restore path is unchanged and still exercised for the ordinary card-click case, so the compromise applies only where the alternative is losing focus entirely.
- **[Turning the card into an anchor changes its keyboard contract: Space no longer activates it]** → This is native link behavior and is what a keyboard user of a link expects; the previous Space handling existed only because the card was a `<div>` pretending to be interactive. It is called out in the spec as an explicitly changed scenario rather than being left as an unannounced regression in the existing keyboard test.
- **[A deep link now moves the catalog's page, so the state behind the modal is not the state the user left]** → Bounded by decisions 11 and 12: only `currentPage` moves, never the search query or the type filter, and only when the Pokémon is already visible in the active `filteredList`. The move is a one-shot on resolution, so any later filter change resets to page 1 exactly as before. A deep link still never mutates another view's *filters*; it only scrolls the already-filtered list to where the opened Pokémon sits.
