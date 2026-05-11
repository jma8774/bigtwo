<script setup lang="ts">
type Entry = { id: string; message: string; ago: string; kind?: 'play' | 'pass' | 'system' }

defineProps<{ entries: Entry[] }>()

function dotColor(kind?: Entry['kind']): string {
  if (kind === 'pass') return 'bg-slate-300'
  if (kind === 'system') return 'bg-amber-400'
  return 'bg-brand-500'
}
</script>

<template>
  <div class="rounded-2xl bg-white border border-slate-200 shadow-panel">
    <div class="px-4 py-3 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Move Log</h3>
    </div>
    <ul class="px-4 py-2 space-y-2 max-h-72 overflow-y-auto">
      <li v-for="entry in entries" :key="entry.id" class="flex items-start gap-2 text-sm">
        <span :class="['mt-1.5 w-2 h-2 rounded-full shrink-0', dotColor(entry.kind)]" />
        <span class="text-slate-700 flex-1">{{ entry.message }}</span>
        <span class="text-xs text-slate-400 whitespace-nowrap">{{ entry.ago }}</span>
      </li>
    </ul>
  </div>
</template>
