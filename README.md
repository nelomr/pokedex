# ⚡ PokéBrowser — Vue 3 + TypeScript + Pinia

> Navegador ágil y resiliente de Pokémon construido sobre **PokéAPI v2**, diseñado con foco en accesibilidad (WAI-ARIA), desacoplamiento arquitectónico, sincronización de estado mediante URLs y tolerancia a fallos de red.

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pinia](https://img.shields.io/badge/Pinia-State_Management-FFD859?logo=pinia&logoColor=black)](https://pinia.vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

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
