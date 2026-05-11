<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppTopBar from '@/components/AppTopBar.vue'
import PlayerPanel from '@/components/PlayerPanel.vue'
import CurrentPlay from '@/components/CurrentPlay.vue'
import PlayedCardPile from '@/components/PlayedCardPile.vue'
import HandArea from '@/components/HandArea.vue'
import ActionBar from '@/components/ActionBar.vue'
import ChatPanel from '@/components/ChatPanel.vue'
import RulesModal from '@/components/RulesModal.vue'
import RoundSummaryModal from '@/components/RoundSummaryModal.vue'
import { useGameStore } from '@/stores/gameStore'
import type { Card } from '@bigtwo/shared'

const router = useRouter()
const game = useGameStore()
const showRules = ref(false)

onMounted(() => {
  if (!game.state) router.replace({ name: 'home' })
})

onBeforeUnmount(() => {
  // Don't endGame here — user may navigate to Rules and back. Leave button explicitly ends.
})

const state = computed(() => game.state)
const humanId = computed(() => game.humanId)
const opponents = computed(() => {
  if (!state.value || !humanId.value) return []
  return state.value.players
    .filter((p) => p.id !== humanId.value)
    .map((p) => ({
      name: p.nickname,
      cardCount: state.value!.hands[p.id]?.length ?? 0,
      score: state.value!.scores[p.id] ?? 0,
      status:
        state.value!.currentPlayerId === p.id && state.value!.status === 'playing'
          ? ('turn' as const)
          : undefined,
      active: state.value!.currentPlayerId === p.id && state.value!.status === 'playing',
      thinking: game.botThinkingId === p.id,
    }))
})

const hand = computed(() => game.humanHand)
const selectedSet = computed(() => game.selectedIds)
const isHumanTurn = computed(() => game.isHumanTurn)

const humanScore = computed(() => {
  if (!state.value || !humanId.value) return 0
  return state.value.scores[humanId.value] ?? 0
})

const humanScoreLabel = computed(() => {
  const v = humanScore.value
  const sign = v >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(v)}`
})

const humanScoreColor = computed(() =>
  humanScore.value === 0
    ? 'text-slate-500'
    : humanScore.value > 0
      ? 'text-emerald-600'
      : 'text-rose-500',
)

const currentPlayCards = computed<Card[]>(() => state.value?.currentPlay?.cards ?? [])
const currentPlayType = computed(() => state.value?.currentPlay?.type ?? undefined)
const currentPlayBy = computed(() => {
  const id = state.value?.currentPlay?.playedBy
  if (!id) return undefined
  return state.value?.players.find((p) => p.id === id)?.nickname
})

const logEntries = computed(() => {
  if (!state.value) return []
  return state.value.moveLog.map((m) => ({
    id: m.id,
    message: m.message,
    ago: formatTime(m.at),
    kind: m.type,
  }))
})

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const shaking = ref(false)
const readyIds = ref<Set<string>>(new Set())
let readyTimers: number[] = []

function clearReadyTimers() {
  for (const t of readyTimers) window.clearTimeout(t)
  readyTimers = []
}

const summaryPlayers = computed(() => {
  if (!state.value) return []
  return state.value.players.map((p) => ({
    id: p.id,
    name: p.nickname,
    ready: readyIds.value.has(p.id),
    isYou: p.id === humanId.value,
  }))
})

watch(
  () => state.value?.status,
  (s) => {
    if (s === 'playing') {
      readyIds.value = new Set()
      clearReadyTimers()
    }
  },
)

onBeforeUnmount(clearReadyTimers)

function onReady() {
  if (!state.value || !humanId.value) return
  const next = new Set(readyIds.value)
  next.add(humanId.value)
  readyIds.value = next

  // Bots ready up with a small staggered delay so the row animates in.
  const bots = state.value.players.filter((p) => p.isBot)
  bots.forEach((bot, i) => {
    const timer = window.setTimeout(
      () => {
        const updated = new Set(readyIds.value)
        updated.add(bot.id)
        readyIds.value = updated
        if (state.value && updated.size === state.value.players.length) {
          window.setTimeout(() => proceed(), 250)
        }
      },
      300 + i * 220,
    )
    readyTimers.push(timer)
  })
}

function proceed() {
  clearReadyTimers()
  if (state.value?.status === 'matchOver') game.playAgain()
  else game.nextRound()
}

watch(
  () => game.errorReason,
  async (r) => {
    if (!r) return
    // Restart animation if already mid-shake.
    shaking.value = false
    await nextTick()
    shaking.value = true
    window.setTimeout(() => {
      shaking.value = false
      if (game.errorReason === r) game.errorReason = null
    }, 320)
  },
)

function toggle(card: Card) {
  game.toggleCard(card)
}
function reorder(newOrder: Card[]) {
  game.reorderHand(newOrder)
}
function sortBy(by: 'rank' | 'suit' | 'smart') {
  game.sortHandBy(by)
}
function play() {
  game.playSelected()
}
function pass() {
  game.passTurn()
}

const summary = computed(() => {
  if (!state.value) return null
  if (state.value.status !== 'roundOver' && state.value.status !== 'matchOver') return null
  const isFinal = state.value.status === 'matchOver'

  let winner = state.value.players[0]
  if (!isFinal) {
    const w = state.value.players.find((p) => state.value!.hands[p.id].length === 0)
    if (w) winner = w
  } else {
    winner = [...state.value.players].sort(
      (a, b) => (state.value!.scores[b.id] ?? 0) - (state.value!.scores[a.id] ?? 0),
    )[0]
  }

  let rows = state.value.players.map((p) => ({
    name: p.id === humanId.value ? 'You' : p.nickname,
    cardsLeft: state.value!.hands[p.id]?.length ?? 0,
    delta: isFinal
      ? (state.value!.scores[p.id] ?? 0)
      : (state.value!.roundDelta[p.id] ?? 0),
    isWinner: p.id === winner.id,
    rank: undefined as number | undefined,
  }))

  if (isFinal) {
    // Competition ranking (1, 1, 3, 3): tied players share a rank, the next rank skips.
    rows = [...rows].sort((a, b) => b.delta - a.delta)
    let lastDelta: number | null = null
    let lastRank = 0
    rows.forEach((row, i) => {
      if (lastDelta === null || row.delta !== lastDelta) {
        lastRank = i + 1
        lastDelta = row.delta
      }
      row.rank = lastRank
    })
  }

  return {
    winner: winner.id === humanId.value ? 'You' : winner.nickname,
    winnerGain: isFinal
      ? (state.value.scores[winner.id] ?? 0)
      : (state.value.roundDelta[winner.id] ?? 0),
    rows,
    isFinal,
  }
})

function leaveTable() {
  game.endGame()
  router.push({ name: 'home' })
}

const opponentsGridClass = computed(() => {
  const base = 'relative z-10'
  const n = opponents.value.length
  if (n === 2) return `${base} grid grid-cols-2 gap-3`
  return `${base} grid grid-cols-3 gap-3`
})
</script>

<template>
  <div class="h-screen bg-slate-50 flex flex-col overflow-hidden">
    <AppTopBar
      :roomCode="state?.roomCode"
      :roundNumber="state?.roundNumber"
      :roundLimit="state?.settings.roundLimit ?? null"
      showSound
      showRules
      showLeave
      @rules="showRules = true"
      @leave="leaveTable"
    />

    <main
      class="flex-1 max-w-7xl 2xl:max-w-[1600px] w-full mx-auto px-6 py-4 flex flex-col justify-between gap-4"
    >
      <div :class="opponentsGridClass">
        <PlayerPanel
          v-for="opp in opponents"
          :key="opp.name"
          :name="opp.name"
          :cardCount="opp.cardCount"
          :score="opp.score"
          :status="opp.status"
          :active="opp.active"
          :thinking="opp.thinking"
        />
      </div>

      <div class="flex justify-center">
        <div class="relative">
          <PlayedCardPile :cards="state?.playedPile ?? []" />
          <div class="relative z-10">
            <CurrentPlay
              :cards="currentPlayCards"
              :handType="currentPlayType"
              :playedBy="currentPlayBy"
              :yourTurn="isHumanTurn"
            />
          </div>
        </div>
      </div>

      <div
        :class="[
          'relative z-10 rounded-2xl bg-white border border-slate-200 shadow-panel px-6 pt-5 pb-6',
          shaking ? 'animate-shake' : '',
        ]"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your hand
            <span class="ml-1 text-sm font-normal normal-case tracking-normal text-slate-500"
              >({{ hand.length }} cards)</span
            >
          </span>
          <div class="flex items-center gap-3">
            <p v-if="selectedSet.size > 0" class="text-sm font-medium text-brand-700">
              {{ selectedSet.size }} selected
            </p>
            <p :class="['text-sm font-semibold tabular-nums', humanScoreColor]">
              {{ humanScoreLabel }}
            </p>
          </div>
        </div>
        <div class="overflow-x-auto -mx-2 px-2 pt-10 pb-4">
          <HandArea
            :cards="hand"
            :selectedIds="selectedSet"
            @toggle="toggle"
            @reorder="reorder"
          />
        </div>
        <div class="mt-3">
          <ActionBar
            :canPlay="isHumanTurn && selectedSet.size > 0"
            :canPass="isHumanTurn && !!state?.currentPlay"
            @play="play"
            @pass="pass"
            @sort="sortBy"
          />
        </div>
      </div>
    </main>

    <ChatPanel :logEntries="logEntries" :nickname="state?.players.find((p) => !p.isBot)?.nickname ?? 'You'" />
    <RulesModal :open="showRules" @close="showRules = false" />
    <RoundSummaryModal
      v-if="summary"
      :open="!!summary"
      :winner="summary.winner"
      :winnerGain="summary.winnerGain"
      :rows="summary.rows"
      :isFinal="summary.isFinal"
      :players="summaryPlayers"
      :humanId="humanId ?? ''"
      :cardValue="state?.settings?.cardValue ?? 10"
      @ready="onReady"
      @exit="leaveTable"
    />
  </div>
</template>

<style scoped>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}
.animate-shake {
  animation: shake 280ms ease;
}
</style>
