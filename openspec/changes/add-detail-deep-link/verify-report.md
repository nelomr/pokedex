# Verification Report: add-detail-deep-link

## Summary Scorecard

| Dimension | Result |
|---|---|
| Completeness | 34/39 tasks complete (5 remaining, all manual-browser-only: 7.2, 7.3, 7.4, 7.5, 10.2) |
| Correctness | PASS — every automated requirement/scenario has covering, passing tests |
| Coherence | PASS — implementation matches all 12 design decisions with no deviation |
| Tests | 160/160 passing (18 files) |
| Build | `vue-tsc -b && vite build` — clean, no errors |
| Lint | `eslint . && prettier --check .` — clean |

## Completeness

Ran `openspec instructions apply --change add-detail-deep-link --json`: 34/39 tasks marked done, 5 unchecked:

- `7.2` — manual browser verification of share/reload/paste/middle-click behavior
- `7.3` — manual `pnpm build && pnpm preview` hard-reload verification (createWebHistory rewrite)
- `7.4` — manual devtools network-tab verification of request counts
- `7.5` — manual keyboard/screen-reader verification
- `10.2` — manual browser verification of pagination sync on paste

All 5 are explicitly "Manually verify..." tasks requiring a live browser/screen-reader session, which an agent cannot execute. `10.2` was called out by the task brief as an expected, intentionally-unchecked manual item; the same reasoning applies identically to `7.2`–`7.5` — they are the same class of task (manual browser/AT verification), gated behind automated task groups (`7.1`, `10.1`) that ARE checked and passing. Treated as WARNING (expected/deferred to human), not CRITICAL.

## Correctness — Requirement/Scenario Compliance Matrix

### `specs/pokemon-detail-deep-link/spec.md`

| Requirement | Scenario | Evidence | Status |
|---|---|---|---|
| Canonical detail URL | numeric/name match, catalog stays mounted, no remount on nav | `src/router/index.ts:9-22` (nested route), `src/router/index.spec.ts` | PASS |
| Cold resolution of a deep link | resolves independent of catalog status | `PokemonDetailModal.vue:33-45` (`detail`/`isLoading` derived only from `detailStore`, never `listStore.status`) | PASS |
| Route parameter normalisation | digits→number, else trim+lowercase, empty→null | `src/services/detailRouteKey.ts:3-15`, `detailRouteKey.spec.ts` | PASS |
| Invalid identifier in the URL | NotFoundError renders in-modal, URL untouched | `PokemonDetailModal.vue:36-38,128-142` (`requestError` branch, no router.push on error) | PASS |
| Catalog cards link to detail URL | anchor root, no `select` emit | `PokemonCard.vue:2,24-25` (`RouterLink` root, no `defineEmits`) | PASS |
| History navigation drives the modal | Back/Forward via route match, teardown on unmount | `useAccessibleModal.ts:162-164` (`onUnmounted` calls `detach()`) | PASS |
| Catalog pagination follows a resolved deep link | `goToPageOf`, deferred sync, one-shot, no filter mutation | `pokemonList.store.ts:108-122` (`goToPageOf`), `PokemonDetailModal.vue:65-107` (`syncPageFor` + status watcher) | PASS |

### `specs/pokemon-detail/spec.md` (MODIFIED)

| Requirement | Evidence | Status |
|---|---|---|
| Open the detail modal from a catalog card (via route, not local state) | `PokemonCard.vue` RouterLink; `App.vue` has no `selectedPokemon`; store dedupe via `detailStore.getPokemonDetail` cache/loadingIds | PASS |
| Focus management (trap, restore, fallback to catalog heading) | `useAccessibleModal.ts:123-133` (`resolveFocusTarget` fallback to `[data-testid="catalog-heading"]`); `PokemonCatalogView.vue:56-57` heading has `tabindex="-1"` + testid | PASS |
| Dismissal (Escape/close/backdrop → router.push, never router.back) | `PokemonDetailModal.vue:109-111` (`handleClose` → `router.push({name: pokemon-catalog})`); `grep` confirms no `router.back()`/`history.back()` anywhere in `src/` | PASS |

All scenarios above are backed by passing tests in the 160-test, 18-file suite (`pnpm test` exit 0). Full file-by-file spec-to-test mapping cross-checked via task descriptions 1.1–9.4, all marked done and consistent with code.

## Coherence — Design Decisions 1–12

| # | Decision | Code check | Result |
|---|---|---|---|
| 1 | Nested route, not query param | `router/index.ts` — `pokemon/:idOrName` child of `/` | Match |
| 2 | `src/router/index.ts`, `createWebHistory`, wired in `main.ts` | confirmed; `routeNames.ts` present | Match |
| 3 | `App.vue` reduced to shell; catalog moved to `PokemonCatalogView.vue` | `App.vue` is now just `<router-view />` wrapper | Match |
| 4 | Cold load resolves detail independent of catalog; both init in parallel | `PokemonDetailModal.vue` never reads `listStore.status` for its own loading/error/detail; `PokemonCatalogView` still calls `initCatalog()` | Match |
| 5 | `normalizeDetailKey` at router boundary | `detailRouteKey.ts` | Match |
| 6 | `NotFoundError` renders in modal, URL untouched | confirmed, no redirect/rewrite in `handleClose`/error path | Match |
| 7 | Close = `router.push` to named route, never `router.back()` | confirmed via grep, single `handleClose` used for all 3 dismissal paths (via `BaseModal`'s `@close`) | Match |
| 8 | Back/Forward via route match; teardown on unmount, not just close | `useAccessibleModal.ts` `onUnmounted` → `detach()` | Match |
| 9 | Focus fallback: trigger → catalog heading | `resolveFocusTarget()` | Match |
| 10 | `PokemonCard` becomes `RouterLink`, `select` emit removed | confirmed | Match |
| 11 | `goToPageOf` matches against `filteredList` (not `rawCatalogIndex`) | `pokemonList.store.ts:113-115` uses `filteredList.value.findIndex` | Match |
| 12 | Sync is a store action, deferred until catalog `'success'`, one-shot, never pins page | `PokemonDetailModal.vue:65-107` `syncPageFor` + status watcher; filter handlers still independently reset `currentPage` to 1 (verified by task 8.4/9.4 tests) | Match |

No design deviations found.

## Issues

### CRITICAL
None.

### WARNING
1. **Tasks 7.2, 7.3, 7.4, 7.5, 10.2 remain unchecked** — all are manual browser/screen-reader/network-tab verification steps that cannot be executed by an automated agent. The task brief explicitly treats 10.2 this way; the same treatment is extended to 7.2–7.5 since they are the same class of task, gated behind passing automated groups (7.1, 10.1). Recommendation: run these manually before archiving, or explicitly accept the risk (the `createWebHistory` static-host rewrite rule in particular, task 7.3, is a real deployment risk called out in design.md's Risks section) and record the outcome in the change notes.

### SUGGESTION
1. No standalone `PokemonDetailRoute.vue` view exists even though `PokemonDetailRoute.spec.ts` is named as if testing one — the route component is `PokemonDetailModal.vue` directly (per design decision 1's route table, `component: PokemonDetailModal`). This is consistent with the design and not a defect, but the spec filename is slightly misleading; no action required.

## Final Assessment

**Ready for archive**, contingent on the 5 outstanding manual verification tasks (7.2–7.5, 10.2) being performed by a human before or shortly after archive — particularly 7.3 (the `createWebHistory` static-host rewrite), which is a genuine deployment risk documented in design.md and not verifiable by automated tooling. All automated tests (160/160), build, and lint pass cleanly, and the implementation is fully coherent with proposal, specs, and design with zero deviations found.
