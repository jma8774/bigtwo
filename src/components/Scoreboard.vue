<script setup lang="ts">
type Row = { name: string; total: number; you?: boolean }

defineProps<{ rows: Row[] }>()

function fmt(n: number): string {
  const sign = n >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(n)}`
}
</script>

<template>
  <div class="rounded-2xl bg-white border border-slate-200 shadow-panel">
    <div class="px-4 py-3 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Scoreboard</h3>
    </div>
    <ul class="divide-y divide-slate-100">
      <li
        v-for="row in rows"
        :key="row.name"
        class="px-4 py-2.5 flex items-center justify-between"
      >
        <span :class="['text-sm', row.you ? 'font-semibold text-slate-900' : 'text-slate-700']">{{
          row.name
        }}</span>
        <span
          :class="[
            'text-sm font-semibold',
            row.total === 0
              ? 'text-slate-500'
              : row.total > 0
                ? 'text-emerald-600'
                : 'text-rose-500',
          ]"
          >{{ fmt(row.total) }}</span
        >
      </li>
    </ul>
  </div>
</template>
