<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppLogo from './AppLogo.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useGameStore } from '@/stores/gameStore'

withDefaults(
  defineProps<{
    roomCode?: string
    roundNumber?: number
    roundLimit?: number | null
    showLeave?: boolean
    showRules?: boolean
    showSound?: boolean
  }>(),
  { roundLimit: null, showLeave: false, showRules: false, showSound: false },
)

const emit = defineEmits<{ (e: 'rules'): void; (e: 'leave'): void }>()
const router = useRouter()
const settings = useSettingsStore()
const game = useGameStore()

function onLeave() {
  emit('leave')
  router.push({ name: 'home' })
}

function toggleSound() {
  settings.soundEnabled = !settings.soundEnabled
}
</script>

<template>
  <header
    class="shrink-0 h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200"
  >
    <div class="flex items-center gap-6">
      <RouterLink to="/" class="flex items-center"><AppLogo /></RouterLink>
      <slot name="left">
        <div v-if="roomCode" class="text-sm text-slate-500 inline-flex items-center gap-2">
          <span
            v-if="game.isOnlineRoom"
            :title="game.isSocketConnected ? 'Connected' : 'Reconnecting…'"
            :class="[
              'w-2 h-2 rounded-full',
              game.isSocketConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse',
            ]"
          />
          <span>Room <span class="font-mono font-semibold text-slate-900">{{ roomCode }}</span></span>
        </div>
        <div v-if="roundNumber" class="text-sm text-slate-500">
          Round <span class="font-semibold text-slate-900">{{ roundNumber }}</span>
          <span v-if="roundLimit"> of {{ roundLimit }}</span>
        </div>
      </slot>
    </div>
    <slot name="right">
    <div class="flex items-center gap-2">
      <button
        v-if="showSound"
        type="button"
        :aria-label="settings.soundEnabled ? 'Mute sound' : 'Unmute sound'"
        :title="settings.soundEnabled ? 'Sound on' : 'Sound off'"
        class="w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        @click="toggleSound"
      >
        <svg
          v-if="settings.soundEnabled"
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
        <svg
          v-else
          class="w-4 h-4 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      </button>
      <button
        v-if="showRules"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
        @click="emit('rules')"
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
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        Rules
      </button>
      <button
        v-if="showLeave"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50"
        @click="onLeave"
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
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Leave
      </button>
    </div>
    </slot>
  </header>
</template>
