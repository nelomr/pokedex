# Proposal

## Why

The app currently has no way to browse Pokémon at all — only a bare shell exists. We need a resilient foundation that fetches the public PokéAPI safely and renders a paginated catalog, so the app is usable end-to-end before search, detail, or deep linking are layered on top.

## What Changes

- Add a resilient HTTP client (`src/api/httpClient.ts`) with an 8s `AbortController` timeout, no retry on `404` (raises `NotFoundError`), and up to 2 retries with exponential backoff + jitter (1s, 2s) on `429`/`5xx`, escalating to `RateLimitError` (last failure `429`) or `NetworkError` (last failure `5xx` or a connection drop).
- Add raw PokéAPI v2 contracts (`src/api/pokeApi.dto.ts`, `DTO`-suffixed), clean UI domain models (`src/domain/pokemon.types.ts`), and custom error types (`src/domain/errors.ts`).
- Add pure mappers (`src/services/pokemonMapper.ts`) that derive a Pokémon's numeric ID from its resource URL and build its official-artwork sprite URL directly, with zero per-Pokemon detail requests for the catalog view.
- Add a Pinia setup store (`src/stores/pokemonList.store.ts`) holding `rawCatalogIndex` (loaded once via `GET /pokemon?limit=100000`), `currentPage`, `pageSize`, `status`, `error`, with `paginatedItems`, `totalPages`, `hasNextPage`, `hasPrevPage` computed, and `initCatalog()` / `goToPage()` actions.
- Add `PokemonGrid.vue`, `PokemonCard.vue`, `PaginationControls.vue`, and a Tailwind Pokedex-themed app shell with loading/error/empty states.
- Register Pinia in `src/main.ts`.

## Capabilities

### New Capabilities
- `pokemon-catalog`: browsing the paginated Pokémon catalog grid (name + official-artwork thumbnail), including loading, error, and empty states.
- `pokeapi-resilience`: HTTP timeout, retry, and error-classification contract governing all requests to the public PokéAPI.

### Modified Capabilities
_None._

## Impact

- New dirs/files: `src/api/httpClient.ts`, `src/api/pokeApi.dto.ts`, `src/domain/pokemon.types.ts`, `src/domain/errors.ts`, `src/services/pokemonMapper.ts`, `src/stores/pokemonList.store.ts`, `src/components/PokemonGrid/PokemonGrid.vue`, `src/components/PokemonCard/PokemonCard.vue`, `src/components/PaginationControls/PaginationControls.vue`.
- Modified files: `src/main.ts` (Pinia registration), `src/App.vue` (app shell).
- Dependencies wired: Pinia (already installed, first usage), Tailwind CSS (already installed, first usage).
- Dependency: none — this is the foundation slice and must be implemented first; changes #2–#4 depend on it.
