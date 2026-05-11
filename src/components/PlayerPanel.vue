<script setup lang="ts">
import { computed } from 'vue'

export type PlayerStatus = 'turn' | 'disconnected'

const props = withDefaults(
  defineProps<{
    name: string
    initials?: string
    cardCount: number
    score: number
    status?: PlayerStatus
    active?: boolean
    thinking?: boolean
  }>(),
  { active: false, thinking: false },
)

const scoreLabel = computed(() => {
  const sign = props.score >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(props.score)}`
})

const scoreColor = computed(() =>
  props.score === 0 ? 'text-slate-500' : props.score > 0 ? 'text-emerald-600' : 'text-rose-500',
)

const initials = computed(() => props.initials ?? props.name.slice(0, 1).toUpperCase())

const isTurn = computed(() => props.status === 'turn' || props.active)
const isDisconnected = computed(() => props.status === 'disconnected')
</script>

<template>
  <div
    :class="[
      'w-full rounded-2xl bg-white border shadow-panel p-4 2xl:p-5 flex items-center gap-4 2xl:gap-5 transition-all',
      isDisconnected
        ? 'border-rose-300 bg-rose-50/40'
        : isTurn
          ? 'border-brand-500 ring-2 ring-brand-100'
          : 'border-slate-200',
    ]"
  >
    <div
      :class="[
        'w-11 h-11 2xl:w-14 2xl:h-14 rounded-full grid place-items-center font-semibold 2xl:text-lg shrink-0',
        isDisconnected ? 'bg-rose-100 text-rose-400' : 'bg-slate-100 text-slate-700',
      ]"
    >
      {{ initials }}
    </div>

    <div class="flex-1 min-w-0">
      <p
        :class="[
          'font-medium 2xl:text-lg truncate',
          isDisconnected ? 'text-slate-400' : 'text-slate-900',
        ]"
      >
        {{ name }}
      </p>
      <p
        :class="[
          'text-sm 2xl:text-base font-semibold',
          isDisconnected ? 'text-slate-400' : scoreColor,
        ]"
      >
        {{ scoreLabel }}
      </p>

      <!-- Reserve a constant-height slot so the panel doesn't pop in/out as state changes. -->
      <div class="mt-1.5 h-5 flex items-center">
        <p
          v-if="isTurn && !isDisconnected"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700"
        >
          <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span class="inline-flex items-baseline">
            {{ thinking ? 'Thinking' : 'Their turn' }}
            <span v-if="thinking" class="thinking-dots ml-0.5" aria-hidden="true">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </span>
        </p>
        <p
          v-else-if="isDisconnected"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600"
        >
          <svg
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Disconnected
        </p>
      </div>
    </div>

    <div class="text-right shrink-0 pl-2">
      <p
        :class="[
          'text-3xl 2xl:text-4xl font-bold tabular-nums leading-none',
          isDisconnected ? 'text-slate-400' : 'text-slate-900',
        ]"
      >
        {{ cardCount }}
      </p>
      <p class="text-xs 2xl:text-sm text-slate-500 mt-1">cards</p>
    </div>
  </div>
</template>

<style scoped>
.thinking-dots span {
  display: inline-block;
  animation: thinking-blink 1.2s infinite;
}
.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes thinking-blink {
  0%,
  60%,
  100% {
    opacity: 0.25;
  }
  30% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .thinking-dots span {
    animation: none;
    opacity: 1;
  }
}
</style>
