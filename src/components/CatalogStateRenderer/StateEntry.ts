import type { Component } from "vue";

type StateListeners = Record<string, (...args: unknown[]) => void>;

type ComponentProps<C> = C extends new (...args: never[]) => {
  $props: infer P extends object;
}
  ? P
  : never;

export interface StateEntry {
  component: Component;
  props?: object;
  listeners?: StateListeners;
}

export function defineStateEntry<C extends Component>(
  component: C,
  props: ComponentProps<C>,
  listeners?: StateListeners,
): StateEntry {
  return { component, props, listeners };
}
