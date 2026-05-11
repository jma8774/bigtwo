<script setup lang="ts">
import PlayingCard from './PlayingCard.vue'
import type { Card } from '@bigtwo/shared'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({
  id: `${rank}-${suit}-rules`,
  rank,
  suit,
})

const rankRow: Card[] = [
  c('3', 'diamonds'),
  c('4', 'clubs'),
  c('5', 'hearts'),
  c('6', 'spades'),
  c('7', 'diamonds'),
  c('8', 'clubs'),
  c('9', 'hearts'),
  c('10', 'spades'),
  c('J', 'diamonds'),
  c('Q', 'clubs'),
  c('K', 'hearts'),
  c('A', 'spades'),
  c('2', 'spades'),
]

const examples: { title: string; cards: Card[] }[] = [
  { title: 'Single', cards: [c('5', 'hearts')] },
  { title: 'Pair', cards: [c('K', 'clubs'), c('K', 'spades')] },
  {
    title: 'Triple',
    cards: [c('7', 'diamonds'), c('7', 'clubs'), c('7', 'hearts')],
  },
  {
    title: 'Straight',
    cards: [c('4', 'diamonds'), c('5', 'clubs'), c('6', 'hearts'), c('7', 'spades'), c('8', 'diamonds')],
  },
  {
    title: 'Flush',
    cards: [c('3', 'hearts'), c('6', 'hearts'), c('9', 'hearts'), c('J', 'hearts'), c('K', 'hearts')],
  },
  {
    title: 'Full House',
    cards: [c('8', 'diamonds'), c('8', 'clubs'), c('8', 'hearts'), c('4', 'spades'), c('4', 'diamonds')],
  },
  {
    title: 'Four of a Kind',
    cards: [
      c('Q', 'diamonds'),
      c('Q', 'clubs'),
      c('Q', 'hearts'),
      c('Q', 'spades'),
      c('2', 'diamonds'),
    ],
  },
  {
    title: 'Straight Flush',
    cards: [c('5', 'spades'), c('6', 'spades'), c('7', 'spades'), c('8', 'spades'), c('9', 'spades')],
  },
]
</script>

<template>
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div
          class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10"
        >
          <div>
            <h2 class="text-xl font-semibold text-slate-900">Rules</h2>
            <p class="text-sm text-slate-500">Learn how to play Big Two.</p>
          </div>
          <button
            type="button"
            class="text-slate-500 hover:text-slate-900 text-xl leading-none w-8 h-8 rounded-lg hover:bg-slate-100 grid place-items-center"
            @click="emit('close')"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <article class="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                </svg>
              </span>
              <h3 class="font-semibold text-slate-900">Goal</h3>
            </div>
            <p class="text-sm text-slate-700">
              Be the first player to get rid of all of your cards. The last player with cards loses.
            </p>
          </article>

          <article class="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
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
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
              </span>
              <h3 class="font-semibold text-slate-900">Card Order (Rank)</h3>
            </div>
            <p class="text-xs text-slate-500 mb-3">Lowest to highest.</p>
            <div class="flex gap-1 flex-wrap">
              <PlayingCard v-for="card in rankRow" :key="card.id" :card="card" size="sm" disabled />
            </div>
          </article>

          <article class="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 grid place-items-center">
                <span class="text-base">♥</span>
              </span>
              <h3 class="font-semibold text-slate-900">Suit Order</h3>
            </div>
            <p class="text-xs text-slate-500 mb-3">Used when ranks are equal. Lowest to highest.</p>
            <div class="flex items-center gap-3 text-2xl">
              <span class="text-suit-red">♦</span>
              <span class="text-slate-300">&lt;</span>
              <span class="text-suit-black">♣</span>
              <span class="text-slate-300">&lt;</span>
              <span class="text-suit-red">♥</span>
              <span class="text-slate-300">&lt;</span>
              <span class="text-suit-black">♠</span>
            </div>
          </article>

          <article class="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 grid place-items-center">
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
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
              <h3 class="font-semibold text-slate-900">Turn Flow</h3>
            </div>
            <ul class="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
              <li>First round starts with the holder of 3♦.</li>
              <li>Each play must match the type and count of the current play, and beat it.</li>
              <li>You can pass to skip. Once you pass, you can't play again until the trick resets.</li>
              <li>When all opponents pass, the last player to play leads the next trick.</li>
            </ul>
          </article>

          <article class="rounded-2xl bg-slate-50 border border-slate-200 p-5 md:col-span-2">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">
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
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              <h3 class="font-semibold text-slate-900">Valid Plays</h3>
            </div>
            <p class="text-xs text-slate-500 mb-4">
              A play must match the type and beat the previous play.
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-for="ex in examples" :key="ex.title" class="rounded-xl bg-white border border-slate-200 p-3">
                <p class="text-xs font-semibold text-slate-700 mb-2 text-center">{{ ex.title }}</p>
                <div class="flex gap-0.5 justify-center">
                  <PlayingCard v-for="card in ex.cards" :key="card.id" :card="card" size="sm" disabled />
                </div>
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-3">
              A 5-card hand beats another 5-card hand by strength: Straight &lt; Flush &lt; Full House &lt;
              Four of a Kind &lt; Straight Flush.
            </p>
          </article>

          <article class="rounded-2xl bg-slate-50 border border-slate-200 p-5 md:col-span-2">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
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
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              <h3 class="font-semibold text-slate-900">Scoring</h3>
            </div>
            <p class="text-sm text-slate-700 mb-3">
              Simple scoring: each losing player pays
              <b>cards remaining × card value</b>. The winner gains the total.
            </p>
            <div class="rounded-lg bg-white border border-slate-200 p-3 text-sm text-slate-600">
              <p>
                Example: 4 cards left at <b>$10/card</b> → <span class="text-rose-500">-$40</span>.
              </p>
              <p class="text-xs text-slate-400 mt-1">Winner gains the sum of everyone's losses.</p>
            </div>
          </article>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-end sticky bottom-0 bg-white">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            @click="emit('close')"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
