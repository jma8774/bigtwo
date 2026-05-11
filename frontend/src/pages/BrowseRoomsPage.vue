<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppTopBar from '@/components/AppTopBar.vue'
import RulesModal from '@/components/RulesModal.vue'
import { getSocket, type PublicRoomSummary } from '@/utils/socket'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()

const showRules = ref(false)
const nickname = ref(settings.nickname || 'You')
const rooms = ref<PublicRoomSummary[]>([])
const loading = ref(true)
const joiningCode = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const socket = getSocket()

function applyRooms(list: PublicRoomSummary[]) {
  rooms.value = list
  loading.value = false
}

function onPublicRoomsChanged(list: PublicRoomSummary[]) {
  applyRooms(list)
}

function subscribe() {
  loading.value = true
  socket.emit('subscribePublicRooms', null, (list: PublicRoomSummary[]) => applyRooms(list))
  socket.on('publicRoomsChanged', onPublicRoomsChanged)
}

function unsubscribe() {
  socket.emit('unsubscribePublicRooms')
  socket.off('publicRoomsChanged', onPublicRoomsChanged)
}

onMounted(() => {
  if (socket.connected) {
    subscribe()
  } else {
    socket.once('connect', subscribe)
  }
})

onBeforeUnmount(unsubscribe)

function refresh() {
  loading.value = true
  socket.emit('subscribePublicRooms', null, (list: PublicRoomSummary[]) => applyRooms(list))
}

async function joinRoom(code: string) {
  if (joiningCode.value) return
  joiningCode.value = code
  errorMessage.value = null
  const trimmed = nickname.value.trim() || 'Guest'
  settings.nickname = trimmed
  const ok = await game.joinRoomOnline(code, trimmed)
  joiningCode.value = null
  if (ok) {
    router.push({ name: 'lobby' })
  } else {
    errorMessage.value = `Couldn't join ${code}. It may have started or filled up.`
  }
}

function formatAge(ts: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const hasRooms = computed(() => rooms.value.length > 0)
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppTopBar showRules @rules="showRules = true" />

    <main class="max-w-4xl mx-auto px-6 py-10">
      <header class="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Public Rooms</h1>
          <p class="text-sm text-slate-500 mt-1">
            Jump into an open table, or create your own.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            @click="refresh"
            :disabled="loading"
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
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {{ loading ? 'Refreshing…' : 'Refresh' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            @click="router.push({ name: 'create' })"
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
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
              <path d="M12 5v14" />
            </svg>
            Create Room
          </button>
        </div>
      </header>

      <section class="rounded-2xl bg-white border border-slate-200 shadow-panel p-5 mb-6">
        <label class="block text-sm font-medium text-slate-700 mb-1.5">Your nickname</label>
        <input
          v-model="nickname"
          type="text"
          maxlength="20"
          placeholder="You"
          class="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
        />
        <p class="text-xs text-slate-500 mt-1">Saved locally so you don't have to retype it.</p>
      </section>

      <div v-if="!hasRooms" class="rounded-2xl bg-white border border-slate-200 shadow-panel p-10 text-center">
        <p class="text-slate-500 text-base">
          {{ loading ? 'Looking for tables…' : 'No public rooms right now. Create your own.' }}
        </p>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="r in rooms"
          :key="r.roomCode"
          class="rounded-2xl bg-white border border-slate-200 shadow-panel px-5 py-4 flex items-center gap-4 flex-wrap"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="font-mono font-bold text-lg text-slate-900">{{ r.roomCode }}</span>
              <span
                :class="[
                  'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
                  r.inProgress
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700',
                ]"
              >
                <span
                  :class="[
                    'w-1.5 h-1.5 rounded-full',
                    r.inProgress ? 'bg-amber-500' : 'bg-emerald-500',
                  ]"
                />
                {{ r.inProgress ? 'In progress' : 'Waiting' }}
              </span>
              <span class="text-xs text-slate-400">{{ formatAge(r.createdAt) }}</span>
            </div>
            <p class="text-sm text-slate-600">
              <span class="font-medium text-slate-900">{{ r.hostNickname }}</span>'s table ·
              <span class="tabular-nums">{{ r.seatsTaken }} / {{ r.playerCount }}</span> seats
            </p>
          </div>
          <button
            type="button"
            :disabled="
              joiningCode === r.roomCode || r.inProgress || r.seatsAvailable === 0
            "
            class="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            @click="joinRoom(r.roomCode)"
          >
            <template v-if="joiningCode === r.roomCode">Joining…</template>
            <template v-else-if="r.inProgress">Started</template>
            <template v-else-if="r.seatsAvailable === 0">Full</template>
            <template v-else>Join</template>
          </button>
        </li>
      </ul>

      <p v-if="errorMessage" class="text-sm text-rose-500 text-center mt-4">{{ errorMessage }}</p>
    </main>

    <RulesModal :open="showRules" @close="showRules = false" />
  </div>
</template>
