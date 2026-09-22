# Instructions for Claude Code / Project Guide: Pokémon Browser

## 1. Spec-Driven Workflow (OpenSpec) - MANDATORY

- This project strictly follows Spec-Driven Development using OpenSpec.
- **Source of truth:** All functional requirements, API contracts, domain models, and acceptance criteria live in `openspec/`.
- **Protocol:**
  1. Always consult the relevant spec in `openspec/` before writing or proposing code.
  2. Never implement features or API contracts that contradict or are absent from `openspec/`.
  3. If a requirement is ambiguous, propose updating the spec first.
  4. Small commits no more 400 lines.

## 2. Core Stack & Constraints

- **Framework:** Vite + Vue 3 (`<script setup>` + TypeScript strict).
- **State:** Pinia native (do NOT install TanStack Query or Pinia Colada).
- **Routing:** vue-router (used for the Pokémon detail route / deep link).
- **Styling:** Tailwind CSS.
- **Testing:** Vitest + @vue/test-utils.

## 3. Developer Commands

- `pnpm dev` - Start Vite development server
- `pnpm build` - Type-check with `vue-tsc` and build for production
- `pnpm test` - Run unit tests with Vitest
- `pnpm lint` - Run ESLint / Prettier checks

## 4. Coding Standards

- Clean / Hexagonal separation: keep API infrastructure (DTOs/HTTP) isolated from UI domain models via mappers.
- Strict TypeScript: no `any` or loose type assertions (`as unknown as T`).
- Accessibility: dialogs and modals must follow WAI-ARIA standards.

## 5. Testing Methodology

- Follow TDD (red-green-refactor) when implementing OpenSpec tasks: write a failing test first, then the minimal code to pass it.
- Keep tests few and high-value: cover behavior that would break the feature if wrong. Skip trivial getters/setters, framework wiring, and pure styling.

### 6. Component Naming & Architecture

- **Multi-word component names (Mandatory):** Always use multi-word names for all components to prevent collisions with existing and future HTML elements (e.g., `PokemonCard.vue`, `PokemonGrid.vue`, `SearchBar.vue`—never `Card.vue` or `List.vue`). The only allowed exception is the root `App.vue`.
- **PascalCase for files and templates:** Name component files in PascalCase (`PokemonModal.vue`) and invoke them in templates using PascalCase (`<PokemonModal />`) to clearly distinguish them from standard HTML tags.
- **Base / UI-agnostic components:** Prefix pure, reusable UI elements with `Base` (e.g., `BaseModal.vue`, `BaseInput.vue`, `BaseBadge.vue`).
- **Tightly coupled children:** Prefix child components with their parent's name to express context (e.g., `PokemonList.vue` -> `PokemonListItem.vue`).

### 7. Script Setup, Props & Emits

- **Type-based declaration:** Always use pure TypeScript interfaces with `defineProps<Props>()` and `defineEmits<Emits>()`. Avoid runtime object declarations.
- **Idiomatic default props:** Use native reactive destructuring for defaults:
  ```typescript
  interface Props {
    pageSize?: number;
    showImage?: boolean;
  }

  const { pageSize = 20, showImage = true } = defineProps<Props>();
  ```
