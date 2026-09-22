import { describe, expect, it } from "vitest";
import { resolveCatalogViewState } from "./catalogViewState";

describe("resolveCatalogViewState", () => {
  it("resolves 'idle' status to 'idle'", () => {
    expect(
      resolveCatalogViewState({
        status: "idle",
        totalCount: 0,
        filteredCount: 0,
      }),
    ).toBe("idle");
  });

  it("resolves 'loading' status to 'loading'", () => {
    expect(
      resolveCatalogViewState({
        status: "loading",
        totalCount: 0,
        filteredCount: 0,
      }),
    ).toBe("loading");
  });

  it("resolves 'error' status to 'error'", () => {
    expect(
      resolveCatalogViewState({
        status: "error",
        totalCount: 0,
        filteredCount: 0,
      }),
    ).toBe("error");
  });

  it("resolves 'success' status with an empty index to 'empty'", () => {
    expect(
      resolveCatalogViewState({
        status: "success",
        totalCount: 0,
        filteredCount: 0,
      }),
    ).toBe("empty");
  });

  it("resolves 'success' status with entries but no filtered matches to 'noResults'", () => {
    expect(
      resolveCatalogViewState({
        status: "success",
        totalCount: 10,
        filteredCount: 0,
      }),
    ).toBe("noResults");
  });

  it("resolves 'success' status with filtered matches to 'populated'", () => {
    expect(
      resolveCatalogViewState({
        status: "success",
        totalCount: 10,
        filteredCount: 3,
      }),
    ).toBe("populated");
  });
});
