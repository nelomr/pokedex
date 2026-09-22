export interface NamedAPIResourceDTO {
  name: string;
  url: string;
}

export interface PokemonListResponseDTO {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResourceDTO[];
}

export interface PokemonTypeResponseDTO {
  pokemon: Array<{
    pokemon: NamedAPIResourceDTO;
    slot: number;
  }>;
}

export interface PokemonTypeSlotDTO {
  slot: number;
  type: NamedAPIResourceDTO;
}

export interface PokemonAbilitySlotDTO {
  ability: NamedAPIResourceDTO;
  is_hidden: boolean;
  slot: number;
}

export interface PokemonStatSlotDTO {
  base_stat: number;
  effort: number;
  stat: NamedAPIResourceDTO;
}

export interface PokemonSpritesOtherOfficialArtworkDTO {
  front_default: string | null;
}

export interface PokemonSpritesOtherDTO {
  "official-artwork"?: PokemonSpritesOtherOfficialArtworkDTO;
}

export interface PokemonSpritesDTO {
  front_default: string | null;
  other?: PokemonSpritesOtherDTO;
}

export interface PokemonDetailResponseDTO {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: PokemonTypeSlotDTO[];
  abilities: PokemonAbilitySlotDTO[];
  stats: PokemonStatSlotDTO[];
  sprites: PokemonSpritesDTO;
}
