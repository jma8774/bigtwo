<script setup lang="ts">
// Placeholder. Wired up in TICKET-007 (multiplayer).
defineProps<{ connected: boolean }>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 text-xs font-medium',
      connected ? 'text-emerald-600' : 'text-rose-500',
    ]"
  >
    <span :class="['w-2 h-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-rose-500']" />
    {{ connected ? 'Connected' : 'Disconnected' }}
  </span>
</template>
