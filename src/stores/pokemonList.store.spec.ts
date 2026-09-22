import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkError, NotFoundError, RateLimitError } from "../domain/errors";
import { httpGet } from "../api/httpClient";
import { usePokemonListStore } from "./pokemonList.store";

vi.mock("../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

function makeIndex(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `pokemon-${i + 1}`,
    url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/`,
  }));
}

describe("pokemonList.store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpGet).mockReset();
  });

  it("returns the first 20 entries on page 1", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();

    expect(store.paginatedItems).toHaveLength(20);
    expect(store.paginatedItems[0]?.name).toBe("pokemon-1");
  });

  it("returns a partial slice on the last page when index length is not a multiple of pageSize", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();
    store.goToPage(3);

    expect(store.paginatedItems).toHaveLength(5);
  });

  it("computes totalPages for an exact multiple of pageSize", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(40) });
    const store = usePokemonListStore();
    await store.initCatalog();

    expect(store.totalPages).toBe(2);
  });

  it("computes totalPages for a remainder", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();

    expect(store.totalPages).toBe(3);
  });

  it("has hasNextPage/hasPrevPage correct on the first page", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();

    expect(store.hasPrevPage).toBe(false);
    expect(store.hasNextPage).toBe(true);
  });

  it("has hasNextPage/hasPrevPage correct on the last page", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();
    store.goToPage(3);

    expect(store.hasPrevPage).toBe(true);
    expect(store.hasNextPage).toBe(false);
  });

  it("produces zero totalPages and disabled navigation for an empty index", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: [] });
    const store = usePokemonListStore();
    await store.initCatalog();

    expect(store.totalPages).toBe(0);
    expect(store.hasNextPage).toBe(false);
    expect(store.hasPrevPage).toBe(false);
  });

  it("clamps goToPage below 1 to the nearest valid page", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();
    store.goToPage(-5);

    expect(store.currentPage).toBe(1);
  });

  it("clamps goToPage above totalPages to the nearest valid page", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();
    store.goToPage(999);

    expect(store.currentPage).toBe(3);
  });

  it("ignores a NaN target and leaves currentPage unchanged", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();
    store.goToPage(2);
    store.goToPage(Number.NaN);

    expect(store.currentPage).toBe(2);
  });

  it("rounds down a non-integer target to a valid page", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
    const store = usePokemonListStore();
    await store.initCatalog();
    store.goToPage(2.9);

    expect(store.currentPage).toBe(2);
  });

  it("issues exactly one call to httpGet and populates rawCatalogIndex", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(10) });
    const store = usePokemonListStore();
    await store.initCatalog();

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(store.rawCatalogIndex).toHaveLength(10);
  });

  it("is a no-op on a second initCatalog call once the index is loaded", async () => {
    vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(10) });
    const store = usePokemonListStore();
    await store.initCatalog();
    await store.initCatalog();

    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NotFoundError", new NotFoundError()],
    ["RateLimitError", new RateLimitError()],
    ["NetworkError", new NetworkError()],
  ])(
    "sets status: 'error' with %s preserved in error on a rejected initCatalog",
    async (_label, err) => {
      vi.mocked(httpGet).mockRejectedValue(err);
      const store = usePokemonListStore();
      await store.initCatalog();

      expect(store.status).toBe("error");
      expect(store.error).toBe(err);
    },
  );
});
