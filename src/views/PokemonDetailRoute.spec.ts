import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import App from "../App.vue";
import { httpGet } from "../api/httpClient";
import { NetworkError, NotFoundError, RateLimitError } from "../domain/errors";
import { routes } from "../router";

vi.mock("../api/httpClient", () => ({
  httpGet: vi.fn(),
}));

const CATALOG_URL_FRAGMENT = "/pokemon?";

function mockHttpGetByUrl(): void {
  vi.mocked(httpGet).mockImplementation((url: string) => {
    if (url.includes(CATALOG_URL_FRAGMENT)) {
      return Promise.resolve({ results: [] });
    }

    const idOrName = url.split("/").filter(Boolean).at(-1) ?? "";
    return Promise.resolve(detailResponse(idOrName));
  });
}

function detailResponse(idOrName: string) {
  const numeric = Number(idOrName);
  const id = Number.isFinite(numeric) && idOrName !== "" ? numeric : 25;
  const name = Number.isFinite(numeric) ? "pikachu" : idOrName;

  return {
    id,
    name,
    height: 4,
    weight: 60,
    types: [],
    abilities: [],
    stats: [],
    sprites: { front_default: null },
  };
}

async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  const wrapper = mount(App, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushAsync();
  return { wrapper, router };
}

async function flushAsync(): Promise<void> {
  await flushPromises();
  await flushPromises();
}

describe("PokemonDetailRoute", () => {
  let router: Router;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpGet).mockReset();
    mockHttpGetByUrl();
    document.body.innerHTML = "";
  });

  it("mounts the detail modal with the catalog view mounted behind it, at /pokemon/25", async () => {
    const mounted = await mountAt("/pokemon/25");
    router = mounted.router;

    expect(mounted.wrapper.find("[role='dialog']").exists()).toBe(true);
    expect(mounted.wrapper.find("[data-testid='app-content']").exists()).toBe(
      true,
    );
  });

  it("does not remount the catalog view when navigating from /pokemon/25 to /pokemon/26", async () => {
    const mounted = await mountAt("/pokemon/25");
    router = mounted.router;

    const catalogContentBefore = mounted.wrapper.get(
      "[data-testid='app-content']",
    ).element;

    await router.push("/pokemon/26");
    await flushAsync();

    const catalogContentAfter = mounted.wrapper.get(
      "[data-testid='app-content']",
    ).element;

    expect(catalogContentAfter).toBe(catalogContentBefore);
  });

  it("issues exactly one detail request across /pokemon/pikachu then /pokemon/25", async () => {
    const mounted = await mountAt("/pokemon/pikachu");
    router = mounted.router;

    const detailCallsBefore = vi
      .mocked(httpGet)
      .mock.calls.filter(([url]) => !url.includes(CATALOG_URL_FRAGMENT)).length;
    expect(detailCallsBefore).toBe(1);

    await router.push("/pokemon/25");
    await flushAsync();

    const detailCallsAfter = vi
      .mocked(httpGet)
      .mock.calls.filter(([url]) => !url.includes(CATALOG_URL_FRAGMENT)).length;
    expect(detailCallsAfter).toBe(1);
    expect(
      mounted.wrapper.find("[data-testid='detail-content']").exists(),
    ).toBe(true);
  });

  it("resolves the detail content while the catalog request is still pending", async () => {
    vi.mocked(httpGet).mockImplementation((url: string) => {
      if (url.includes(CATALOG_URL_FRAGMENT)) {
        return new Promise(() => {});
      }

      const idOrName = url.split("/").filter(Boolean).at(-1) ?? "";
      return Promise.resolve(detailResponse(idOrName));
    });

    const mounted = await mountAt("/pokemon/25");
    const { usePokemonListStore } = await import("../stores/pokemonList.store");
    const listStore = usePokemonListStore();

    expect(listStore.status).toBe("loading");
    expect(
      mounted.wrapper.find("[data-testid='detail-content']").exists(),
    ).toBe(true);
  });

  describe("dismissal", () => {
    it("navigates to the catalog route and unmounts the modal on Escape", async () => {
      const mounted = await mountAt("/pokemon/25");

      await mounted.wrapper
        .get("[role='dialog']")
        .trigger("keydown", { key: "Escape" });
      await flushAsync();

      expect(mounted.router.currentRoute.value.fullPath).toBe("/");
      expect(mounted.wrapper.find("[role='dialog']").exists()).toBe(false);
    });

    it("navigates to the catalog route and unmounts the modal on the close control", async () => {
      const mounted = await mountAt("/pokemon/25");

      await mounted.wrapper.get("[data-testid='modal-close']").trigger("click");
      await flushAsync();

      expect(mounted.router.currentRoute.value.fullPath).toBe("/");
      expect(mounted.wrapper.find("[role='dialog']").exists()).toBe(false);
    });

    it("navigates to the catalog route and unmounts the modal on a backdrop click", async () => {
      const mounted = await mountAt("/pokemon/25");

      await mounted.wrapper
        .get("[data-testid='modal-backdrop']")
        .trigger("click");
      await flushAsync();

      expect(mounted.router.currentRoute.value.fullPath).toBe("/");
      expect(mounted.wrapper.find("[role='dialog']").exists()).toBe(false);
    });

    it("leaves the route unchanged on a click inside the modal surface", async () => {
      const mounted = await mountAt("/pokemon/25");

      await mounted.wrapper.get("[role='dialog']").trigger("click");
      await flushAsync();

      expect(mounted.router.currentRoute.value.fullPath).toBe("/pokemon/25");
      expect(mounted.wrapper.find("[role='dialog']").exists()).toBe(true);
    });

    it("ends at the catalog route on Escape from a cold entry with no prior history", async () => {
      const mounted = await mountAt("/pokemon/25");

      await mounted.wrapper
        .get("[role='dialog']")
        .trigger("keydown", { key: "Escape" });
      await flushAsync();

      expect(mounted.router.currentRoute.value.fullPath).toBe("/");
      expect(mounted.wrapper.find("[data-testid='app-content']").exists()).toBe(
        true,
      );
    });
  });

  describe("history navigation", () => {
    async function mountFromCatalogThenNavigate() {
      const historyRouter = createRouter({
        history: createMemoryHistory(),
        routes,
      });
      await historyRouter.push("/");
      const wrapper = mount(App, {
        global: { plugins: [historyRouter] },
        attachTo: document.body,
      });
      await flushAsync();

      await historyRouter.push("/pokemon/25");
      await flushAsync();

      return { wrapper, router: historyRouter };
    }

    it("unmounts the modal and shows the catalog route on Back", async () => {
      const { wrapper, router: navRouter } =
        await mountFromCatalogThenNavigate();

      await navRouter.back();
      await flushAsync();

      expect(navRouter.currentRoute.value.fullPath).toBe("/");
      expect(wrapper.find("[role='dialog']").exists()).toBe(false);
    });

    it("re-opens the modal with focus inside it on Forward", async () => {
      const { wrapper, router: navRouter } =
        await mountFromCatalogThenNavigate();

      await navRouter.back();
      await flushAsync();

      await navRouter.forward();
      await flushAsync();

      expect(navRouter.currentRoute.value.fullPath).toBe("/pokemon/25");
      const dialog = wrapper.find("[role='dialog']");
      expect(dialog.exists()).toBe(true);
      expect(dialog.element.contains(document.activeElement)).toBe(true);
    });

    it("restores body scroll after a Back-driven close", async () => {
      const { router: navRouter } = await mountFromCatalogThenNavigate();

      const previousOverflow = document.body.style.overflow;

      await navRouter.back();
      await flushAsync();

      expect(document.body.style.overflow).toBe(previousOverflow);
    });
  });

  describe("focus restore fallback", () => {
    it("moves focus to the catalog heading when closing a cold deep-link entry", async () => {
      const mounted = await mountAt("/pokemon/25");

      await mounted.wrapper.get("[data-testid='modal-close']").trigger("click");
      await flushAsync();

      expect(document.activeElement).toBe(
        mounted.wrapper.get("[data-testid='catalog-heading']").element,
      );
    });

    it("restores focus to the originating card when entering from a card click", async () => {
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({
            results: [
              {
                name: "pikachu",
                url: "https://pokeapi.co/api/v2/pokemon/25/",
              },
            ],
          });
        }

        const idOrName = url.split("/").filter(Boolean).at(-1) ?? "";
        return Promise.resolve(detailResponse(idOrName));
      });

      const historyRouter = createRouter({
        history: createMemoryHistory(),
        routes,
      });
      await historyRouter.push("/");
      const wrapper = mount(App, {
        global: { plugins: [historyRouter] },
        attachTo: document.body,
      });
      await flushAsync();

      const card = wrapper.get("a[href='/pokemon/pikachu']");
      (card.element as HTMLElement).focus();
      await card.trigger("click");
      await flushAsync();

      await wrapper.get("[data-testid='modal-close']").trigger("click");
      await flushAsync();

      expect(document.activeElement).toBe(card.element);
    });
  });

  describe("invalid identifier handling", () => {
    it("renders the not-found error and leaves the URL unchanged", async () => {
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({ results: [] });
        }
        return Promise.reject(new NotFoundError());
      });

      const mounted = await mountAt("/pokemon/99999");

      expect(
        mounted.wrapper.find("[data-testid='detail-error']").exists(),
      ).toBe(true);
      expect(
        mounted.wrapper.find("[data-testid='detail-retry']").exists(),
      ).toBe(true);
      expect(mounted.router.currentRoute.value.fullPath).toBe("/pokemon/99999");

      await mounted.wrapper.get("[data-testid='modal-close']").trigger("click");
      await flushAsync();

      expect(mounted.router.currentRoute.value.fullPath).toBe("/");
      expect(mounted.wrapper.find("[data-testid='app-content']").exists()).toBe(
        true,
      );
    });

    it("renders the rate-limit failure and retries the same route parameter", async () => {
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({ results: [] });
        }
        return Promise.reject(new RateLimitError());
      });

      const mounted = await mountAt("/pokemon/25");

      expect(
        mounted.wrapper.find("[data-testid='detail-error']").text(),
      ).toContain(new RateLimitError().message);

      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({ results: [] });
        }
        return Promise.resolve(detailResponse("25"));
      });

      await mounted.wrapper
        .get("[data-testid='detail-retry']")
        .trigger("click");
      await flushAsync();

      expect(
        mounted.wrapper.find("[data-testid='detail-content']").exists(),
      ).toBe(true);
    });

    it("renders the network failure message on a deep-linked URL", async () => {
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({ results: [] });
        }
        return Promise.reject(new NetworkError());
      });

      const mounted = await mountAt("/pokemon/25");

      expect(
        mounted.wrapper.find("[data-testid='detail-error']").text(),
      ).toContain(new NetworkError().message);
    });
  });

  describe("pagination sync", () => {
    function catalogIndex(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        name: `pokemon-${i + 1}`,
        url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/`,
      }));
    }

    function mockWithCatalog(results: ReturnType<typeof catalogIndex>): void {
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({ results });
        }

        const idOrName = url.split("/").filter(Boolean).at(-1) ?? "";
        return Promise.resolve(detailResponse(idOrName));
      });
    }

    it("advances currentPage to the resolved Pokémon's page once the catalog is loaded", async () => {
      mockWithCatalog(catalogIndex(45));

      await mountAt("/pokemon/41");
      const { usePokemonListStore } =
        await import("../stores/pokemonList.store");
      const listStore = usePokemonListStore();

      expect(listStore.currentPage).toBe(3);
    });

    it("leaves currentPage unchanged when the identifier fails to resolve", async () => {
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return Promise.resolve({ results: catalogIndex(45) });
        }
        return Promise.reject(new NotFoundError());
      });

      await mountAt("/pokemon/99999");
      const { usePokemonListStore } =
        await import("../stores/pokemonList.store");
      const listStore = usePokemonListStore();

      expect(listStore.currentPage).toBe(1);
    });

    it("defers the sync while the catalog is still loading, then applies it once it succeeds", async () => {
      let resolveCatalog!: (value: {
        results: ReturnType<typeof catalogIndex>;
      }) => void;
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return new Promise((resolve) => {
            resolveCatalog = resolve;
          });
        }

        const idOrName = url.split("/").filter(Boolean).at(-1) ?? "";
        return Promise.resolve(detailResponse(idOrName));
      });

      const mounted = await mountAt("/pokemon/41");
      const { usePokemonListStore } =
        await import("../stores/pokemonList.store");
      const listStore = usePokemonListStore();

      expect(listStore.status).toBe("loading");
      expect(listStore.currentPage).toBe(1);
      expect(
        mounted.wrapper.find("[data-testid='detail-content']").exists(),
      ).toBe(true);

      resolveCatalog({ results: catalogIndex(45) });
      await flushAsync();

      expect(listStore.status).toBe("success");
      expect(listStore.currentPage).toBe(3);
    });

    it("drops the pending sync silently when the catalog load fails", async () => {
      let rejectCatalog!: (reason: unknown) => void;
      vi.mocked(httpGet).mockImplementation((url: string) => {
        if (url.includes(CATALOG_URL_FRAGMENT)) {
          return new Promise((_resolve, reject) => {
            rejectCatalog = reject;
          });
        }

        const idOrName = url.split("/").filter(Boolean).at(-1) ?? "";
        return Promise.resolve(detailResponse(idOrName));
      });

      const mounted = await mountAt("/pokemon/41");
      const { usePokemonListStore } =
        await import("../stores/pokemonList.store");
      const listStore = usePokemonListStore();

      rejectCatalog(new NetworkError());
      await flushAsync();

      expect(listStore.status).toBe("error");
      expect(listStore.currentPage).toBe(1);
      expect(
        mounted.wrapper.find("[data-testid='detail-content']").exists(),
      ).toBe(true);
      expect(
        mounted.wrapper.find("[data-testid='detail-error']").exists(),
      ).toBe(false);
    });

    it("re-runs the sync on a Back/Forward re-resolution and still resets to page 1 on a search change", async () => {
      mockWithCatalog(catalogIndex(45));

      const historyRouter = createRouter({
        history: createMemoryHistory(),
        routes,
      });
      await historyRouter.push("/pokemon/41");
      const wrapper = mount(App, {
        global: { plugins: [historyRouter] },
        attachTo: document.body,
      });
      await flushAsync();

      const { usePokemonListStore } =
        await import("../stores/pokemonList.store");
      const listStore = usePokemonListStore();
      expect(listStore.currentPage).toBe(3);

      await historyRouter.push("/pokemon/21");
      await flushAsync();

      expect(listStore.currentPage).toBe(2);

      listStore.setSearchQuery("pokemon");
      expect(listStore.currentPage).toBe(1);

      void wrapper;
    });
  });
});
