<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppTopBar from '@/components/AppTopBar.vue'
import RulesModal from '@/components/RulesModal.vue'
import { useGameStore } from '@/stores/gameStore'

const router = useRouter()
const game = useGameStore()
const showRules = ref(false)

onMounted(() => {
  if (!game.state) router.replace({ name: 'home' })
})

const state = computed(() => game.state)
const roomCode = computed(() => state.value?.roomCode ?? '')
const isPublic = computed(() => state.value?.settings.isPublic ?? true)

const AVATAR_COLORS = ['brand', 'emerald', 'amber', 'rose'] as const
type AvatarColor = (typeof AVATAR_COLORS)[number]

const colorClass: Record<AvatarColor, string> = {
  brand: 'bg-brand-100 text-brand-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
}

const players = computed(() => {
  if (!state.value) return []
  return state.value.players.map((p, i) => ({
    id: p.id,
    initials: p.nickname.slice(0, 1).toUpperCase(),
    name: p.nickname,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    isBot: p.isBot,
    isHost: !p.isBot && i === 0,
    ready: true,
  }))
})

const cardValueLabel = computed(() =>
  state.value ? `$${state.value.settings.cardValue}` : '',
)

const roundLimitLabel = computed(() => {
  if (!state.value) return ''
  return state.value.settings.roundLimit === null
    ? 'Unlimited'
    : `${state.value.settings.roundLimit}`
})

function copy() {
  if (roomCode.value) navigator.clipboard.writeText(roomCode.value).catch(() => {})
}

function start() {
  game.startGame()
  router.push({ name: 'game' })
}

function leave() {
  game.endGame()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppTopBar
      :roomCode="roomCode"
      :roundNumber="state?.roundNumber || undefined"
      showRules
      showLeave
      @rules="showRules = true"
      @leave="leave"
    />

    <main class="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section class="rounded-2xl bg-white border border-slate-200 shadow-panel p-8">
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 mb-1">Room {{ roomCode }}</h1>
            <p class="text-sm text-slate-500">Waiting for players to get ready…</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1',
                isPublic
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500',
              ]"
            >
              <svg
                v-if="isPublic"
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <svg
                v-else
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {{ isPublic ? 'Public Room' : 'Private Room' }}
            </span>
            <span class="text-xs text-slate-500"
              >{{ players.length }} / {{ state?.settings.playerCount ?? '?' }}</span
            >
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            class="rounded-2xl bg-brand-50 border border-brand-100 px-6 py-7 text-center flex flex-col items-center justify-center"
          >
            <p class="text-xs uppercase tracking-wide text-brand-700 font-semibold mb-2">
              Room Code
            </p>
            <p class="text-5xl font-mono font-bold text-brand-700 tracking-widest mb-4">
              {{ roomCode }}
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-brand-200 text-brand-700 text-sm font-medium hover:bg-brand-100"
                @click="copy"
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
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-brand-200 text-brand-700 text-sm font-medium hover:bg-brand-100"
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
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-slate-700 mb-3">
              Players ({{ players.length }})
            </p>
            <ul class="space-y-2">
              <li
                v-for="p in players"
                :key="p.id"
                class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <div class="flex items-center gap-3">
                  <span
                    :class="[
                      'w-9 h-9 rounded-full grid place-items-center font-semibold',
                      colorClass[p.color],
                    ]"
                    >{{ p.initials }}</span
                  >
                  <div>
                    <p class="font-medium text-slate-900 leading-tight">
                      {{ p.name }}
                      <span v-if="p.isBot" class="text-xs text-slate-400 font-normal">(bot)</span>
                    </p>
                    <p v-if="p.isHost" class="text-xs text-brand-600">Host</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 bg-emerald-50 text-emerald-700"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              </li>
            </ul>
          </div>
        </div>

        <p class="text-sm text-slate-500 mt-6 text-center">
          Share the code with friends to invite them to your room.
        </p>

        <button
          type="button"
          class="mt-6 w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-2"
          @click="start"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
          Start Game
        </button>
        <p class="text-xs text-slate-400 text-center mt-2">Only the host can start the game.</p>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl bg-white border border-slate-200 shadow-panel p-5">
          <h3 class="font-semibold text-slate-900 mb-3">Game Settings</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500">Visibility</dt>
              <dd class="text-slate-900 font-medium">{{ isPublic ? 'Public' : 'Private' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Players</dt>
              <dd class="text-slate-900 font-medium">{{ state?.settings.playerCount }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Scoring Mode</dt>
              <dd class="text-slate-900 font-medium">Simple</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Card Value</dt>
              <dd class="text-slate-900 font-medium">{{ cardValueLabel }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Round Limit</dt>
              <dd class="text-slate-900 font-medium">{{ roundLimitLabel }}</dd>
            </div>
          </dl>
        </div>

        <div
          :class="[
            'rounded-2xl border p-5',
            isPublic ? 'bg-emerald-50 border-emerald-100' : 'bg-brand-50 border-brand-100',
          ]"
        >
          <div class="flex items-start gap-3">
            <span
              :class="[
                'w-9 h-9 rounded-lg grid place-items-center shrink-0',
                isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700',
              ]"
            >
              <svg
                v-if="isPublic"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div>
              <p class="text-sm font-semibold text-slate-900 mb-1">
                {{ isPublic ? 'Public Room' : 'Private Room' }}
              </p>
              <p class="text-xs text-slate-600">
                {{
                  isPublic
                    ? 'Anyone can find this room in the public lobby or join with the code.'
                    : 'Only players with the room code can join this table.'
                }}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <RulesModal :open="showRules" @close="showRules = false" />
  </div>
</template>
