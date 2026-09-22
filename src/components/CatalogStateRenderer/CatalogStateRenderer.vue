<script setup lang="ts">
import type { StateEntry } from "./StateEntry";

interface Props {
  entry: StateEntry;
}

defineProps<Props>();
</script>

<template>
  <component
    :is="entry.component"
    v-bind="entry.props"
    v-on="entry.listeners ?? {}"
  />
</template>
