<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

type LogEntry = {
  id: string
  message: string
  ago: string
  kind?: 'play' | 'pass' | 'system' | 'score'
}

type ChatMessage = {
  id: string
  playerId?: string
  nickname: string
  text: string
  at: number
}

const props = withDefaults(
  defineProps<{
    logEntries: LogEntry[]
    messages?: ChatMessage[]
    nickname?: string
    myPlayerId?: string
  }>(),
  { nickname: 'You', myPlayerId: '', messages: () => [] },
)

const emit = defineEmits<{
  send: [text: string]
}>()

const open = ref(false)
const chipVisible = ref(true)
const activeTab = ref<'log' | 'chat'>('log')
const unread = ref(0)
const draft = ref('')

const logScrollRef = useTemplateRef<HTMLDivElement>('logScrollRef')
const chatScrollRef = useTemplateRef<HTMLDivElement>('chatScrollRef')

watch(
  () => props.logEntries.length,
  () => {
    if (open.value && activeTab.value === 'log') scrollLogToBottom()
  },
)

watch(
  () => props.messages.length,
  (n, prev) => {
    if (n <= (prev ?? 0)) return
    const last = props.messages[n - 1]
    const fromMe =
      !!last && !!props.myPlayerId && last.playerId === props.myPlayerId
    if (open.value && activeTab.value === 'chat') {
      nextTick(scrollChatToBottom)
    } else if (!fromMe) {
      unread.value += 1
    }
  },
)

watch(open, (isOpen) => {
  if (!isOpen) return
  unread.value = 0
  nextTick(() => {
    if (activeTab.value === 'log') scrollLogToBottom()
    else scrollChatToBottom()
  })
})

watch(activeTab, (tab) => {
  nextTick(() => {
    if (tab === 'log') scrollLogToBottom()
    else scrollChatToBottom()
  })
})

function scrollLogToBottom() {
  if (logScrollRef.value) logScrollRef.value.scrollTop = logScrollRef.value.scrollHeight
}

function scrollChatToBottom() {
  if (chatScrollRef.value) chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
}

function openPanel() {
  chipVisible.value = false
  open.value = true
}

function closePanel() {
  open.value = false
  // chipVisible flips back to true after the panel's @after-leave fires
}

function onPanelAfterLeave() {
  chipVisible.value = true
}

function send() {
  const text = draft.value.trim()
  if (!text) return
  emit('send', text)
  draft.value = ''
  nextTick(scrollChatToBottom)
}

function dotColor(kind?: LogEntry['kind']): string {
  if (kind === 'pass') return 'bg-slate-300'
  if (kind === 'system') return 'bg-amber-400'
  if (kind === 'score') return 'bg-emerald-500'
  return 'bg-brand-500'
}

function formatTime(at: number): string {
  const d = new Date(at)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const unreadLabel = computed(() => (unread.value > 9 ? '9+' : String(unread.value)))
</script>

<template>
  <div class="fixed bottom-4 right-4 z-40 pointer-events-none">
    <!-- Collapsed chip -->
    <Transition name="chip">
      <button
        v-if="!open && chipVisible"
        type="button"
        class="pointer-events-auto relative w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors grid place-items-center"
        :aria-label="`Open chat${unread > 0 ? ` (${unread} new)` : ''}`"
        @click="openPanel"
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span
        v-if="unread > 0"
        class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-xs font-bold leading-none grid place-items-center"
      >
        {{ unreadLabel }}
      </span>
    </button>
    </Transition>

    <!-- Expanded panel -->
    <Transition name="panel" @after-leave="onPanelAfterLeave">
      <div
        v-if="open"
        class="pointer-events-auto w-[360px] h-[480px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      >
        <header class="flex items-center justify-between px-3 pt-3 pb-2">
          <div class="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              :class="[
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                activeTab === 'log'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900',
              ]"
              @click="activeTab = 'log'"
            >
              Log
            </button>
            <button
              type="button"
              :class="[
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                activeTab === 'chat'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900',
              ]"
              @click="activeTab = 'chat'"
            >
              Chat
            </button>
          </div>
          <button
            type="button"
            class="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Close"
            @click="closePanel"
          >
            ✕
          </button>
        </header>

        <!-- Log tab -->
        <div v-if="activeTab === 'log'" ref="logScrollRef" class="flex-1 overflow-y-auto px-4 py-2">
          <ul class="space-y-2">
            <li
              v-for="entry in logEntries"
              :key="entry.id"
              class="flex items-start gap-2 text-sm"
            >
              <span :class="['mt-1.5 w-2 h-2 rounded-full shrink-0', dotColor(entry.kind)]" />
              <span class="text-slate-700 flex-1">{{ entry.message }}</span>
              <span class="text-xs text-slate-400 whitespace-nowrap">{{ entry.ago }}</span>
            </li>
            <li v-if="logEntries.length === 0" class="text-sm text-slate-400 text-center py-6">
              No activity yet.
            </li>
          </ul>
        </div>

        <!-- Chat tab -->
        <div
          v-else
          ref="chatScrollRef"
          class="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-slate-50/40"
        >
          <div
            v-for="m in messages"
            :key="m.id"
            :class="[
              'flex flex-col',
              (myPlayerId && m.playerId === myPlayerId) || (!myPlayerId && m.nickname === nickname)
                ? 'items-end'
                : 'items-start',
            ]"
          >
            <span class="text-xs text-slate-500 mb-0.5">
              {{ m.nickname }} · {{ formatTime(m.at) }}
            </span>
            <div
              :class="[
                'max-w-[80%] rounded-2xl px-3 py-1.5 text-sm break-words',
                (myPlayerId && m.playerId === myPlayerId) ||
                (!myPlayerId && m.nickname === nickname)
                  ? 'bg-brand-600 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md',
              ]"
            >
              {{ m.text }}
            </div>
          </div>
          <div v-if="messages.length === 0" class="text-sm text-slate-400 text-center py-6">
            Say hi to the table.
          </div>
        </div>

        <footer v-if="activeTab === 'chat'" class="border-t border-slate-100 px-3 py-2">
          <form class="flex items-center gap-2" @submit.prevent="send">
            <input
              v-model="draft"
              type="text"
              placeholder="Type a message…"
              class="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              maxlength="200"
            />
            <button
              type="submit"
              :disabled="!draft.trim()"
              class="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Send"
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
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition:
    transform 180ms ease,
    opacity 180ms ease;
  transform-origin: bottom right;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(8px);
}

.chip-enter-active {
  transition:
    transform 160ms ease,
    opacity 160ms ease;
  transform-origin: bottom right;
}
.chip-leave-active {
  transition: opacity 80ms ease;
}
.chip-enter-from {
  opacity: 0;
  transform: scale(0.6);
}
.chip-leave-to {
  opacity: 0;
}
</style>
