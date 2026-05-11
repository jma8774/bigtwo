<script setup lang="ts">
import { computed } from 'vue'

type Row = {
  name: string
  cardsLeft: number
  delta: number
  isWinner?: boolean
  rank?: number
}
type ReadyPlayer = { id: string; name: string; ready: boolean; isYou?: boolean }

const props = withDefaults(
  defineProps<{
    open: boolean
    winner: string
    winnerGain: number
    rows: Row[]
    players: ReadyPlayer[]
    humanId: string
    cardValue?: number
    isFinal?: boolean
  }>(),
  { cardValue: 10, isFinal: false },
)

const emit = defineEmits<{ (e: 'ready'): void; (e: 'exit'): void }>()

function fmt(n: number): string {
  const sign = n >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(n)}`
}

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function rowLabel(row: Row): string {
  if (props.isFinal) return row.rank ? `${ordinal(row.rank)} place` : 'Final standing'
  if (row.isWinner) return 'Cleared the hand'
  return `${row.cardsLeft} × $${props.cardValue}`
}

const humanReady = computed(
  () => props.players.find((p) => p.id === props.humanId)?.ready ?? false,
)

const readyCount = computed(() => props.players.filter((p) => p.ready).length)

const buttonLabel = computed(() => {
  if (humanReady.value) {
    return readyCount.value < props.players.length ? 'Waiting for others…' : ''
  }
  return props.isFinal ? "I'm Ready · Play Again" : "I'm Ready · Next Round"
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <p class="text-sm text-slate-500 mb-1 text-center">
          {{ isFinal ? 'Match complete' : 'Round complete' }}
        </p>
        <h2 class="text-2xl font-bold text-slate-900 text-center mb-1">
          {{ winner }} won{{ isFinal ? ' the match' : '' }}
        </h2>
        <p class="text-center text-emerald-600 font-semibold text-lg mb-5">
          {{ fmt(winnerGain) }}
        </p>

        <ul class="rounded-xl border border-slate-200 divide-y divide-slate-100 mb-6 overflow-hidden">
          <li
            v-for="row in rows"
            :key="row.name"
            :class="[
              'flex items-center gap-3 px-4 py-3 text-sm',
              row.isWinner ? 'bg-emerald-50/50' : '',
            ]"
          >
            <div class="flex-1 min-w-0">
              <p
                :class="[
                  'truncate inline-flex items-center gap-1.5',
                  row.isWinner ? 'font-semibold text-slate-900' : 'text-slate-800',
                ]"
              >
                <svg
                  v-if="row.isWinner"
                  class="w-4 h-4 text-amber-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2l2.39 4.84L20 8l-4 3.9L16.94 18 12 15.4 7.06 18 8 11.9 4 8l5.61-1.16L12 2z" />
                </svg>
                {{ row.name }}
              </p>
              <p class="text-xs text-slate-500 mt-0.5 tabular-nums">{{ rowLabel(row) }}</p>
            </div>
            <span
              :class="[
                'font-semibold tabular-nums text-base',
                row.delta > 0
                  ? 'text-emerald-600'
                  : row.delta < 0
                    ? 'text-rose-500'
                    : 'text-slate-500',
              ]"
              >{{ fmt(row.delta) }}</span
            >
          </li>
        </ul>

        <template v-if="!isFinal">
          <div class="mb-5">
            <p class="text-xs uppercase tracking-wide text-slate-400 font-semibold text-center mb-3">
              Ready check · {{ readyCount }} / {{ players.length }}
            </p>
            <ul class="flex items-center justify-center gap-3">
              <li v-for="p in players" :key="p.id" class="relative w-10 h-10">
                <span
                  :class="[
                    'w-10 h-10 rounded-full grid place-items-center transition-colors',
                    p.ready
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300',
                  ]"
                >
                  <svg
                    v-if="p.ready"
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span
                  :class="[
                    'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full grid place-items-center text-[10px] font-semibold border-2 border-white',
                    p.isYou ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-700',
                  ]"
                  :aria-label="p.name"
                >
                  {{ p.name.charAt(0).toUpperCase() }}
                </span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            class="w-full px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            :disabled="humanReady"
            @click="emit('ready')"
          >
            {{ buttonLabel || 'Waiting…' }}
          </button>
        </template>

        <template v-else>
          <p class="text-center text-sm text-slate-500 mb-4">
            Thanks for playing. Head back to start a new match.
          </p>
          <button
            type="button"
            class="w-full px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-2"
            @click="emit('exit')"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12L12 3l9 9" />
              <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
            </svg>
            Back to Home
          </button>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active {
  transition:
    opacity 200ms ease,
    transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-leave-active {
  transition:
    opacity 160ms ease,
    transform 200ms ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
