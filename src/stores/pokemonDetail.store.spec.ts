import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpGet } from "../api/httpClient";
import { NetworkError, NotFoundError, RateLimitError } from "../domain/errors";
import { usePokemonDetailStore } from "./pokemonDetail.store";
import { usePokemonListStore } from "./pokemonList.store";

vi.mock("../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

function makeDetailDto(id: number, name: string) {
  return {
    id,
    name,
    height: 7,
    weight: 69,
    types: [{ slot: 1, type: { name: "grass", url: "" } }],
    abilities: [
      { ability: { name: "overgrow", url: "" }, is_hidden: false, slot: 1 },
    ],
    stats: [{ base_stat: 45, effort: 0, stat: { name: "hp", url: "" } }],
    sprites: { front_default: null },
  };
}

describe("pokemonDetail.store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpGet).mockReset();
  });

  it("issues exactly one request and populates the cache on first load", async () => {
    vi.mocked(httpGet).mockResolvedValue(makeDetailDto(1, "bulbasaur"));
    const store = usePokemonDetailStore();

    const result = await store.getPokemonDetail(1);

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(result?.name).toBe("bulbasaur");
    expect(store.cache.get(1)?.name).toBe("bulbasaur");
  });

  it("issues no further request on a second call for the same key", async () => {
    vi.mocked(httpGet).mockResolvedValue(makeDetailDto(1, "bulbasaur"));
    const store = usePokemonDetailStore();

    await store.getPokemonDetail(1);
    await store.getPokemonDetail(1);

    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it("retrieves a name-loaded Pokémon by its numeric ID with no additional request", async () => {
    vi.mocked(httpGet).mockResolvedValue(makeDetailDto(1, "bulbasaur"));
    const store = usePokemonDetailStore();

    await store.getPokemonDetail("bulbasaur");
    const byId = await store.getPokemonDetail(1);

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(byId?.name).toBe("bulbasaur");
  });

  it("retrieves an ID-loaded Pokémon by its lowercase name with no additional request", async () => {
    vi.mocked(httpGet).mockResolvedValue(makeDetailDto(1, "bulbasaur"));
    const store = usePokemonDetailStore();

    await store.getPokemonDetail(1);
    const byName = await store.getPokemonDetail("bulbasaur");

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(byName?.id).toBe(1);
  });

  it("collapses two concurrent calls for the same key into exactly one request", async () => {
    let resolveFn: (value: unknown) => void = () => {};
    vi.mocked(httpGet).mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      }),
    );
    const store = usePokemonDetailStore();

    const p1 = store.getPokemonDetail(1);
    const p2 = store.getPokemonDetail(1);
    resolveFn(makeDetailDto(1, "bulbasaur"));
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(r1?.name).toBe("bulbasaur");
    expect(r2?.name).toBe("bulbasaur");
  });

  it.each([
    ["NotFoundError", new NotFoundError()],
    ["RateLimitError", new RateLimitError()],
    ["NetworkError", new NetworkError()],
  ])(
    "records a rejected request's %s under that key while leaving other keys untouched",
    async (_label, err) => {
      vi.mocked(httpGet).mockResolvedValueOnce(makeDetailDto(2, "ivysaur"));
      const store = usePokemonDetailStore();
      await store.getPokemonDetail(2);

      vi.mocked(httpGet).mockRejectedValueOnce(err);
      await store.getPokemonDetail(1);

      expect(store.errors.get(1)).toBe(err);
      expect(store.errors.get(2)).toBeUndefined();
      expect(store.cache.get(2)?.name).toBe("ivysaur");
    },
  );

  it("issues a new request and clears the key's error on a successful retry", async () => {
    vi.mocked(httpGet).mockRejectedValueOnce(new NetworkError());
    const store = usePokemonDetailStore();
    await store.getPokemonDetail(1);
    expect(store.errors.get(1)).toBeInstanceOf(NetworkError);

    vi.mocked(httpGet).mockResolvedValueOnce(makeDetailDto(1, "bulbasaur"));
    await store.getPokemonDetail(1);

    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(store.errors.get(1)).toBeUndefined();
    expect(store.cache.get(1)?.name).toBe("bulbasaur");
  });

  it("leaves the catalog store's status/error untouched by a failed detail request", async () => {
    vi.mocked(httpGet).mockRejectedValueOnce(new NetworkError());
    const listStore = usePokemonListStore();
    const detailStore = usePokemonDetailStore();

    await detailStore.getPokemonDetail(1);

    expect(listStore.status).toBe("idle");
    expect(listStore.error).toBeNull();
  });
});
