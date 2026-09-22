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

  function makeTypeResponse(ids: number[]) {
    return {
      pokemon: ids.map((id) => ({
        pokemon: {
          name: `pokemon-${id}`,
          url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
        },
      })),
    };
  }

  describe("filteredList: name search and type filter", () => {
    async function setupStore() {
      vi.mocked(httpGet).mockResolvedValueOnce({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();
      return store;
    }

    it("narrows by case-insensitive partial name match", async () => {
      const store = await setupStore();
      store.setSearchQuery("Pokemon-1");

      expect(
        store.filteredList.every((item) => item.name.includes("pokemon-1")),
      ).toBe(true);
      expect(store.filteredList.length).toBeGreaterThan(0);
      expect(store.filteredList.length).toBeLessThan(45);
    });

    it("narrows by selectedType membership once typeIndex is loaded", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockResolvedValueOnce(makeTypeResponse([1, 2, 3]));

      await store.setTypeFilter("grass");

      expect(store.filteredList).toHaveLength(3);
      expect(store.filteredList.map((i) => i.name).sort()).toEqual([
        "pokemon-1",
        "pokemon-2",
        "pokemon-3",
      ]);
    });

    it("combines search query and selected type with AND", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockResolvedValueOnce(
        makeTypeResponse([1, 2, 3, 10, 11]),
      );
      await store.setTypeFilter("grass");
      store.setSearchQuery("pokemon-1");

      expect(store.filteredList.map((i) => i.name).sort()).toEqual([
        "pokemon-1",
        "pokemon-10",
        "pokemon-11",
      ]);
    });

    it("setSearchQuery resets currentPage to 1", async () => {
      const store = await setupStore();
      store.goToPage(2);
      store.setSearchQuery("pokemon");

      expect(store.currentPage).toBe(1);
    });

    it("setTypeFilter resets currentPage to 1", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockResolvedValueOnce(makeTypeResponse([1, 2, 3]));
      store.goToPage(2);
      await store.setTypeFilter("grass");

      expect(store.currentPage).toBe(1);
    });

    it("derives totalPages/paginatedItems from filteredList rather than rawCatalogIndex", async () => {
      const store = await setupStore();
      store.setSearchQuery("pokemon-1");

      expect(store.totalPages).toBe(
        Math.ceil(store.filteredList.length / store.pageSize),
      );
      expect(store.paginatedItems.length).toBe(
        Math.min(store.pageSize, store.filteredList.length),
      );
    });

    it("issues exactly one HTTP call for a selected type", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockResolvedValueOnce(makeTypeResponse([1, 2]));
      const callsBefore = vi.mocked(httpGet).mock.calls.length;

      await store.setTypeFilter("grass");

      expect(vi.mocked(httpGet).mock.calls.length - callsBefore).toBe(1);
    });

    it("issues no additional call when re-selecting the same type", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockResolvedValueOnce(makeTypeResponse([1, 2]));
      await store.setTypeFilter("grass");
      const callsBefore = vi.mocked(httpGet).mock.calls.length;

      await store.setTypeFilter("grass");

      expect(vi.mocked(httpGet).mock.calls.length).toBe(callsBefore);
    });

    it("restores the full set when the selected type is cleared", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockResolvedValueOnce(makeTypeResponse([1, 2]));
      await store.setTypeFilter("grass");
      await store.setTypeFilter(null);

      expect(store.filteredList).toHaveLength(45);
    });

    it("leaves catalog status at 'success' and sets a filter-scoped error on a rejected type fetch", async () => {
      const store = await setupStore();
      vi.mocked(httpGet).mockRejectedValueOnce(new NetworkError());

      await store.setTypeFilter("grass");

      expect(store.status).toBe("success");
      expect(store.typeFilterError).not.toBeNull();
    });
  });

  describe("searchMode: exact ID matching", () => {
    async function setupStoreWithNullId() {
      const results = makeIndex(45);
      results.push({
        name: "unresolvable",
        url: "https://pokeapi.co/api/v2/pokemon/not-a-number/",
      });
      vi.mocked(httpGet).mockResolvedValueOnce({ results });
      const store = usePokemonListStore();
      await store.initCatalog();
      return store;
    }

    it("defaults searchMode to 'name'", async () => {
      const store = await setupStoreWithNullId();
      expect(store.searchMode).toBe("name");
    });

    it("setSearchMode clears the current query and resets currentPage to 1", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchQuery("pokemon");
      store.goToPage(2);
      expect(store.currentPage).toBe(2);

      store.setSearchMode("id");

      expect(store.searchQuery).toBe("");
      expect(store.currentPage).toBe(1);
    });

    it("returns exactly one entry for an exact-ID query in id mode", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchMode("id");
      store.setSearchQuery("3");

      expect(store.filteredList).toHaveLength(1);
      expect(store.filteredList[0]?.name).toBe("pokemon-3");
    });

    it("returns no entries for a non-matching numeral in id mode", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchMode("id");
      store.setSearchQuery("999");

      expect(store.filteredList).toHaveLength(0);
    });

    it("excludes entries whose number merely starts with the entered digits", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchMode("id");
      store.setSearchQuery("1");

      expect(store.filteredList).toHaveLength(1);
      expect(store.filteredList[0]?.name).toBe("pokemon-1");
      expect(store.filteredList.map((i) => i.name)).not.toContain("pokemon-10");
    });

    it("still finds an entry with an unresolvable ID when searching by name", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchMode("name");
      store.setSearchQuery("unresolvable");

      expect(store.filteredList).toHaveLength(1);
      expect(store.filteredList[0]?.name).toBe("unresolvable");
    });

    it("excludes entries with a null extracted ID from id-mode matching, never coerced to 0", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchMode("id");
      store.setSearchQuery("0");

      expect(store.filteredList).toHaveLength(0);
    });

    it("produces different filteredList results for the same query string depending on mode", async () => {
      const store = await setupStoreWithNullId();
      store.setSearchMode("id");
      store.setSearchQuery("1");
      const idModeResult = store.filteredList.map((i) => i.name);

      store.setSearchMode("name");
      store.setSearchQuery("1");
      const nameModeResult = store.filteredList.map((i) => i.name);

      expect(idModeResult).not.toEqual(nameModeResult);
    });
  });

  describe("retryCatalog", () => {
    it("moves status to loading and issues a new catalog request from 'error'", async () => {
      vi.mocked(httpGet).mockRejectedValueOnce(new NetworkError());
      const store = usePokemonListStore();
      await store.initCatalog();
      expect(store.status).toBe("error");

      vi.mocked(httpGet).mockResolvedValueOnce({ results: makeIndex(5) });
      const retryPromise = store.retryCatalog();

      expect(store.status).toBe("loading");
      await retryPromise;

      expect(httpGet).toHaveBeenCalledTimes(2);
      expect(store.status).toBe("success");
    });

    it("issues no request and keeps 'success' when retried from 'success'", async () => {
      vi.mocked(httpGet).mockResolvedValueOnce({ results: makeIndex(5) });
      const store = usePokemonListStore();
      await store.initCatalog();
      expect(store.status).toBe("success");

      await store.retryCatalog();

      expect(httpGet).toHaveBeenCalledTimes(1);
      expect(store.status).toBe("success");
    });
  });

  describe("goToPageOf", () => {
    it("sets currentPage to the page containing a numeric key matching an entry's id", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();

      store.goToPageOf(41);

      expect(store.currentPage).toBe(3);
    });

    it("sets currentPage to the page containing a lowercase-name key matching an entry's name", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();

      store.goToPageOf("pokemon-41");

      expect(store.currentPage).toBe(3);
    });

    it("leaves currentPage unchanged for a key absent from filteredList", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();
      store.goToPage(2);

      store.goToPageOf(9999);

      expect(store.currentPage).toBe(2);
    });

    it("is a no-op for a null key", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();
      store.goToPage(2);

      store.goToPageOf(null);

      expect(store.currentPage).toBe(2);
    });

    it("leaves currentPage unchanged for an entry excluded by an active searchQuery", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();
      store.setSearchQuery("pokemon-1");
      store.goToPage(1);

      store.goToPageOf(41);

      expect(store.currentPage).toBe(1);
    });

    it("leaves currentPage unchanged for an entry excluded by an active selectedType", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();
      store.typeIndex.set("fire", new Set([1, 2, 3]));
      await store.setTypeFilter("fire");
      store.goToPage(1);

      store.goToPageOf(41);

      expect(store.currentPage).toBe(1);
    });

    it("does not pin the page: a later filter change still resets currentPage to 1", async () => {
      vi.mocked(httpGet).mockResolvedValue({ results: makeIndex(45) });
      const store = usePokemonListStore();
      await store.initCatalog();

      store.goToPageOf(41);
      expect(store.currentPage).toBe(3);

      store.setSearchQuery("pokemon");
      expect(store.currentPage).toBe(1);

      store.goToPageOf(41);
      expect(store.currentPage).toBe(3);
      store.setSearchMode("id");
      expect(store.currentPage).toBe(1);

      store.goToPageOf(41);
      expect(store.currentPage).toBe(3);
      void store.setTypeFilter(null);
      expect(store.currentPage).toBe(1);
    });
  });
});
