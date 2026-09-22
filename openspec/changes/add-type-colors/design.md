## Context

`PokemonDetailModal.vue` renders each entry of `detail.types` as a pill with a hardcoded `bg-slate-700`. The domain already owns the closed set of types as `POKEMON_TYPES` (18 entries) and the derived `PokemonType` union, so the colour mapping has an obvious key set to be checked against at compile time.

Two constraints shape the approach:

1. **Tailwind's content scanner only sees literal class strings.** A binding built by interpolation (`` `bg-type-${type}` ``) produces classes that are never emitted in the production CSS, so the badges would render unstyled after `pnpm build` while looking correct in dev. The mapping must therefore store whole, literal utility strings.
2. **`detail.types` is typed `string[]`, not `PokemonType[]`.** The mapper does not narrow PokéAPI type slugs, so the lookup receives an arbitrary string and must handle a miss rather than return `undefined` into a class binding.

## Goals / Non-Goals

**Goals:**
- One authoritative type-to-colour mapping, exhaustive over `PokemonType`, enforced by the type system rather than by review.
- Detail-modal type badges coloured by type, legible in the existing dark modal.
- Safe degradation for an unrecognised type string.

**Non-Goals:**
- Colouring type indicators anywhere else (catalog cards, `TypeFilterSelect`). The mapping is built to be reusable, but this change only wires the detail modal.
- A configurable or user-themeable palette.
- Extending the Tailwind theme with custom colour tokens; stock palette shades are enough.
- Changing badge shape, spacing, ordering, or text.

## Decisions

### Mapping lives in the domain as a frozen `Record<PokemonType, string>`

A `Record<PokemonType, string>` keyed by the union makes an omitted type a compile error — adding a type to `POKEMON_TYPES` without a colour fails `vue-tsc` instead of silently rendering a blank badge. Placing it in `src/domain/` keeps it framework-agnostic and free of component or API coupling, consistent with the hexagonal separation the project already follows.

*Alternative considered:* a `switch` in the component. Rejected — it puts presentation knowledge inside a single consumer, and TypeScript gives no exhaustiveness guarantee without an extra never-check.

*Verified by:* a test asserting every entry of `POKEMON_TYPES` resolves to a non-empty class string.

### Values are complete literal Tailwind class strings

Each entry stores the full set of utilities for that badge (background plus text colour), e.g. `"bg-amber-700 text-amber-50"`. Literal strings in a `.ts` file are picked up by Tailwind's scanner, which keeps dev and production output identical.

*Alternative considered:* CSS custom properties with an inline `style` binding. Rejected — it bypasses Tailwind, splits styling across two systems, and adds no capability here.

*Verified by:* a test asserting no mapped value contains a `${` fragment or is assembled at runtime — i.e. values are static literals.

### Lookup is a function with an explicit neutral fallback

`typeBadgeClasses(type: string): string` returns the mapped value when the argument is a known type and the current neutral treatment (`bg-slate-700 text-slate-100`) otherwise. The component calls the function and never indexes the record directly, so the miss case is handled in exactly one place.

*Alternative considered:* narrowing `PokemonDetail.types` to `PokemonType[]` in the mapper. Rejected as a larger change — it makes an unknown slug a mapping-layer failure, which is a stricter contract than this UI change needs to introduce.

*Verified by:* a test asserting an unknown slug returns the neutral treatment rather than `undefined` or an empty string.

### Contrast is chosen per pairing, not per shade

Dark type colours (dragon, dark, ghost, poison) take a light foreground; light ones (electric, ice, fairy) take a dark foreground. Each pairing is picked to stay readable at the badge's `text-xs` size against the slate modal background.

*Verified by:* structural readback of the palette rather than an automated test — an assertion over hardcoded hex values would restate the mapping without proving legibility.

## Risks / Trade-offs

- **A future type added to `POKEMON_TYPES` ships without a colour** → the `Record<PokemonType, string>` key requirement makes this a `vue-tsc` failure during `pnpm build`, not a runtime surprise.
- **Tailwind purges a class because a value was later refactored into interpolation** → the literal-value test catches the regression, and the mapping's doc comment states the constraint at the point of edit.
- **Colour becomes the only channel carrying type information** → the badge keeps its visible text label, so colour stays a redundant cue and the change introduces no accessibility regression for colour-blind users.
- **Palette drifts from the wider community convention** → accepted; the stock Tailwind palette approximates the familiar type colours closely enough, and exact hex fidelity is not a goal.
