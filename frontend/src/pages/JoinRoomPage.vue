<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AppTopBar from '@/components/AppTopBar.vue'
import RulesModal from '@/components/RulesModal.vue'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'

const router = useRouter()
const route = useRoute()
const game = useGameStore()
const settings = useSettingsStore()
const { nickname } = storeToRefs(settings)
const showRules = ref(false)

const code = ref<string[]>(['', '', '', ''])

onMounted(() => {
  // Pre-fill from a `?code=ABCD` share link. Strip non-[A-Z2-9] (the room
  // code charset), uppercase, take the first 4. Anything else is ignored.
  const raw = (route.query.code ?? '') as string
  const cleaned = raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 4)
  if (cleaned.length === 0) return
  const next = ['', '', '', '']
  for (let i = 0; i < cleaned.length; i++) next[i] = cleaned[i]
  code.value = next
})
const joining = ref(false)
const errorMessage = ref<string | null>(null)

const inputs = ref<HTMLInputElement[]>([])

function setInputRef(el: Element | null, idx: number) {
  if (el instanceof HTMLInputElement) inputs.value[idx] = el
}

const codeStr = computed(() => code.value.join('').trim())
const canJoin = computed(() => codeStr.value.length === 4 && !joining.value)

function setChar(idx: number, val: string) {
  const ch = (val || '').slice(-1).toUpperCase()
  const next = [...code.value]
  next[idx] = ch
  code.value = next
  errorMessage.value = null
  if (ch && idx < 3) {
    const nextInput = inputs.value[idx + 1]
    nextInput?.focus()
    nextInput?.select()
  }
}

function onKeyDown(idx: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !code.value[idx] && idx > 0) {
    inputs.value[idx - 1]?.focus()
  } else if (e.key === 'ArrowLeft' && idx > 0) {
    inputs.value[idx - 1]?.focus()
  } else if (e.key === 'ArrowRight' && idx < 3) {
    inputs.value[idx + 1]?.focus()
  } else if (e.key === 'Enter' && canJoin.value) {
    void join()
  }
}

function onPaste(idx: number, e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  const cleaned = text.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (!cleaned) return
  e.preventDefault()
  const next = [...code.value]
  let i = idx
  for (const ch of cleaned) {
    if (i > 3) break
    next[i] = ch
    i++
  }
  code.value = next
  errorMessage.value = null
  const last = Math.min(idx + cleaned.length, 3)
  inputs.value[last]?.focus()
  inputs.value[last]?.select()
}

async function join() {
  if (!canJoin.value) return
  joining.value = true
  errorMessage.value = null
  const result = await game.joinRoomOnline(codeStr.value, nickname.value.trim() || 'Guest')
  joining.value = false
  if (result.ok) {
    router.push({ name: 'lobby' })
  } else if (result.error === 'GAME_ALREADY_STARTED') {
    errorMessage.value = 'That game already started.'
  } else if (result.error === 'ROOM_FULL') {
    errorMessage.value = 'That room is full.'
  } else {
    errorMessage.value = 'Could not join that room. Check the code and try again.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppTopBar showRules @rules="showRules = true" />

    <main class="max-w-xl mx-auto px-8 py-12">
      <section class="rounded-2xl bg-white border border-slate-200 shadow-panel p-8">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </span>
        </div>
        <h1 class="text-3xl font-bold text-slate-900 text-center mb-2">Join a Room</h1>
        <p class="text-sm text-slate-500 text-center mb-8">
          Enter a room code to start playing Big Two with your friends.
        </p>

        <div class="max-w-sm mx-auto space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Nickname</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                v-model="nickname"
                type="text"
                placeholder="Enter your nickname"
                class="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Room code</label>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">
                <svg
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
              <div class="flex gap-2">
                <input
                  v-for="(_, i) in 4"
                  :key="i"
                  :ref="(el) => setInputRef(el as Element | null, i)"
                  :value="code[i]"
                  @input="setChar(i, ($event.target as HTMLInputElement).value)"
                  @keydown="onKeyDown(i, $event)"
                  @paste="onPaste(i, $event)"
                  inputmode="text"
                  autocapitalize="characters"
                  maxlength="1"
                  class="w-11 h-12 text-center text-lg font-mono font-semibold rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none uppercase"
                />
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-1.5 ml-7">Example: ABTK</p>
          </div>

          <button
            type="button"
            :disabled="!canJoin"
            class="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            @click="join"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            {{ joining ? 'Joining…' : 'Join Room' }}
          </button>
          <p v-if="errorMessage" class="text-sm text-rose-500 text-center">{{ errorMessage }}</p>

          <div class="flex items-center gap-3">
            <span class="flex-1 h-px bg-slate-200" />
            <span class="text-xs text-slate-400">or</span>
            <span class="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            class="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium bg-white hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2"
            @click="router.push({ name: 'browse' })"
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
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Find Public Rooms
          </button>
        </div>
      </section>
    </main>

    <RulesModal :open="showRules" @close="showRules = false" />
  </div>
</template>
