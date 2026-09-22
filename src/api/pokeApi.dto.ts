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
