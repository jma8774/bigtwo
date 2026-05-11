import { describe, it, expect } from 'vitest'
import {
  compareCards,
  isRedSuit,
  rankValue,
  smartSort,
  sortByRank,
  sortBySuit,
} from './cards'
import type { Card, Rank, Suit } from './cards'

describe('cards', () => {
  it('orders 3 < 2', () => {
    expect(rankValue['3']).toBeLessThan(rankValue['2'])
  })

  it('isRedSuit identifies red suits', () => {
    expect(isRedSuit('hearts')).toBe(true)
    expect(isRedSuit('diamonds')).toBe(true)
    expect(isRedSuit('clubs')).toBe(false)
    expect(isRedSuit('spades')).toBe(false)
  })

  it('compareCards puts 3 of diamonds first', () => {
    const three_d = { id: '3-diamonds', rank: '3', suit: 'diamonds' } as const
    const two_s = { id: '2-spades', rank: '2', suit: 'spades' } as const
    expect(compareCards(three_d, two_s)).toBeLessThan(0)
  })

  it('sortByRank and sortBySuit produce stable orderings', () => {
    const hand = [
      { id: '2-spades', rank: '2', suit: 'spades' } as const,
      { id: '3-diamonds', rank: '3', suit: 'diamonds' } as const,
      { id: 'J-hearts', rank: 'J', suit: 'hearts' } as const,
    ]
    expect(sortByRank(hand)[0].rank).toBe('3')
    expect(sortBySuit(hand)[0].suit).toBe('diamonds')
  })

  it('smartSort groups triples, pairs, singles and trails 2s', () => {
    const card = (rank: Rank, suit: Suit): Card => ({ id: `${rank}-${suit}`, rank, suit })
    const hand: Card[] = [
      card('3', 'diamonds'),
      card('4', 'clubs'),
      card('4', 'hearts'),
      card('4', 'spades'),
      card('5', 'diamonds'),
      card('6', 'hearts'),
      card('6', 'spades'),
      card('9', 'clubs'),
      card('J', 'diamonds'),
      card('J', 'spades'),
      card('K', 'hearts'),
      card('2', 'clubs'),
      card('2', 'hearts'),
    ]

    const sorted = smartSort(hand)
    const ranks = sorted.map((c) => c.rank)
    // Triples (4s) come first
    expect(ranks.slice(0, 3)).toEqual(['4', '4', '4'])
    // Then pairs (6s then Js), lower rank first
    expect(ranks.slice(3, 5)).toEqual(['6', '6'])
    expect(ranks.slice(5, 7)).toEqual(['J', 'J'])
    // Then singles (3, 5, 9, K) in rank order
    expect(ranks.slice(7, 11)).toEqual(['3', '5', '9', 'K'])
    // 2s at the very end
    expect(ranks.slice(11)).toEqual(['2', '2'])
  })

  it('smartSort puts a lone 2 at the very end', () => {
    const card = (rank: Rank, suit: Suit): Card => ({ id: `${rank}-${suit}`, rank, suit })
    const hand: Card[] = [card('K', 'hearts'), card('2', 'spades'), card('3', 'diamonds')]
    const ranks = smartSort(hand).map((c) => c.rank)
    expect(ranks).toEqual(['3', 'K', '2'])
  })
})
