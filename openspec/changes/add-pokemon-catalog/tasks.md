# Tasks

## 1. Foundations

- [x] 1.1 Wire Tailwind CSS into the Vite build (entry stylesheet import, config) and verify a utility class renders correctly in `App.vue` when running `pnpm dev`
- [x] 1.2 Register Pinia in `src/main.ts` and verify `pnpm build` (vue-tsc typecheck) succeeds with no runtime error on `pnpm dev`
- [x] 1.3 Add domain error classes (`AppError`, `NotFoundError`, `RateLimitError`, `NetworkError`) in `src/domain/errors.ts` and verify `pnpm build` typechecks with each class extending `Error` and carrying a literal discriminant field
- [x] 1.4 Add domain types (`PokemonCardItem`, catalog status/error shapes) in `src/domain/pokemon.types.ts` and verify `pnpm build` typechecks with no `any` or type assertions
- [x] 1.5 Add raw PokéAPI DTO contracts (`NamedAPIResourceDTO`, catalog list response DTO) in `src/api/pokeApi.dto.ts`, `DTO`-suffixed, and verify `pnpm build` typechecks

## 2. HTTP Client (TDD)

- [x] 2.1 Write failing tests for `src/api/httpClient.ts` in `src/api/httpClient.spec.ts` covering: a `404` response throws `NotFoundError` after exactly one `fetch` call (assert call count); `429` and `500` responses are retried up to 2 times using fake timers (`vi.useFakeTimers()`) with waits of ~1s then ~2s before each retry; exhausted retries classify the last failure into `RateLimitError` (last `429`) or `NetworkError` (last `5xx`); a dropped connection surfaces `NetworkError`; a request exceeding 8s is aborted via `AbortController` and surfaces `NetworkError`; a success on retry #1 resolves normally — verify with `pnpm test` showing all new tests failing (red)
- [x] 2.2 Implement `src/api/httpClient.ts` (8s `AbortController` timeout per attempt, no retry on 404, up to 2 retries with exponential backoff + jitter on 429/5xx/connection drop, last-failure classification) to make the tests from 2.1 pass — verify with `pnpm test` showing all httpClient tests green

## 3. Mapper (TDD)

- [x] 3.1 Write failing tests for `src/services/pokemonMapper.ts` in `src/services/pokemonMapper.spec.ts` covering: numeric ID extraction from a well-formed resource URL with a trailing slash; ID extraction from a resource URL without a trailing slash; `null` (not `NaN`) returned for a malformed or unexpected URL shape; the composed official-artwork sprite URL for Pokémon ID 1; the composed sprite URL for Pokémon ID 25 — verify with `pnpm test` showing all new tests failing (red)
- [x] 3.2 Implement `src/services/pokemonMapper.ts` (URL-based ID extraction returning `number | null`, sprite URL composition, DTO-to-`PokemonCardItem` mapping) to make the tests from 3.1 pass — verify with `pnpm test` showing all mapper tests green

## 4. Store (TDD)

- [x] 4.1 Write failing tests for `src/stores/pokemonList.store.ts` in `src/stores/pokemonList.store.spec.ts`, each using a fresh `createPinia()`, covering: `paginatedItems` returns the first 20 entries on page 1; the last page returns a partial slice when the index length is not a multiple of `pageSize`; `totalPages` is correct for an index length that is an exact multiple of `pageSize` and for one with a remainder; `hasNextPage`/`hasPrevPage` are correctly `false`/`true` at each boundary (first page, last page); an empty index produces zero `totalPages` and disabled navigation in both directions; `goToPage()` clamps out-of-range input (below 1, above `totalPages`) to the nearest valid page; `initCatalog()` issues exactly one call to the mocked HTTP client and populates `rawCatalogIndex`; a second call to `initCatalog()` is a no-op (call count stays at one) when the index is already loaded; a rejected `initCatalog()` call sets `status: 'error'` with the specific error class (`NotFoundError`, `RateLimitError`, `NetworkError`) preserved in `error` — verify with `pnpm test` showing all new tests failing (red)
- [x] 4.2 Implement `src/stores/pokemonList.store.ts` as a Pinia setup store (`rawCatalogIndex`, `currentPage`, `pageSize`, `status`, `error` state; `paginatedItems`, `totalPages`, `hasNextPage`, `hasPrevPage` computed; `initCatalog()` cold-load guard and `goToPage()` actions) to make the tests from 4.1 pass — verify with `pnpm test` showing all store tests green

_Commit boundary: split groups 1–2 (foundations + HTTP client) from groups 3–4 (mapper + store) if the combined diff approaches the 400-line CLAUDE.md limit._

## 5. Components

- [x] 5.1 Implement `PokemonCard.vue` (name, thumbnail `img` with `alt` set to the Pokémon name, `loading="lazy"`, `error`-event fallback to a local placeholder image) and verify by rendering it in `pnpm dev` with a known sprite URL and with a deliberately broken URL, confirming the placeholder swap
- [x] 5.2 Implement `PokemonGrid.vue` consuming `PokemonCardItem[]` and rendering a `PokemonCard` per entry, and verify with a component test (`@vue/test-utils`) asserting one `PokemonCard` is rendered per item in the passed array
- [x] 5.3 Implement `PaginationControls.vue` (current page, total pages, forward/backward navigation disabled at boundaries per spec) and verify with a component test asserting backward navigation is disabled on page 1, forward navigation is disabled on the last page, and both are enabled mid-range
- [x] 5.4 Wire the Tailwind Pokedex-themed app shell in `App.vue`, calling `initCatalog()` on mount and rendering distinct loading, error (with retry action and message matching the failure class), empty, and populated states per `pokemon-catalog` spec — verify with a component test asserting each of the four states renders distinguishable content for its corresponding store `status`/`error`

_Commit boundary: keep `PokemonCard.vue` + `PokemonGrid.vue` (5.1–5.2) as one commit and `PaginationControls.vue` + `App.vue` (5.3–5.4) as a second if the combined diff approaches 400 lines._

## 6. Integration Verification

- [x] 6.1 Run `pnpm test`, `pnpm build` (vue-tsc typecheck), and `pnpm lint`, and verify all three complete with no errors
- [x] 6.2 Manually load the app in a browser with devtools network tab open and verify exactly one catalog request (`GET /pokemon?limit=100000`) is issued on load, zero additional per-card requests are made while browsing pages, and paginating, retrying after a simulated failure, and the empty/loading/error states behave as specified
