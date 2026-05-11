<script setup lang="ts">
withDefaults(
  defineProps<{
    canPlay?: boolean
    canPass?: boolean
  }>(),
  { canPlay: false, canPass: false },
)

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pass'): void
  (e: 'sort', by: 'rank' | 'suit' | 'smart'): void
}>()
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        :disabled="!canPlay"
        @click="emit('play')"
      >
        ▶ Play Selected
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="!canPass"
        @click="emit('pass')"
      >
        ⊘ Pass
      </button>
      <span class="mx-2 h-6 w-px bg-slate-200" />
      <button
        type="button"
        class="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        @click="emit('sort', 'rank')"
      >
        ↕ Sort by Rank
      </button>
      <button
        type="button"
        class="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        @click="emit('sort', 'suit')"
      >
        ♣ Sort by Suit
      </button>
      <button
        type="button"
        class="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        @click="emit('sort', 'smart')"
      >
        ⛁ Smart Sort
      </button>
    </div>
  </div>
</template>
