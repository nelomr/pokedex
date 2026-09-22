# Proposal

## Why

Users can browse and filter the catalog but have no way to see a Pokémon's details (types, stats, abilities). An accessible modal opened from a card click delivers this without yet introducing routing concerns.

## What Changes

- Add `src/stores/pokemonDetail.store.ts`: an identity-map `cache: Map<string|number, PokemonDetail>` (stored under both ID and name), a `loadingIds: Set` to dedupe in-flight requests, an `errors: Map`, and a `getPokemonDetail(idOrName)` action that returns from cache without touching the network on a hit.
- Add `src/composables/useAccessibleModal.ts` implementing WAI-ARIA dialog semantics: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; Tab/Shift+Tab focus trap; close on Escape and outside click; focus restored to the triggering element on close; body scroll lock that compensates scrollbar width to avoid layout shift.
- Add `BaseModal.vue` (UI-agnostic) and `PokemonDetailModal.vue` (types, base stats, abilities, official artwork).
- Extend `pokemonMapper.ts` with height/weight unit conversion (PokéAPI returns decimetres/hectograms, not SI units) and null/NaN safety.
- Scope explicitly excludes the URL/deep-link concern: in this slice the modal opens only from a card click, with local component state; deep linking is deferred to `add-detail-deep-link`.

## Capabilities

### New Capabilities
- `pokemon-detail`: viewing a Pokémon's details (types, base stats, abilities, official artwork) in an accessible modal, opened from a catalog card click.

### Modified Capabilities
_None._

## Impact

- New files: `src/stores/pokemonDetail.store.ts`, `src/composables/useAccessibleModal.ts`, `src/components/BaseModal.vue`, `src/components/PokemonDetailModal.vue`.
- Modified files: `src/services/pokemonMapper.ts` (unit conversion, null/NaN safety), `src/components/PokemonCard.vue` (click opens modal).
- Dependencies wired: none new.
- Dependency: requires `add-pokemon-catalog` to be implemented first (needs the catalog grid/cards as the trigger point and the shared mapper/error infrastructure). Independent of `add-search-and-type-filter`.
