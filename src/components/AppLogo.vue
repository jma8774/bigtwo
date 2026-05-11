<script setup lang="ts">
defineProps<{ size?: 'sm' | 'md' }>()
</script>

<template>
  <div class="flex items-center gap-2 select-none">
    <div
      :class="[
        'rounded-lg bg-brand-600 text-white grid place-items-center font-bold',
        size === 'sm' ? 'w-7 h-7 text-base' : 'w-8 h-8 text-lg',
      ]"
    >
      ♠
    </div>
    <span :class="['font-semibold text-slate-900', size === 'sm' ? 'text-base' : 'text-lg']">
      Big Two
    </span>
  </div>
</template>
