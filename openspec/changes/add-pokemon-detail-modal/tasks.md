# Tasks

## 1. Contracts

- [x] 1.1 Add the raw detail DTO contracts to `src/api/pokeApi.dto.ts` (`PokemonDetailResponseDTO` with `id`, `name`, `height`, `weight`, `types`, `abilities`, `stats`, `sprites`, each nested shape `DTO`-suffixed) and verify `pnpm build` typechecks with no `any` and no type assertions
- [x] 1.2 Add the `PokemonDetail` domain model to `src/domain/pokemon.types.ts` (`id`, `name`, `types: string[]`, `abilities: string[]`, `stats: { name, value }[]`, `heightMeters: number | null`, `weightKilograms: number | null`, `artworkUrl: string | null`) plus the per-entity detail status type, and verify `pnpm build` typechecks

## 2. Mapper (TDD)

- [x] 2.1 Write failing tests in `src/services/pokemonMapper.spec.ts` for `mapToPokemonDetail` covering: `height: 7` maps to `heightMeters: 0.7` and `weight: 69` maps to `weightKilograms: 6.9`; an absent height or weight maps to `null`; a non-finite value maps to `null` and never `NaN`; type and ability names are flattened to plain string arrays in response order; each stat maps to a `{ name, value }` pair — verify with `pnpm test` showing the new tests failing (red)
- [x] 2.2 Implement `mapToPokemonDetail` in `src/services/pokemonMapper.ts` (decimetre/hectogram → SI conversion, null-guarded numeric handling, flattening of nested named resources, artwork URL reusing `buildSpriteUrl`) to make the 2.1 tests pass — verify with `pnpm test` showing all mapper tests green

## 3. Detail Store (TDD)

- [x] 3.1 Write failing tests in `src/stores/pokemonDetail.store.spec.ts`, each with a fresh `createPinia()` and a mocked `httpGet`, covering: a first `getPokemonDetail(id)` issues exactly one request and populates the cache; a second call for the same key issues no further request; a Pokémon loaded by name is retrievable by its numeric ID with no additional request (and vice versa); two concurrent calls for the same key collapse into exactly one request via `loadingIds`; a rejected request records the thrown `AppError` subclass under that key in `errors` while leaving other keys' cached values and errors untouched; a retry after a failure issues a new request and clears that key's error on success — verify with `pnpm test` showing the new tests failing (red)
- [x] 3.2 Implement `src/stores/pokemonDetail.store.ts` as a Pinia setup store (`cache: Map<string | number, PokemonDetail>` double-keyed by ID and lowercase name, `loadingIds: Set`, `errors: Map`, and a `getPokemonDetail(idOrName)` action returning from cache without a network call on a hit) to make the 3.1 tests pass — verify with `pnpm test` showing all detail store tests green
- [x] 3.3 Verify with a store test that a failed detail request leaves `usePokemonListStore().status` at `'success'` and its `error` at `null`, proving detail failures are scoped away from the catalog

_Commit boundary: groups 1–2 (contracts + mapper) as one commit, group 3 (store) as a second, to stay under the 400-line CLAUDE.md limit._

## 4. Accessibility Composable (TDD)

- [x] 4.1 Write failing tests in `src/composables/useAccessibleModal.spec.ts` against a container of known focusable elements covering: focus moves to the first focusable element on open; Tab from the last focusable element wraps to the first; Shift+Tab from the first wraps to the last; Escape triggers the close callback; a click outside the modal surface triggers close while a click inside does not; focus is restored to the recorded trigger element on close; every `document` listener added on open is removed on close and on unmount — verify with `pnpm test` showing the new tests failing (red)
- [x] 4.2 Write failing tests in the same spec for the scroll lock covering: `body` receives `overflow: hidden` and a `padding-right` equal to the measured scrollbar width on lock; both properties are restored to their pre-lock values on unlock — verify with `pnpm test` showing them failing (red)
- [x] 4.3 Implement `src/composables/useAccessibleModal.ts` (focusable-element query filtering disabled and hidden nodes, Tab/Shift+Tab trap, Escape and outside-click dismissal, trigger capture and focus restore, scrollbar-width-compensating body scroll lock, full listener and style teardown) to make the 4.1–4.2 tests pass — verify with `pnpm test` showing all composable tests green

## 5. Components

- [x] 5.1 Implement `src/components/BaseModal.vue` (UI-agnostic: `open` and `titleId` props, `close` emit, `#title` and default slots, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` bound to `titleId`, backdrop, close control, driven by `useAccessibleModal`) and verify with a component test using arbitrary non-Pokémon slot content asserting the three dialog attributes are present and `close` is emitted on Escape, on backdrop click, and on the close control — but not on a click inside the modal surface
- [x] 5.2 Add a `select` emit to `src/components/PokemonCard.vue` and make the card activatable by click and by Enter/Space with a visible focus ring, and verify with a component test asserting `select` is emitted with the card's item for each of the three activations, with no store referenced by the component
- [x] 5.3 Implement `src/components/PokemonDetailSkeleton.vue` (placeholder blocks for artwork, title, type badges and one bar per stat, laid out in the same grid as the loaded detail; container `aria-busy="true"` with the blocks `aria-hidden`; shimmer animation disabled under `prefers-reduced-motion`) and verify with a component test asserting the container's `aria-busy`, the `aria-hidden` placeholder blocks, and a stat placeholder row count matching the number of stat rows the loaded modal renders
- [x] 5.4 Implement `src/components/PokemonDetailModal.vue` composing `BaseModal.vue` and the detail store, rendering the loading, error (message matching the `AppError` subclass, with a retry action), and loaded states — name, national ID, official artwork with `error`-event fallback to the local placeholder, types, abilities, base stats, and SI height/weight with a placeholder for `null` — and verify with a component test asserting each of the three states renders distinguishable content, that `PokemonDetailSkeleton.vue` is present only in the loading state and absent in both the loaded and error states, that a cached Pokémon renders the loaded state without ever passing through the loading state, and that retry re-issues the detail request
- [x] 5.5 Wire the modal into the catalog parent: hold `selectedPokemon` in local state, open the modal on a card's `select`, clear it on `close`, and verify with a component test asserting the modal is absent initially, present after a card `select`, and absent again after `close`, with focus returned to the originating card
- [x] 5.6 Add a minimalist hover affordance to `PokemonCard.vue` — `cursor-pointer` and a subtle transform/elevation transition on `:hover` (e.g. slight scale or shadow lift, matching the existing Tailwind slate/sky palette) — reusing the same visual state for `:focus-visible` so keyboard users get equivalent feedback to the existing focus ring, and verify visually with `pnpm dev` that mouse hover and keyboard focus each produce a visible, non-jarring affordance with no layout shift to sibling cards

_Commit boundary: keep group 4 (composable) plus 5.1 (`BaseModal.vue`) as one commit and 5.2–5.6 (`PokemonCard.vue`, `PokemonDetailSkeleton.vue`, `PokemonDetailModal.vue`, wiring, hover styling) as a second if the combined diff approaches 400 lines._

## 6. Integration Verification

- [x] 6.1 Run `pnpm test`, `pnpm build` (vue-tsc typecheck), and `pnpm lint`, and verify all three complete with no errors
- [ ] 6.2 Manually verify in a browser with the devtools network tab open: opening a card issues exactly one `GET /pokemon/{id}` request, closing and reopening the same card issues none, and a simulated failure shows the retry error state while the catalog behind stays browsable after close
- [ ] 6.3 Manually verify the skeleton in a browser with the network throttled: opening a card renders the content-shaped skeleton, the modal's dimensions do not change when the real detail replaces it, and enabling the OS reduced-motion setting leaves the placeholder blocks static
- [ ] 6.4 Manually verify accessibility with the keyboard only and a screen reader: the card is reachable and activatable by keyboard, the dialog is announced with its Pokémon name as its accessible name, Tab cycles only within the modal, Escape closes it, focus returns to the originating card, and the page behind does not scroll or shift horizontally while the modal is open
