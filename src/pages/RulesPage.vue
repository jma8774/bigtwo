<script setup lang="ts">
import { ref } from 'vue'
import AppTopBar from '@/components/AppTopBar.vue'

type SectionKey = 'goal' | 'cardOrder' | 'suitOrder' | 'validPlays' | 'turnFlow' | 'scoring'

const active = ref<SectionKey>('goal')

const sections: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'goal', label: 'Goal', icon: '◎' },
  { key: 'cardOrder', label: 'Card Order', icon: '↕' },
  { key: 'suitOrder', label: 'Suit Order', icon: '♠' },
  { key: 'validPlays', label: 'Valid Plays', icon: '▦' },
  { key: 'turnFlow', label: 'Turn Flow', icon: '→' },
  { key: 'scoring', label: 'Scoring', icon: '$' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppTopBar :roomCode="'AB7K'" :roundNumber="4" showRules showLeave />

    <main class="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
      <aside class="space-y-1">
        <button
          v-for="s in sections"
          :key="s.key"
          type="button"
          @click="active = s.key"
          :class="[
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            active === s.key
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          ]"
        >
          <span class="w-5 inline-block text-center">{{ s.icon }}</span>
          {{ s.label }}
        </button>
        <div class="pt-6">
          <p class="text-xs text-slate-500 mb-1">Need help?</p>
          <p class="text-xs text-slate-400">Still have questions about a rule? Open the Rules modal from any screen.</p>
        </div>
      </aside>

      <section>
        <h1 class="text-2xl font-bold text-slate-900 mb-2">Rules</h1>
        <p class="text-sm text-slate-500 mb-6">
          Learn how to play Big Two. Click a topic on the left to explore.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-panel">
            <h2 class="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span class="text-brand-600">◎</span> Goal
            </h2>
            <p class="text-sm text-slate-600">
              Be the first player to get rid of all of your cards. The last player with cards loses.
            </p>
          </article>

          <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-panel">
            <h2 class="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span class="text-emerald-600">↕</span> Card Order (Rank)
            </h2>
            <p class="text-sm text-slate-600 mb-2">
              From lowest to highest:
            </p>
            <p class="text-sm font-mono text-slate-800">3 4 5 6 7 8 9 10 J Q K A 2</p>
          </article>

          <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-panel">
            <h2 class="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span class="text-rose-500">♥</span> Suit Order
            </h2>
            <p class="text-sm text-slate-600 mb-2">
              Suits order when ranks are equal, lowest to highest:
            </p>
            <p class="text-base font-medium">
              <span class="text-suit-red">♦</span>
              &lt;
              <span class="text-suit-black">♣</span>
              &lt;
              <span class="text-suit-red">♥</span>
              &lt;
              <span class="text-suit-black">♠</span>
            </p>
          </article>

          <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-panel">
            <h2 class="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span class="text-amber-500">→</span> Turn Flow
            </h2>
            <ul class="text-sm text-slate-600 list-disc pl-5 space-y-1">
              <li>First round starts with the player holding 3♦.</li>
              <li>Players take turns clockwise.</li>
              <li>Each play must match the type and count of the current play and beat it.</li>
              <li>Passing skips your turn. Once you pass, you can't play again until the trick resets.</li>
              <li>When everyone else passes, the last player to play leads the next trick.</li>
            </ul>
          </article>

          <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-panel md:col-span-2">
            <h2 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-brand-600">▦</span> Valid Plays
            </h2>
            <p class="text-sm text-slate-600 mb-3">
              Single, Pair, Triple, Straight, Flush, Full House, Four of a Kind (+kicker), Straight Flush.
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="font-semibold mb-1">Single</p>
                <p class="text-slate-500">Any one card.</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="font-semibold mb-1">Pair</p>
                <p class="text-slate-500">Two cards of the same rank.</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="font-semibold mb-1">Triple</p>
                <p class="text-slate-500">Three cards of the same rank.</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="font-semibold mb-1">Five-card</p>
                <p class="text-slate-500">Straight, Flush, Full House, Four of a Kind, Straight Flush.</p>
              </div>
            </div>
          </article>

          <article class="rounded-2xl bg-white border border-slate-200 p-5 shadow-panel md:col-span-2">
            <h2 class="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span class="text-emerald-600">$</span> Scoring
            </h2>
            <p class="text-sm text-slate-600 mb-3">
              Simple scoring: each losing player pays <b>cards remaining × card value</b>. The
              winner gains the total.
            </p>
            <div class="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p>Example: 4 cards left at $10/card → -$40. Winner gains the sum.</p>
            </div>
          </article>
        </div>

      </section>
    </main>
  </div>
</template>
