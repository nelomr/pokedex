import { describe, expect, it } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { routes } from "./index";
import { ROUTE_NAMES } from "./routeNames";

describe("router", () => {
  it("resolves /pokemon/25 to the pokemon-detail route with a string param", () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const resolved = router.resolve("/pokemon/25");

    expect(resolved.name).toBe(ROUTE_NAMES.pokemonDetail);
    expect(resolved.params.idOrName).toBe("25");
  });

  it("resolves /pokemon/pikachu to the pokemon-detail route with a string param", () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const resolved = router.resolve("/pokemon/pikachu");

    expect(resolved.name).toBe(ROUTE_NAMES.pokemonDetail);
    expect(resolved.params.idOrName).toBe("pikachu");
  });

  it("registers the detail route as a child of the catalog route", () => {
    const catalogRoute = routes.find(
      (route) => route.name === ROUTE_NAMES.pokemonCatalog,
    );

    expect(catalogRoute?.children?.[0]?.name).toBe(ROUTE_NAMES.pokemonDetail);
  });
});
