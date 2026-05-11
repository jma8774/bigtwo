import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  smartSort,
  sortByRank,
  sortBySuit,
  type Card,
  type GameState,
  type Player,
  type PlayerId,
  type Reason,
  type RoomSettings,
} from '@bigtwo/shared'
import { playSound } from '@/utils/sound'
import {
  getSocket,
  type RejoinAck,
  type RoomAck,
  type RoomPublicState,
} from '@/utils/socket'

const SESSION_KEY = 'bigTwoSession'

type Session = { roomCode: string; playerId: string; seatToken: string }

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (parsed.roomCode && parsed.playerId && parsed.seatToken) return parsed
    return null
  } catch {
    return null
  }
}

function saveSession(s: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {
    // best-effort
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // best-effort
  }
}

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState | null>(null)
  const selectedIds = ref<Set<string>>(new Set())
  const errorReason = ref<Reason | null>(null)
  const readyPlayerIds = ref<Set<PlayerId>>(new Set())

  // Online session tracking
  const mySessionPlayerId = ref<PlayerId | null>(null)
  const isOnlineRoom = ref(false)
  const isSocketConnected = ref(false)
  const sessionRestoreState = ref<'idle' | 'pending' | 'success' | 'failed'>(
    loadSession() ? 'pending' : 'idle',
  )

  const humanId = computed<PlayerId | null>(() => {
    if (mySessionPlayerId.value) return mySessionPlayerId.value
    return state.value?.players.find((p) => !p.isBot)?.id ?? null
  })
  const isHumanTurn = computed(
    () => !!state.value && !!humanId.value && state.value.currentPlayerId === humanId.value,
  )
  const humanHand = computed<Card[]>(() => {
    if (!state.value || !humanId.value) return []
    return state.value.hands[humanId.value] ?? []
  })
  const atRoundLimit = computed(() => {
    if (!state.value || state.value.settings.roundLimit === null) return false
    return state.value.roundNumber >= state.value.settings.roundLimit
  })
  /** During an active turn, if the current player is a bot, the server is
   *  scheduling its move (~700ms). UI surfaces this as a "thinking" indicator. */
  const botThinkingId = computed<PlayerId | null>(() => {
    if (!state.value || state.value.status !== 'playing') return null
    const current = state.value.players.find((p) => p.id === state.value?.currentPlayerId)
    return current?.isBot ? current.id : null
  })

  // --- Sound triggers ----------------------------------------------------

  watch(
    () => state.value?.moveLog.length ?? 0,
    (next, prev) => {
      if (next > (prev ?? 0)) {
        const newest = state.value?.moveLog[next - 1]
        if (newest?.type === 'play' && state.value?.status === 'playing') {
          playSound('cardPlay')
        }
      }
    },
  )

  watch(
    () => state.value?.currentPlayerId,
    (next, prev) => {
      if (
        state.value?.status === 'playing' &&
        next === humanId.value &&
        next !== prev &&
        prev !== undefined
      ) {
        playSound('yourTurn')
      }
    },
  )

  // --- Online room lifecycle ---------------------------------------------

  function applyRoomUpdated(room: RoomPublicState) {
    isOnlineRoom.value = true
    const players: Player[] = room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isBot: p.isBot,
      connected: p.connected,
    }))

    if (!state.value || state.value.roomCode !== room.roomCode) {
      state.value = {
        roomCode: room.roomCode,
        status: 'waiting',
        roundNumber: 0,
        turnNumber: 0,
        players,
        hostId: room.hostId,
        hands: Object.fromEntries(players.map((p) => [p.id, []])),
        currentPlayerId: players[0]?.id ?? '',
        currentPlay: null,
        lastPlayerToPlay: null,
        passedPlayerIds: [],
        scores: Object.fromEntries(players.map((p) => [p.id, 0])),
        roundDelta: Object.fromEntries(players.map((p) => [p.id, 0])),
        moveLog: [],
        playedPile: [],
        settings: room.settings,
      }
      return
    }

    // While the game is live, the canonical state comes from gameUpdated, not
    // roomUpdated. Reconcile only metadata that isn't part of GameState.
    if (state.value.status === 'waiting') {
      const hands = { ...state.value.hands }
      const scores = { ...state.value.scores }
      const delta = { ...state.value.roundDelta }
      for (const p of players) {
        if (!hands[p.id]) hands[p.id] = []
        if (!(p.id in scores)) scores[p.id] = 0
        if (!(p.id in delta)) delta[p.id] = 0
      }
      state.value = {
        ...state.value,
        players,
        hostId: room.hostId,
        hands,
        scores,
        roundDelta: delta,
        settings: room.settings,
      }
    } else {
      // Mid-game: only refresh roster fields that don't conflict with engine state.
      state.value = {
        ...state.value,
        hostId: room.hostId,
        players: state.value.players.map((existing) => {
          const fresh = players.find((p) => p.id === existing.id)
          return fresh ? { ...existing, connected: fresh.connected, nickname: fresh.nickname } : existing
        }),
        settings: room.settings,
      }
    }
  }

  const socket = getSocket()
  isSocketConnected.value = socket.connected
  socket.on('connect', () => {
    isSocketConnected.value = true
    if (!mySessionPlayerId.value && loadSession()) {
      if (sessionRestoreState.value !== 'pending') sessionRestoreState.value = 'pending'
      void rejoinOnline().then((ok) => {
        sessionRestoreState.value = ok ? 'success' : 'failed'
      })
    } else if (sessionRestoreState.value === 'pending' && !loadSession()) {
      sessionRestoreState.value = 'idle'
    }
  })
  socket.on('disconnect', () => {
    isSocketConnected.value = false
  })
  socket.on('roomUpdated', (room: RoomPublicState) => applyRoomUpdated(room))
  socket.on('gameUpdated', (next: GameState) => {
    const prevStatus = state.value?.status
    state.value = next
    // Drop selections that reference cards we no longer have.
    if (humanId.value) {
      const ownIds = new Set((next.hands[humanId.value] ?? []).map((c) => c.id))
      const trimmed = new Set<string>()
      for (const id of selectedIds.value) if (ownIds.has(id)) trimmed.add(id)
      if (trimmed.size !== selectedIds.value.size) selectedIds.value = trimmed
    }
    // Reset ready set when a new round begins (status flips out of roundOver).
    if (prevStatus === 'roundOver' && next.status !== 'roundOver') {
      readyPlayerIds.value = new Set()
    }
  })
  socket.on('playerReady', ({ playerId }: { playerId: PlayerId }) => {
    const next = new Set(readyPlayerIds.value)
    next.add(playerId)
    readyPlayerIds.value = next
  })
  socket.on('invalidMove', ({ reason }: { reason: string }) => {
    errorReason.value = reason as Reason
  })

  function createRoomOnline(settings: RoomSettings, nickname: string): Promise<boolean> {
    return new Promise((resolve) => {
      socket.emit('createRoom', { nickname, settings }, (ack: RoomAck) => {
        if (ack?.ok) {
          saveSession({
            roomCode: ack.roomCode,
            playerId: ack.playerId,
            seatToken: ack.seatToken,
          })
          mySessionPlayerId.value = ack.playerId
          isOnlineRoom.value = true
          resolve(true)
        } else {
          console.warn('[bigtwo] createRoom failed:', ack?.error)
          resolve(false)
        }
      })
    })
  }

  function joinRoomOnline(roomCode: string, nickname: string): Promise<boolean> {
    return new Promise((resolve) => {
      socket.emit('joinRoom', { roomCode, nickname }, (ack: RoomAck) => {
        if (ack?.ok) {
          saveSession({
            roomCode: ack.roomCode,
            playerId: ack.playerId,
            seatToken: ack.seatToken,
          })
          mySessionPlayerId.value = ack.playerId
          isOnlineRoom.value = true
          resolve(true)
        } else {
          console.warn('[bigtwo] joinRoom failed:', ack?.error)
          resolve(false)
        }
      })
    })
  }

  function rejoinOnline(): Promise<boolean> {
    const session = loadSession()
    if (!session) return Promise.resolve(false)
    return new Promise((resolve) => {
      socket.emit('rejoinRoom', session, (ack: RejoinAck) => {
        if (ack?.ok) {
          mySessionPlayerId.value = session.playerId
          isOnlineRoom.value = true
          resolve(true)
        } else {
          console.warn('[bigtwo] rejoinRoom failed:', ack?.error)
          clearStoredSession()
          resolve(false)
        }
      })
    })
  }

  function leaveRoomOnline() {
    if (!isOnlineRoom.value) return
    socket.emit('leaveRoom')
    clearStoredSession()
    mySessionPlayerId.value = null
    isOnlineRoom.value = false
  }

  // --- Gameplay intents (all server-authoritative) -----------------------

  function startGame() {
    if (!state.value) return
    socket.emit('startGame', { roomCode: state.value.roomCode }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok) console.warn('[bigtwo] startGame failed:', ack?.error)
    })
  }

  function playSelected() {
    if (!state.value) return
    const cardIds = Array.from(selectedIds.value)
    if (cardIds.length === 0) {
      errorReason.value = 'EMPTY_SELECTION'
      return
    }
    socket.emit(
      'playCards',
      { roomCode: state.value.roomCode, cardIds },
      (ack: { ok: boolean; error?: string }) => {
        if (ack?.ok) {
          selectedIds.value = new Set()
          errorReason.value = null
        }
      },
    )
  }

  function passTurn() {
    if (!state.value) return
    socket.emit(
      'passTurn',
      { roomCode: state.value.roomCode },
      (ack: { ok: boolean; error?: string }) => {
        if (ack?.ok) errorReason.value = null
      },
    )
  }

  function nextRound() {
    if (!state.value) return
    if (state.value.status === 'matchOver') return
    socket.emit('readyForNextRound', { roomCode: state.value.roomCode })
  }

  function endGame() {
    if (isOnlineRoom.value) leaveRoomOnline()
    state.value = null
    selectedIds.value = new Set()
    errorReason.value = null
  }

  // --- Local UI state (selection, hand sort) -----------------------------

  function toggleCard(card: Card) {
    if (!isHumanTurn.value) return
    const next = new Set(selectedIds.value)
    if (next.has(card.id)) next.delete(card.id)
    else next.add(card.id)
    selectedIds.value = next
    errorReason.value = null
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function reorderHand(newOrder: Card[]) {
    // Hand order is a purely local display preference. Never sent to the server;
    // the next gameUpdated may re-establish a server-side order, which the user
    // can re-sort if desired.
    if (!state.value || !humanId.value) return
    state.value = {
      ...state.value,
      hands: { ...state.value.hands, [humanId.value]: newOrder },
    }
  }

  function sortHandBy(by: 'rank' | 'suit' | 'smart') {
    if (!state.value || !humanId.value) return
    const h = state.value.hands[humanId.value]
    const sorted = by === 'rank' ? sortByRank(h) : by === 'suit' ? sortBySuit(h) : smartSort(h)
    state.value = {
      ...state.value,
      hands: { ...state.value.hands, [humanId.value]: sorted },
    }
  }

  return {
    state,
    selectedIds,
    errorReason,
    readyPlayerIds,
    botThinkingId,
    mySessionPlayerId,
    isOnlineRoom,
    isSocketConnected,
    sessionRestoreState,
    humanId,
    isHumanTurn,
    humanHand,
    atRoundLimit,
    createRoomOnline,
    joinRoomOnline,
    rejoinOnline,
    leaveRoomOnline,
    startGame,
    endGame,
    toggleCard,
    clearSelection,
    reorderHand,
    sortHandBy,
    playSelected,
    passTurn,
    nextRound,
  }
})
