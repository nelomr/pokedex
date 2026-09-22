import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { PokemonDetailModal } from "../components";
import PokemonCatalogView from "../views/PokemonCatalogView.vue";
import { ROUTE_NAMES } from "./routeNames";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: ROUTE_NAMES.pokemonCatalog,
    component: PokemonCatalogView,
    children: [
      {
        path: "pokemon/:idOrName",
        name: ROUTE_NAMES.pokemonDetail,
        component: PokemonDetailModal,
        props: true,
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
