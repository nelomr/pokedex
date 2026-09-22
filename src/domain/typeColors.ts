import type { PokemonType } from "./pokemon.types";

/**
 * Badge colour treatment per Pokémon type.
 *
 * Every value MUST be a complete, literal Tailwind class string. Tailwind's
 * content scanner only sees class names that appear verbatim in the source, so
 * a value assembled at runtime (`bg-type-${type}`) would render correctly in
 * dev and be purged from the production stylesheet.
 *
 * Typing this as `Record<PokemonType, string>` makes a type added to
 * `POKEMON_TYPES` without a colour a `vue-tsc` failure rather than a blank
 * badge at runtime.
 */
export const TYPE_BADGE_CLASSES: Record<PokemonType, string> = Object.freeze({
  normal: "bg-stone-400 text-stone-900",
  fighting: "bg-red-800 text-red-50",
  flying: "bg-indigo-300 text-indigo-950",
  poison: "bg-purple-700 text-purple-50",
  ground: "bg-amber-700 text-amber-50",
  rock: "bg-stone-600 text-stone-50",
  bug: "bg-lime-600 text-lime-50",
  ghost: "bg-violet-800 text-violet-50",
  steel: "bg-slate-400 text-slate-900",
  fire: "bg-orange-600 text-orange-50",
  water: "bg-blue-600 text-blue-50",
  grass: "bg-green-600 text-green-50",
  electric: "bg-yellow-400 text-yellow-950",
  psychic: "bg-pink-500 text-pink-50",
  ice: "bg-cyan-300 text-cyan-950",
  dragon: "bg-indigo-800 text-indigo-50",
  dark: "bg-neutral-800 text-neutral-50",
  fairy: "bg-pink-300 text-pink-950",
});

/**
 * Treatment for a type slug that is not one of the known types. `PokemonDetail`
 * carries `types: string[]` because the mapper does not narrow PokéAPI slugs,
 * so the lookup must absorb a miss instead of feeding `undefined` into a class
 * binding.
 */
export const NEUTRAL_BADGE_CLASSES = "bg-slate-700 text-slate-100";

export function typeBadgeClasses(type: string): string {
  return TYPE_BADGE_CLASSES[type as PokemonType] ?? NEUTRAL_BADGE_CLASSES;
}
