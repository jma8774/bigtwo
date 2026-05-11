export type Suit = 'diamonds' | 'clubs' | 'hearts' | 'spades'
export type Rank =
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | '2'

export type Card = {
  id: string
  rank: Rank
  suit: Suit
}

export const RANKS: readonly Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
  '2',
]

export const SUITS: readonly Suit[] = ['diamonds', 'clubs', 'hearts', 'spades']

export const rankValue: Record<Rank, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  '2': 15,
}

export const suitValue: Record<Suit, number> = {
  diamonds: 1,
  clubs: 2,
  hearts: 3,
  spades: 4,
}

export const suitSymbol: Record<Suit, string> = {
  diamonds: '♦',
  clubs: '♣',
  hearts: '♥',
  spades: '♠',
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'diamonds' || suit === 'hearts'
}

export function cardId(rank: Rank, suit: Suit): string {
  return `${rank}-${suit}`
}

export function compareCards(a: Card, b: Card): number {
  const r = rankValue[a.rank] - rankValue[b.rank]
  if (r !== 0) return r
  return suitValue[a.suit] - suitValue[b.suit]
}

export function sortByRank(cards: readonly Card[]): Card[] {
  return [...cards].sort(compareCards)
}

export function sortBySuit(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const s = suitValue[a.suit] - suitValue[b.suit]
    if (s !== 0) return s
    return rankValue[a.rank] - rankValue[b.rank]
  })
}

/**
 * Group cards by rank, then arrange tiers: quads → triples → pairs → singles.
 * 2s (highest rank) always trail at the end, preserving their own tier order.
 * Within each rank group, cards are sorted by suit (♦ < ♣ < ♥ < ♠).
 */
export function smartSort(cards: readonly Card[]): Card[] {
  const groups = new Map<Rank, Card[]>()
  for (const c of cards) {
    const arr = groups.get(c.rank)
    if (arr) arr.push(c)
    else groups.set(c.rank, [c])
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => suitValue[a.suit] - suitValue[b.suit])
  }

  const main: Card[][] = []
  const twos: Card[][] = []
  for (const [rank, arr] of groups) {
    if (rank === '2') twos.push(arr)
    else main.push(arr)
  }

  const tierSort = (a: Card[], b: Card[]) => {
    if (b.length !== a.length) return b.length - a.length
    return rankValue[a[0].rank] - rankValue[b[0].rank]
  }
  main.sort(tierSort)
  twos.sort(tierSort)

  return [...main.flat(), ...twos.flat()]
}
