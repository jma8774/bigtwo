<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppTopBar from '@/components/AppTopBar.vue'
import RulesModal from '@/components/RulesModal.vue'
import { useGameStore } from '@/stores/gameStore'

const router = useRouter()
const game = useGameStore()
const showRules = ref(false)

const nickname = ref('You')
const playerCount = ref<3 | 4>(4)
const fillWithBots = ref(true)
const scoringMode = ref<'simple'>('simple')
const cardValue = ref(10)
const isCustomCardValue = ref(false)
const roundLimit = ref<number | null>(null)
const isPublic = ref(true)

const cardValueOptions = [1, 5, 10, 25, 50]

function selectPreset(v: number) {
  isCustomCardValue.value = false
  cardValue.value = v
}
function selectCustomCardValue() {
  isCustomCardValue.value = true
  if (cardValueOptions.includes(cardValue.value)) cardValue.value = 15
}
const roundLimitOptions: { label: string; value: number | null }[] = [
  { label: '1', value: 1 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: 'Unlimited', value: null },
]

const cardValueLabel = computed(() => `$${cardValue.value}`)
const roundLimitLabel = computed(() =>
  roundLimit.value === null ? 'Unlimited' : `${roundLimit.value}`,
)

const creating = ref(false)
const errorMessage = ref<string | null>(null)

async function start() {
  if (creating.value) return
  creating.value = true
  errorMessage.value = null
  const ok = await game.createRoomOnline(
    {
      playerCount: playerCount.value,
      fillWithBots: fillWithBots.value,
      botDifficulty: 'basic',
      scoringMode: scoringMode.value,
      cardValue: cardValue.value,
      roundLimit: roundLimit.value,
      isPublic: isPublic.value,
    },
    nickname.value,
  )
  creating.value = false
  if (ok) {
    router.push({ name: 'lobby' })
  } else {
    errorMessage.value = 'Could not reach the server. Check your connection and try again.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppTopBar :roomCode="'AB7K'" :roundNumber="1" showRules showLeave @rules="showRules = true" />

    <main class="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section class="rounded-2xl bg-white border border-slate-200 shadow-panel p-6 lg:p-8">
        <h1 class="text-2xl font-bold text-slate-900 mb-1">Create Room</h1>
        <p class="text-sm text-slate-500 mb-6">Set up your table and game rules.</p>

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Nickname</label>
            <input
              v-model="nickname"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
            />
            <p class="text-xs text-slate-500 mt-1">This is how other players see you.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Player count</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="playerCount = 3"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  playerCount === 3
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
              >
                3 Players
              </button>
              <button
                type="button"
                @click="playerCount = 4"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  playerCount === 4
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
              >
                4 Players
              </button>
            </div>
            <p class="text-xs text-slate-500 mt-1">4 players is the best experience.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Room visibility</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="isPublic = true"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5',
                  isPublic
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Public
              </button>
              <button
                type="button"
                @click="isPublic = false"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5',
                  !isPublic
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
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
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Private
              </button>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              {{
                isPublic
                  ? 'Anyone can find this room in the public lobby or join with the code.'
                  : 'Only players with the room code can join.'
              }}
            </p>
          </div>

          <div class="flex items-center justify-between gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700">Fill empty seats with bots</label>
              <p class="text-xs text-slate-500">Useful if you don't have enough players.</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="fillWithBots"
              @click="fillWithBots = !fillWithBots"
              :class="[
                'relative w-11 h-6 rounded-full transition-colors',
                fillWithBots ? 'bg-brand-600' : 'bg-slate-300',
              ]"
            >
              <span
                :class="[
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  fillWithBots ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Scoring mode</label>
            <select
              v-model="scoringMode"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="simple">Simple (cards left × card value)</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Card value (per card)</label>
            <div class="flex gap-2">
              <button
                v-for="v in cardValueOptions"
                :key="v"
                type="button"
                @click="selectPreset(v)"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  !isCustomCardValue && cardValue === v
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
              >
                ${{ v }}
              </button>
              <button
                type="button"
                @click="selectCustomCardValue"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  isCustomCardValue
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
              >
                Custom
              </button>
            </div>
            <div v-if="isCustomCardValue" class="mt-2 flex items-center gap-2">
              <span class="text-slate-500 text-sm">$</span>
              <input
                v-model.number="cardValue"
                type="number"
                min="1"
                step="1"
                class="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                placeholder="Enter a value"
              />
              <span class="text-slate-500 text-sm">per card</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Fake table money for fun, not real money.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Round limit</label>
            <div class="flex gap-2">
              <button
                v-for="opt in roundLimitOptions"
                :key="opt.label"
                type="button"
                @click="roundLimit = opt.value"
                :class="[
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  roundLimit === opt.value
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                ]"
              >
                {{ opt.label }}
              </button>
            </div>
            <p class="text-xs text-slate-500 mt-1">Game ends when limit is reached.</p>
          </div>

        </div>

        <button
          type="button"
          :disabled="creating"
          class="mt-8 w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          @click="start"
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
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
            <path d="M12 5v14" />
          </svg>
          {{ creating ? 'Creating…' : 'Create Room' }}
        </button>
        <p v-if="errorMessage" class="text-sm text-rose-500 text-center mt-2">{{ errorMessage }}</p>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl bg-white border border-slate-200 shadow-panel p-5">
          <h3 class="font-semibold text-slate-900 mb-3">Room Settings</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500">Nickname</dt>
              <dd class="text-slate-900 font-medium truncate ml-2">{{ nickname }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Visibility</dt>
              <dd class="text-slate-900 font-medium">{{ isPublic ? 'Public' : 'Private' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Players</dt>
              <dd class="text-slate-900 font-medium">{{ playerCount }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Scoring</dt>
              <dd class="text-slate-900 font-medium capitalize">{{ scoringMode }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Card value</dt>
              <dd class="text-slate-900 font-medium">{{ cardValueLabel }} per card</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Round limit</dt>
              <dd class="text-slate-900 font-medium">{{ roundLimitLabel }}</dd>
            </div>
          </dl>
        </div>
        <div class="rounded-2xl bg-brand-50 border border-brand-100 p-5 text-sm text-slate-700">
          <p class="font-semibold text-slate-900 mb-1">This game uses fake table money</p>
          <p class="text-xs">For scoring. No real money involved.</p>
        </div>
      </aside>
    </main>

    <RulesModal :open="showRules" @close="showRules = false" />
  </div>
</template>
