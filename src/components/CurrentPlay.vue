<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/game/cards'
import { rankValue, suitValue } from '@/game/cards'
import PlayingCard from './PlayingCard.vue'

const props = withDefaults(
  defineProps<{
    cards: Card[]
    handType?: string
    playedBy?: string
    yourTurn?: boolean
  }>(),
  { yourTurn: false },
)

const TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  pair: 'Pair',
  triple: 'Triple',
  straight: 'Straight',
  flush: 'Flush',
  fullHouse: 'Full House',
  fourOfAKind: 'Four of a Kind',
  straightFlush: 'Straight Flush',
}

const handTypeLabel = computed(() =>
  props.handType ? (TYPE_LABELS[props.handType] ?? props.handType) : undefined,
)

const orderedCards = computed<Card[]>(() => {
  const cards = props.cards
  if (cards.length === 0) return cards
  const type = props.handType

  if (type === 'straight' || type === 'flush' || type === 'straightFlush') {
    return [...cards].sort((a, b) => rankValue[a.rank] - rankValue[b.rank])
  }

  if (type === 'fullHouse' || type === 'fourOfAKind') {
    const byRank: Record<string, Card[]> = {}
    for (const c of cards) (byRank[c.rank] ??= []).push(c)
    const groups = Object.values(byRank).sort((a, b) => b.length - a.length)
    return groups.flat()
  }

  return [...cards].sort(
    (a, b) => rankValue[a.rank] - rankValue[b.rank] || suitValue[a.suit] - suitValue[b.suit],
  )
})
</script>

<template>
  <div class="rounded-2xl bg-white border border-slate-200 shadow-panel px-6 py-5 min-w-[280px]">
    <header class="flex items-center justify-between gap-3 mb-4">
      <span class="text-xs uppercase tracking-[0.18em] font-semibold text-slate-400">
        Current play
      </span>
      <span
        v-if="yourTurn"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700"
      >
        <span class="relative flex w-2 h-2">
          <span
            class="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping"
          />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
        </span>
        Your turn
      </span>
    </header>

    <!--
      Fixed-height stage so the panel doesn't change size between
      "cards on the table" and "table is open." Sized to fit the
      tallest configuration (cards + divider + hand type + name).
    -->
    <div
      class="flex flex-col items-center justify-center min-h-[200px] 2xl:min-h-[230px]"
    >
      <template v-if="orderedCards.length">
        <div class="flex items-center justify-center gap-2 mb-5">
          <PlayingCard v-for="c in orderedCards" :key="c.id" :card="c" size="md" disabled />
        </div>
        <div v-if="handTypeLabel || playedBy" class="flex flex-col items-center">
          <span aria-hidden="true" class="block h-px w-10 bg-slate-200 rounded mb-3" />
          <p v-if="handTypeLabel" class="text-base font-semibold text-slate-800 tracking-tight">
            {{ handTypeLabel }}
          </p>
          <p v-if="playedBy" class="text-xs text-slate-500 mt-0.5">
            Played by
            <span class="font-medium text-slate-700">{{ playedBy }}</span>
          </p>
        </div>
      </template>
      <p v-else class="text-slate-400 text-sm">Table is open. Lead any play.</p>
    </div>
  </div>
</template>
