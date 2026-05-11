import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Card } from '@/game/cards'
import { smartSort, sortByRank, sortBySuit } from '@/game/cards'
import type { GameState, PlayerId, RoomSettings } from '@/game/gameState'
import { createInitialState, startRound } from '@/game/gameState'
import { applyPass, applyPlay, canPass, canPlay, type Reason } from '@/game/rules'
import { calculateRoundDelta } from '@/game/scoring'
import { chooseBotMove } from '@/game/bot'
import { playSound } from '@/utils/sound'

const BOT_TURN_DELAY_MS = 700

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState | null>(null)
  const selectedIds = ref<Set<string>>(new Set())
  const errorReason = ref<Reason | null>(null)
  const botThinkingId = ref<PlayerId | null>(null)
  let botTimer: number | null = null

  const humanId = computed<PlayerId | null>(
    () => state.value?.players.find((p) => !p.isBot)?.id ?? null,
  )
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

  // Sound triggers
  watch(
    () => state.value?.moveLog.length ?? 0,
    (next, prev) => {
      if (next > (prev ?? 0)) {
        const newest = state.value?.moveLog[next - 1]
        // Skip the cardPlay sound if this play ended the round.
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

  function clearBotTimer() {
    if (botTimer !== null) {
      window.clearTimeout(botTimer)
      botTimer = null
    }
    botThinkingId.value = null
  }

  function createRoom(settings: RoomSettings, nickname: string) {
    clearBotTimer()
    state.value = createInitialState(settings, nickname)
    selectedIds.value = new Set()
    errorReason.value = null
  }

  function startGame() {
    if (!state.value) return
    state.value = startRound(state.value)
    selectedIds.value = new Set()
    errorReason.value = null
    scheduleBotIfNeeded()
  }

  function endGame() {
    clearBotTimer()
    state.value = null
    selectedIds.value = new Set()
    errorReason.value = null
  }

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

  function playSelected() {
    if (!state.value || !humanId.value) return
    const hand = state.value.hands[humanId.value]
    const cards = hand.filter((c) => selectedIds.value.has(c.id))

    const result = canPlay(state.value, humanId.value, cards)
    if (!result.ok) {
      errorReason.value = result.reason
      return
    }
    state.value = applyPlay(state.value, humanId.value, cards)
    selectedIds.value = new Set()
    errorReason.value = null

    if (state.value.status === 'roundOver') {
      finalizeRound()
      return
    }
    scheduleBotIfNeeded()
  }

  function passTurn() {
    if (!state.value || !humanId.value) return
    const result = canPass(state.value, humanId.value)
    if (!result.ok) {
      errorReason.value = result.reason
      return
    }
    state.value = applyPass(state.value, humanId.value)
    errorReason.value = null
    scheduleBotIfNeeded()
  }

  function finalizeRound() {
    if (!state.value) return
    const delta = calculateRoundDelta(state.value)
    const scores = { ...state.value.scores }
    for (const [pid, d] of Object.entries(delta)) {
      scores[pid] = (scores[pid] ?? 0) + d
    }
    const willEnd =
      state.value.settings.roundLimit !== null &&
      state.value.roundNumber >= state.value.settings.roundLimit
    state.value = {
      ...state.value,
      scores,
      roundDelta: delta,
      status: willEnd ? 'matchOver' : 'roundOver',
    }
  }

  function nextRound() {
    if (!state.value) return
    if (state.value.status === 'matchOver') return
    state.value = startRound(state.value)
    selectedIds.value = new Set()
    scheduleBotIfNeeded()
  }

  function playAgain() {
    if (!state.value) return
    const settings = state.value.settings
    const nickname = state.value.players.find((p) => !p.isBot)?.nickname ?? 'You'
    createRoom(settings, nickname)
    startGame()
  }

  function scheduleBotIfNeeded() {
    clearBotTimer()
    if (!state.value || state.value.status !== 'playing') return
    const current = state.value.players.find((p) => p.id === state.value?.currentPlayerId)
    if (!current?.isBot) return

    const botId = current.id
    botThinkingId.value = botId
    botTimer = window.setTimeout(() => {
      botTimer = null
      botThinkingId.value = null
      if (!state.value || state.value.status !== 'playing') return
      if (state.value.currentPlayerId !== botId) return

      const move = chooseBotMove(state.value, botId)
      if (move.type === 'play') {
        const result = canPlay(state.value, botId, move.cards)
        if (result.ok) {
          state.value = applyPlay(state.value, botId, move.cards)
        } else {
          // Defensive: fall back to pass if our own bot proposed something illegal.
          state.value = applyPass(state.value, botId)
        }
      } else {
        const passResult = canPass(state.value, botId)
        if (passResult.ok) {
          state.value = applyPass(state.value, botId)
        } else {
          // Bot is controller and can't pass — force a lead play.
          const fallback = chooseBotMove(
            { ...state.value, currentPlay: null },
            botId,
          )
          if (fallback.type === 'play') {
            state.value = applyPlay(state.value, botId, fallback.cards)
          }
        }
      }

      if (state.value.status === 'roundOver' || state.value.status === 'playing') {
        if (state.value.status === 'roundOver') {
          // Hand emptied; rely on the playPath, but state may have status='roundOver' set by applyPlay.
        }
      }

      if (state.value.status === 'playing') {
        scheduleBotIfNeeded()
      } else if (state.value.status === 'roundOver') {
        // applyPlay set roundOver. Compute scores.
        finalizeRound()
      }
    }, BOT_TURN_DELAY_MS)
  }

  return {
    state,
    selectedIds,
    errorReason,
    botThinkingId,
    humanId,
    isHumanTurn,
    humanHand,
    atRoundLimit,
    createRoom,
    startGame,
    endGame,
    toggleCard,
    clearSelection,
    reorderHand,
    sortHandBy,
    playSelected,
    passTurn,
    nextRound,
    playAgain,
  }
})
