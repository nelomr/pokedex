<script setup lang="ts">
interface Props {
  message: string;
  testId: string;
}

defineProps<Props>();
</script>

<template>
  <p :data-testid="testId" class="p-4">{{ message }}</p>
</template>
