# ⚡ PokéBrowser — Vue 3 + TypeScript + Pinia

> Navegador ágil y resiliente de Pokémon construido sobre **PokéAPI v2**, diseñado con foco en accesibilidad (WAI-ARIA), desacoplamiento arquitectónico, sincronización de estado mediante URLs y tolerancia a fallos de red.

[![Vue 3](https://img.shields.io/badge/Vue-3.5.42-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pinia](https://img.shields.io/badge/Pinia-State_Management-FFD859?logo=pinia&logoColor=black)](https://pinia.vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## Rutas (URLs)

La app usa dos rutas:

- `/`: listado principal, con filtros, búsqueda y paginación.
- `/pokemon/:idOrName`: detalle de un Pokémon concreto, identificado por su ID numérico o su nombre (ej. `/pokemon/25` o `/pokemon/pikachu`). Es la ruta que abre directamente el modal de detalle, permitiendo compartir o refrescar el enlace sin perder el contexto.

## Scripts del proyecto

- `pnpm install`: instala las dependencias.
- `pnpm dev`: levanta el servidor de desarrollo (Vite).
- `pnpm build`: compila tipos con `vue-tsc` y genera el build de producción.
- `pnpm preview`: sirve localmente el build de producción.
- `pnpm test`: ejecuta los tests una vez (Vitest).
- `pnpm test:watch`: ejecuta los tests en modo watch.
- `pnpm lint`: comprueba estilo y formato (ESLint + Prettier).

## Cómo has estructurado tu(s) store(s) de Pinia y por qué

He dividido el estado en dos stores:

La primera PokemonList: que guarda la vista general, se encarga de filtrar, el buscador y el paginado.

La segunda PokemonDetail: Gurda las fichas completas del detalle de los pokemon que el usuario ya ha visitado.

El porque de separarlas, fundamentalmente porque pertenencen a ciclos distintos. Dado que el listado se renderiza y cambia con casi cada acción, de filtrado, busqueda... esta mutando constantemente. De esta forma evitamos rerenders inecesarios en el modal y los detalles.

## Tu estrategia de manejo de errores

Principalmente diferenciar errores definitvos como son el 404 o transitorios como el rate limit.

Se permite reconexion mediante un boton si falla. Y los errores del detalle de los pokemons estan aislados dentro del modal, permitiendo cerrarlo en caso de que falle.

Si la api tarda demasiado corto la peticion, para que no se quede cargando infinito.

## Qué has probado con tests

Al pedir a los agentes que usarn TDD estricoto para crear las funcionalidades han salido mas test de los esperados. Pero siguen siendo validos.

Los que se pidieron a nivel de spcecs fueron 3 niveles:

Lógica Pura y Dominio: Mappers (cálculos de peso/altura, extracción de IDs y null-safety).

Infraestructura y Red: Cliente HTTP (timeouts, reintentos con backoff y 404 directo).

Capa de Aplicación y UI:

Estado: Stores de Pinia (filtros en memoria y caché de detalles).

Contrato de Componente: Accesibilidad mínima (tabindex="0", role="button") y emisión de eventos (select).
