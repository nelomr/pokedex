## Why

The Pokémon detail view renders every type badge with the same neutral slate background, so a dual-type Pokémon gives the user no visual cue about what those types are. Type colour is the one convention every Pokémon UI shares (ground reads as an earth tone, bug as green), and its absence makes the detail panel harder to scan than it needs to be.

## What Changes

- Introduce a single source of truth mapping each of the 18 Pokémon types to a colour treatment (background + foreground), covering the existing `POKEMON_TYPES` tuple exhaustively.
- Render each type badge in the detail modal with its type's colour treatment instead of the shared `bg-slate-700`.
- Fall back to the current neutral treatment when a type string is not one of the 18 known types, so unexpected API data degrades rather than breaks.
- Keep badge text legible against its own background (contrast is part of the mapping, not an afterthought).
- No breaking changes: the badge markup, ordering, and text content stay as they are.

## Capabilities

### New Capabilities
- `pokemon-type-colors`: the type-to-colour mapping itself — exhaustive coverage of the known types, a defined fallback for unknown values, and the legibility constraint on each pairing.

### Modified Capabilities
- `pokemon-detail`: gains a new presentation requirement — type badges SHALL be rendered using the type's colour treatment. Added rather than modified: existing detail-content behaviour is untouched.

## Impact

- `src/domain/pokemon.types.ts` — `POKEMON_TYPES` / `PokemonType` become the keys the mapping must cover.
- New module under `src/domain/` (or `src/services/`) holding the mapping and its lookup function.
- `src/components/PokemonDetailModal/PokemonDetailModal.vue` — type badge class binding.
- Tailwind: the mapping must hold complete, literal class strings so Tailwind's content scanner can see them; no runtime string interpolation of class names.
- No API, store, router, or dependency changes.
