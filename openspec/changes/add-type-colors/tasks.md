## 1. Type colour mapping

- [x] 1.1 Write a failing test in `src/domain/typeColors.spec.ts` asserting that every entry of `POKEMON_TYPES` resolves through `typeBadgeClasses` to a non-empty class string.
- [x] 1.2 Create `src/domain/typeColors.ts` with a frozen `Record<PokemonType, string>` and a `typeBadgeClasses(type: string): string` lookup — enough to pass 1.1. Each value is a complete literal Tailwind string pairing a background with a legible foreground (ground earth tone, bug green, fire orange, etc.), with light foregrounds on dark types and dark foregrounds on light ones.
- [x] 1.3 Write a failing test asserting an unrecognised slug returns the neutral treatment (`bg-slate-700 text-slate-100`) rather than `undefined` or an empty string; make it pass.
- [x] 1.4 Write a failing test asserting no mapped value contains a `${` fragment, then confirm it passes against the literal map. Add a doc comment on the map stating why values must stay literal (Tailwind's content scanner).

## 2. Detail modal wiring

- [x] 2.1 Extend `src/components/PokemonDetailModal/PokemonDetailModal.spec.ts` with a failing test asserting a two-type Pokémon renders each badge with its own type's classes and that the two badges differ.
- [x] 2.2 Add a failing test asserting the badge still renders the type name as text alongside its colour.
- [x] 2.3 Replace the hardcoded `bg-slate-700` on the type badge in `PokemonDetailModal.vue` with a `typeBadgeClasses(type)` binding, keeping the existing shape, spacing, ordering, and label utilities; make 2.1 and 2.2 pass.
- [x] 2.4 Add a failing test asserting a Pokémon carrying an unknown type slug renders that badge neutrally without error; confirm it passes with no further code change.

## 3. Verification

- [x] 3.1 Run `pnpm test` and confirm the full suite passes.
- [x] 3.2 Run `pnpm build` and confirm `vue-tsc` accepts the `Record<PokemonType, string>` and the production stylesheet contains the type badge classes.
- [x] 3.3 Run `pnpm lint` and resolve any findings.
