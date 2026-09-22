## Context

`PokemonCatalogView.vue` renders one of six UI states through a `v-if` / `v-else-if` chain. The store exposes only four statuses (`CatalogStatus = idle | loading | success | error`); the remaining distinctions (`empty`, `noResults`, `populated`) are derived from `rawCatalogIndex` and `filteredList`. The `idle` status currently renders nothing. Retry is implemented in the view by writing `store.status = "idle"` so that `initCatalog()`'s guard lets a new load through.

```
store.status ──┬── idle     ─────────────────────────▶ (nothing today → loading)
               ├── loading  ─────────────────────────▶ Loading
               ├── error    ─────────────────────────▶ Error + Retry
               └── success ─┬─ rawCatalogIndex = 0 ─▶ Empty
                            ├─ filteredList   = 0 ─▶ NoResults
                            └─ otherwise         ─▶ Populated
```

`PokemonCatalogView.spec.ts` asserts on `data-testid` hooks (`catalog-loading`, `catalog-error`, `catalog-retry`, `catalog-empty`, `catalog-no-results`, `catalog-populated`) and is the regression net for this refactor.

## Goals / Non-Goals

**Goals:**
- Resolve the UI state in one pure, typed, unit-testable place.
- Render states through an exhaustive map + `<component :is>` instead of template branching.
- Keep the view as the container and state components presentational.
- Remove direct store-state mutation from the view.

**Non-Goals:**
- Changing store statuses, filtering, pagination, or error classification.
- Visual redesign of any state (markup and classes are moved, not restyled).
- Handling the type-filter error banner (stays as-is in the view).

## Decisions

### D1. Derived `CatalogViewState`, resolved in the view layer
`CatalogViewState = 'idle' | 'loading' | 'error' | 'empty' | 'noResults' | 'populated'` and `resolveCatalogViewState({ status, totalCount, filteredCount })` live in `src/views/catalogViewState.ts`, next to the view. The view wraps it in a `computed`.
- *Alternative:* a store getter. Rejected: it leaks UI concepts (`noResults` vs `empty`) into the store.
- *Alternative:* keying the map on `store.status`. Rejected: `success` would still need nested conditionals.
- *Verification:* unit tests on `resolveCatalogViewState` for each of the six outputs, especially the `success` sub-cases.

### D2. Exhaustive map of `{ component, props?, listeners? }`
The view builds `Record<CatalogViewState, StateEntry>` inside a `computed`, so props stay reactive. `Record` forces a compile error if a new state is added without an entry. `idle` maps to the same entry as `loading`.
- *Alternative:* store-connected child components with a component-only map. Rejected: breaks container/presentational separation.
- *Alternative:* named slots per state. Rejected: keeps one template block per state in the view, which is what we are removing.
- *Verification:* type-check (`pnpm build`) plus the existing view spec covering every state.

### D3. Presentational `CatalogStateRenderer`
A thin component receiving `entry: StateEntry` and rendering `<component :is="entry.component" v-bind="entry.props" v-on="entry.listeners ?? {}" />`. It holds no store or routing knowledge.
- *Verification:* covered through the view spec; no dedicated test (pure wiring).

### D4. State components
| Component | Props | Emits | testid |
|---|---|---|---|
| `CatalogLoadingState` | — | — | `catalog-loading` |
| `CatalogErrorState` | `message: string` | `retry` | `catalog-error`, `catalog-retry` |
| `BaseEmptyState` | `message: string`, `testId: string` | — | `catalog-empty` / `catalog-no-results` |
| `CatalogPopulatedState` | `items`, `currentPage`, `totalPages` | `prev`, `next` | `catalog-populated` |

`BaseEmptyState` is generic (Base prefix) and receives its `data-testid` via prop so both empty variants keep their existing hooks.
- *Verification:* one spec for `CatalogErrorState` asserting it emits `retry` on click; the rest are covered by the view spec.

### D5. `retryCatalog()` store action
Resets `status`/`error` and calls `initCatalog()` only when the current status is `error`. The view's `retry` handler becomes `store.retryCatalog()`.
- *Verification:* store spec — retry from `error` issues a new request and moves to `loading`; retry from `success` issues no request.

## Risks / Trade-offs

- [`idle` now shows the loading UI] → Intentional and captured in the spec delta; tests assert the loading hook before the request resolves.
- [`v-on` with an object map is less idiomatic than `@event`] → Confined to `CatalogStateRenderer`; listeners are typed in `StateEntry`.
- [Loose typing of `props` in `StateEntry` weakens prop checking] → Type each entry with the component's props (e.g. `ComponentProps<typeof X>`) where feasible; the view spec catches runtime mismatches.
- [Refactor regressions] → Existing `PokemonCatalogView.spec.ts` must stay green without edits to its assertions.
