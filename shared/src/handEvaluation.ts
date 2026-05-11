import type { Card, Rank } from './cards'
import { rankValue, suitValue } from './cards'
import type { PlayedHand, PlayedHandType } from './gameState'

export const FIVE_CARD_TYPES: PlayedHandType[] = [
  'straight',
  'flush',
  'fullHouse',
  'fourOfAKind',
  'straightFlush',
]

const FIVE_CARD_RANK: Record<string, number> = {
  straight: 1,
  flush: 2,
  fullHouse: 3,
  fourOfAKind: 4,
  straightFlush: 5,
}

export type EvaluatedHand = Omit<PlayedHand, 'playedBy'>

export function evaluate(cards: Card[]): EvaluatedHand | null {
  if (!cards || cards.length === 0) return null
  if (cards.length === 1) return single(cards)
  if (cards.length === 2) return pair(cards)
  if (cards.length === 3) return triple(cards)
  if (cards.length === 5) return fiveCard(cards)
  return null
}

function single(cards: Card[]): EvaluatedHand {
  const c = cards[0]
  return {
    type: 'single',
    cards,
    strength: rankValue[c.rank] * 10 + suitValue[c.suit],
  }
}

function pair(cards: Card[]): EvaluatedHand | null {
  if (cards[0].rank !== cards[1].rank) return null
  const top = cards.reduce((a, b) => (suitValue[a.suit] > suitValue[b.suit] ? a : b))
  return {
    type: 'pair',
    cards,
    strength: rankValue[cards[0].rank] * 10 + suitValue[top.suit],
  }
}

function triple(cards: Card[]): EvaluatedHand | null {
  const [a, b, c] = cards
  if (a.rank !== b.rank || a.rank !== c.rank) return null
  return {
    type: 'triple',
    cards,
    strength: rankValue[a.rank],
  }
}

function fiveCard(cards: Card[]): EvaluatedHand | null {
  const sorted = [...cards].sort(
    (a, b) =>
      rankValue[a.rank] - rankValue[b.rank] || suitValue[a.suit] - suitValue[b.suit],
  )
  const suits = new Set(sorted.map((c) => c.suit))
  const ranks = sorted.map((c) => rankValue[c.rank])
  const rankCounts: Record<string, number> = {}
  for (const c of sorted) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1
  const counts = Object.values(rankCounts).sort((a, b) => b - a)

  const isFlush = suits.size === 1
  // MVP: no 2s in straights, no wrap-around
  const isStraight = isConsecutive(ranks) && !ranks.includes(rankValue['2'])

  if (isFlush && isStraight) {
    return makeFive('straightFlush', sorted, ranks[4], suitValue[sorted[4].suit])
  }
  if (counts[0] === 4) {
    const quadRank = pickRankByCount(rankCounts, 4)
    return makeFive('fourOfAKind', sorted, rankValue[quadRank], 0)
  }
  if (counts[0] === 3 && counts[1] === 2) {
    const tripleRank = pickRankByCount(rankCounts, 3)
    return makeFive('fullHouse', sorted, rankValue[tripleRank], 0)
  }
  if (isFlush) {
    return makeFive('flush', sorted, ranks[4], suitValue[sorted[4].suit])
  }
  if (isStraight) {
    return makeFive('straight', sorted, ranks[4], suitValue[sorted[4].suit])
  }
  return null
}

function isConsecutive(ranks: number[]): boolean {
  const s = [...ranks].sort((a, b) => a - b)
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1] + 1) return false
  }
  return true
}

function pickRankByCount(counts: Record<string, number>, target: number): Rank {
  for (const [r, c] of Object.entries(counts)) {
    if (c === target) return r as Rank
  }
  throw new Error('unreachable')
}

function makeFive(
  type: PlayedHandType,
  cards: Card[],
  primary: number,
  suitBreak: number,
): EvaluatedHand {
  return {
    type,
    cards,
    strength: FIVE_CARD_RANK[type] * 1_000_000 + primary * 100 + suitBreak,
  }
}
