# Pokédex — Initial Specs

## 1. Estructura del Proyecto

Separamos infraestructura, dominio y componentes para no acoplar la UI a la API externa:

- **`src/api/`** — Capa de red.
  - `httpClient.ts`: Fetch con reintentos automáticos, timeout y tipado de errores.
  - `pokeApi.dto.ts`: Contratos crudos de PokéAPI v2 (tipos con sufijo `DTO`).
- **`src/domain/`** — Reglas y contratos de nuestra app.
  - `pokemon.types.ts`: Modelos limpios para la UI (`PokemonCardItem`, `PokemonDetail`, etc.).
  - `errors.ts`: Errores custom (`NotFoundError`, `RateLimitError`, `NetworkError`).
- **`src/services/`** — Transformación de datos.
  - `pokemonMapper.ts`: Funciones puras que convierten los DTOs de la API en nuestros modelos de dominio.
    Utiliza algo como esto para evitar peticiones HTTP innecesarias:

    ```ts
    const SPRITE_BASE_URL =
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'
    ```

    Ejemplo:
    - ID 1 → `.../official-artwork/1.png`
    - ID 25 (Pikachu) → `.../official-artwork/25.png`
- **`src/stores/`**
  - `pokemonList.store.ts`: Catálogo, búsqueda, filtros y paginación.
  - `pokemonDetail.store.ts`: Caché de Pokémon consultados (Identity Map).
- **`src/composables/`** — Lógica compartida (`useAccessibleModal`, `useDebounce`).
- **`src/components/`** — Componentes base reutilizables y específicos de Pokémon.

## 2. Estado con Pinia (Setup Stores)

Usamos la sintaxis `defineStore('id', () => { ... })` dividida en dos stores para no mezclar responsabilidades:

### `pokemonList.store.ts` (Listado y Navegación)

**Estado:**
- `rawCatalogIndex`: Lista ligera con todos los nombres (`/pokemon?limit=100000`) descargada una sola vez para permitir búsquedas instantáneas sin saturar la red.
- `searchQuery`, `selectedType`, `currentPage` (1-indexed), `pageSize` (20), `status` y `error`.

**Getters / Computed:**
- `filteredList`: Resultado de cruzar búsqueda por texto y filtro por tipo. Búsqueda y paginación son 100% client-side sobre `rawCatalogIndex`: PokéAPI no soporta búsqueda parcial por nombre, solo el listado básico (`GET /pokemon?limit=10000`), así que esa es la única llamada ligera al iniciar la app y todo el filtrado ocurre en memoria.
- `paginatedItems`: Slice de la página actual para renderizar en la vista.
- `totalPages`, `hasNextPage`, `hasPrevPage`.
- `availableTypes`: Lista de tipos disponibles para poblar el selector de filtro.
- `typeIndex: Map<string, Set<number>>`: IDs de Pokémon por tipo, construido a partir de `GET /type/{type}` (cada respuesta trae su lista `pokemon` con `name`/`url`, de donde se extrae el ID). El filtro por tipo cruza este mapa con `rawCatalogIndex`; nunca se pide el detalle individual de cada Pokémon solo para filtrar.

**Acciones:**
- `initCatalog()`: Carga el índice global en frío si aún no existe.
- `setSearchQuery()` y `setTypeFilter()`: Aplican filtros y resetean la página a 1. `setTypeFilter()` carga bajo demanda (y cachea) el `typeIndex` del tipo seleccionado si aún no se ha pedido.
- `goToPage()`: Control de navegación entre páginas.

### `pokemonDetail.store.ts` (Caché de Detalles)

**Estado:**
- `cache: Map<string | number, PokemonDetail>` para guardar Pokémon ya visitados.
- `loadingIds: Set<string | number>` para evitar peticiones duplicadas en vuelo.
- `errors: Map<string | number, AppError>`.

**Acciones:**
- `getPokemonDetail(idOrName)`: Si ya está en la caché, se devuelve al instante sin tocar la red. Si no, lanza la petición, mapea a dominio y lo guarda tanto por ID como por nombre.

## 3. Resiliencia de Red y Manejo de Errores

PokéAPI es pública y tiene rate limits. El cliente HTTP debe ser tolerante a fallos:

**Distinción de errores:**
- `404 Not Found`: Error definitivo. No se reintenta y se lanza `NotFoundError` para mostrar mensaje de "No encontrado" en UI.
- `429 Too Many Requests` o `5xx`: Error transitorio. Se reintenta hasta 2 veces con backoff exponencial + jitter (esperas de 1s, 2s). Si se agotan los reintentos y el último fallo fue un 429, se lanza `RateLimitError`; si fue un 5xx, se lanza `NetworkError`.
- Cortes de conexión o caídas: Se lanza `NetworkError`.
- Timeout con `AbortController`: Cortar peticiones tras 8 segundos para no colgar la UI.
- Cero peticiones en cascada (waterfall): En el listado no pedimos el detalle de cada Pokémon solo para ver la foto; derivamos el ID de la URL y cargamos directo el arte oficial (official-artwork).

## 4. UI, Accesibilidad y Deep Linking

**Modal Accesible (WAI-ARIA):**
- Rol `dialog`, `aria-modal="true"` y título asociado con `aria-labelledby`.
- Atrapa el foco dentro del modal (Tab / Shift+Tab) y lo devuelve al elemento que lo abrió al cerrarse.
- Cierre con tecla Escape y clic fuera.
- Bloqueo de scroll en el body compensando el ancho de la scrollbar para que no haya saltos visuales.

**Deep Link:** Se añade `vue-router` como dependencia para gestionar la ruta del detalle (`/pokemon/:idOrName` o `?detail=id` como query param sobre la ruta del listado, según se resuelva el diseño del modal). La navegación entre listado y detalle pasa por el router, de modo que recargar (F5) o compartir el enlace resuelve la carga en frío directamente contra `pokemonDetail.store.ts`.

**Búsqueda fluida:** Debounce de 300ms en el input de texto para no disparar filtros en cada pulsación.

## 5. Testing con Vitest

Priorizar tests de valor donde suele haber bugs:

- Tests unitarios de mappers (`pokemonMapper.test.ts`): validar cálculos de altura/peso, extracción de IDs y estructura limpia. PokéAPI no devuelve las medidas en el sistema internacional. Verificación de nulls o NaN.
- Tests del cliente HTTP: simular respuestas 404 (sin reintentos) frente a 429/500 (reintentos automáticos).
- Tests de stores: validar aislamiento de la caché y comportamiento de los filtros y paginación.
- Tests del modal accesible (`useAccessibleModal.test.ts`): focus trap (Tab/Shift+Tab), cierre con Escape y clic fuera, y devolución del foco al elemento que abrió el modal.
- Tests de deep linking: al montar la app con `?detail=id` (o la ruta `/pokemon/:idOrName`) en la URL, el detalle se resuelve en frío contra `pokemonDetail.store.ts` sin pasar por el listado.

## 6. Estilo (TailwindCSS)

Con TailwindCSS buscamos un estilo fresco y acoplado a la temática Pokémon, con el objetivo de simular una Pokedex con el buscador y las reglas que hemos definido. Al tener un modal como detalle ten en cuenta esto a al hora de diseñar el estilo y los componentes UI, que tenga sentido la construccion.
