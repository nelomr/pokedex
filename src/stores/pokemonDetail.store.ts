import { defineStore } from "pinia";
import { reactive } from "vue";
import { httpGet } from "../api/httpClient";
import type { PokemonDetailResponseDTO } from "../api/pokeApi.dto";
import { AppError, NetworkError } from "../domain/errors";
import type { PokemonDetail } from "../domain/pokemon.types";
import { mapToPokemonDetail } from "../services/pokemonMapper";

function detailUrl(idOrName: string | number): string {
  return `https://pokeapi.co/api/v2/pokemon/${idOrName}`;
}

function normalizeKey(idOrName: string | number): string | number {
  return typeof idOrName === "string" ? idOrName.toLowerCase() : idOrName;
}

export const usePokemonDetailStore = defineStore("pokemonDetail", () => {
  const cache = reactive(new Map<string | number, PokemonDetail>());
  const loadingIds = reactive(
    new Map<string | number, Promise<PokemonDetail>>(),
  );
  const errors = reactive(new Map<string | number, AppError>());

  async function getPokemonDetail(
    idOrName: string | number,
  ): Promise<PokemonDetail | undefined> {
    const key = normalizeKey(idOrName);

    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const inFlight = loadingIds.get(key);
    if (inFlight) {
      return inFlight;
    }

    const requestPromise = (async (): Promise<PokemonDetail> => {
      try {
        const dto = await httpGet<PokemonDetailResponseDTO>(
          detailUrl(idOrName),
        );
        const detail = mapToPokemonDetail(dto);
        cache.set(detail.id, detail);
        cache.set(detail.name.toLowerCase(), detail);
        errors.delete(detail.id);
        errors.delete(detail.name.toLowerCase());
        return detail;
      } catch (caughtError) {
        const appError =
          caughtError instanceof AppError ? caughtError : new NetworkError();
        errors.set(key, appError);
        throw appError;
      } finally {
        loadingIds.delete(key);
      }
    })();

    loadingIds.set(key, requestPromise);

    try {
      return await requestPromise;
    } catch {
      return undefined;
    }
  }

  return {
    cache,
    loadingIds,
    errors,
    getPokemonDetail,
  };
});
