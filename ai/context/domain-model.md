# Domain Model

## Core entities

### Card
```ts
type Suit = 'diamonds' | 'clubs' | 'hearts' | 'spades'
type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2'

type Card = {
  id: string   // stable: `${rank}-${suit}` e.g. '3-diamonds'
  rank: Rank
  suit: Suit
}
```

### Player
```ts
type PlayerId = string

type Player = {
  id: PlayerId
  nickname: string
  isBot: boolean
  connected: boolean              // P2
  disconnectedAt?: number | null  // P2 — ms timestamp
  replacedByBot?: boolean         // P2 — temporary bot stand-in (later)
}
```

### PlayedHand
```ts
type PlayedHandType =
  | 'single' | 'pair' | 'triple'
  | 'straight' | 'flush' | 'fullHouse' | 'fourOfAKind' | 'straightFlush'

type PlayedHand = {
  type: PlayedHandType
  cards: Card[]
  strength: number       // for comparing two hands of the same type
  playedBy: PlayerId
}
```

### GameState
```ts
type GameStatus = 'waiting' | 'playing' | 'roundOver' | 'matchOver'

type GameState = {
  roomCode: string
  status: GameStatus
  roundNumber: number
  turnNumber: number                    // increments on each play; used for pile metadata IDs
  players: Player[]
  hands: Record<PlayerId, Card[]>
  currentPlayerId: PlayerId
  currentPlay: PlayedHand | null
  lastPlayerToPlay: PlayerId | null
  passedPlayerIds: PlayerId[]           // consecutive passes since the last play (cleared on play)
  scores: Record<PlayerId, number>      // running total
  roundDelta: Record<PlayerId, number>  // this round only
  moveLog: MoveLogEntry[]
  playedPile: PlayedPileCard[]          // visual scatter of previously played cards
  settings: RoomSettings
}
```

### PlayedPileCard (TICKET-012)

Tracks cards that have left active play and now sit in the scatter pile under `CurrentPlay`. Metadata is generated once on entry and never mutated.

```ts
type PlayedPileCardMeta = {
  xRatio: number   // -1..1, mapped to a 50vw-wide spread at render time
  yRatio: number   // -1..1, mapped to ±55% of the CurrentPlay container's height
  rotation: number // degrees, ~ -14..14
  zIndex: number   // monotonic — newer cards float on top
}

type PlayedPileCard = {
  id: string                   // `${playerId}-${turnNumber}-${cardId}`
  card: Card
  playedBy: PlayerId
  playedAtTurn: number
  pileMeta: PlayedPileCardMeta
}
```

### MoveLogEntry
```ts
type MoveLogEntry = {
  id: string
  at: number  // ms timestamp
  playerId: PlayerId
  message: string  // pre-rendered friendly string, e.g. "Riley played pair 9♣ 9♥"
  type: 'play' | 'pass' | 'system' | 'score'
}
```

### RoomSettings
```ts
type RoomSettings = {
  playerCount: 3 | 4
  fillWithBots: boolean
  botDifficulty: 'basic'           // only 'basic' in P1
  scoringMode: 'simple'            // only 'simple' in P1
  cardValue: number                // $1, $5, $10, $25, $50, or custom
  roundLimit: number | null        // null = unlimited
  isPublic: boolean                // default true; private rooms hide from the lobby list
}
```

**Notes:**
- The spec (§7) lists `soundEnabled` in `RoomSettings`. We diverge: sound is a per-client preference, not a server-authoritative room setting, so it lives in `settingsStore` (localStorage-backed) and is toggled via the topbar icon in the game view.
- `isPublic` is new beyond the spec. Every room has a `roomCode`. Public rooms are discoverable from the (future, P2) public lobby browser **and** joinable by code. Private rooms are code-only. Default on room creation is public.

## Entity relationships

- One `GameState` per room.
- `GameState.players` is the seat order around the table (turn order).
- `GameState.hands[playerId]` holds each player's cards. In P2, the server has the full map; each client only sees its own entry plus card counts for opponents.
- `currentPlay.playedBy` and `lastPlayerToPlay` both reference `Player.id`.

## Lifecycle states

### GameState.status
- `waiting` → lobby phase, room exists but cards not dealt.
- `playing` → cards dealt, turns in progress.
- `roundOver` → a player has emptied their hand; Round Summary modal is showing. Transitions back to `playing` on Next Round.
- `matchOver` → final round of the configured `roundLimit` has resolved. RoundSummary modal renders in "Match complete" mode with a "Play Again" button that resets the match to round 1.

### Trick lifecycle (within a round)
1. New trick: `currentPlay = null`, `passedPlayerIds = []`. Controller leads.
2. Active trick: each subsequent player either beats the current play (same type, same count) or passes. Passing does **not** remove a player from the trick — they can play again next time the turn comes around. See ADR-0002.
3. Trick resolves: when every other still-in-the-round player has passed **consecutively** since the last play, `lastPlayerToPlay` becomes the new controller. `currentPlay` moves into `playedPile` and clears; `passedPlayerIds` clears.

### Round
1. Deal: 13 cards each for 4-player; 18+17+17 for 3-player with a random seat getting the extra card (see ADR-0004; supersedes ADR-0003's discard variant).
2. Player holding `3♦` starts. First play must include `3♦`.
3. Tricks continue until one player has zero cards.
4. Scoring runs, Round Summary shown. If `roundNumber === roundLimit`, status becomes `matchOver` instead and the modal switches to its "Match complete" / "Play Again" mode.
5. **Ready check before next round.** The round summary stays open until every seated player marks themselves ready. Only when all `players` have readied does the server (P2) or store (P1) advance to `startRound`/`playAgain`. P1: bots auto-ready with a small stagger (300ms + 220ms per bot) for the visual effect — the gate is purely UX. P2: real players each emit a ready event; disconnected players auto-ready after the same 30s grace timer used for auto-pass.

## Business rules

These are the **MVP defaults**. Some are listed as open product decisions in spec §31 — capture them in an ADR if changed.

1. **Starting player:** holder of `3♦` starts every round (not previous winner).
2. **First play must include 3♦.**
3. **Pass-out rule (deviates from spec §10):** passing only skips the current turn — a player who passes can play again next time their turn comes around, so bluffing/baiting is legal. The trick still ends when every other still-in-the-round player passes consecutively since the last play.
4. **No-pass when leading:** controller cannot pass when `currentPlay === null`.
5. **Same-type, same-count matching:** a beating play must have the same `PlayedHandType` and `cards.length` as `currentPlay`. (Exception: five-card hand types compare across the five-card hand ladder — see below.)
6. **Five-card hand ladder (low → high):** `straight < flush < fullHouse < fourOfAKind < straightFlush`. A higher type beats a lower type at the same card count.
7. **No wrap-around straights:** A-2-3-4-5 is **not** valid. (Open decision, MVP says no.)
8. **2 is not usable in straights** in MVP. (Open decision.)
9. **Tie-breakers within a type:**
   - Single / pair / triple: highest rank; for singles, suit breaks ties.
   - Straight, straight flush: highest card, then suit of highest card.
   - Flush: highest card, then next highest, …, then suit of highest.
   - Full house: rank of the triple.
   - Four of a kind: rank of the four.
10. **Scoring (Simple mode):** each losing player pays `cardsRemaining × cardValue`. Winner gains the sum.

## Edge cases

- **3♦ holder must include it in the first play.** Validation enforces this on the first play of every round.
- **Bots playing 3♦:** the bot filters its legal-plays generation to combos containing 3♦ on the first play, then prefers the largest such combo (see Bot behavior below).
- **All opponents pass on first lead:** controller wins control immediately and leads next trick (same player, `currentPlay` cleared, previous lead moved into `playedPile`).
- **Player runs out of cards mid-trick:** round ends as soon as a hand becomes empty. Don't wait for the trick to resolve. The winning play remains visible as `currentPlay` until Next Round / Play Again triggers a new deal.
- **3♦ falls into the discarded 52nd card (3-player only):** currently unhandled — `startRound` throws. See ADR-0003 followup. Probability ~2%.
- **Disconnect on own turn (P2):** 30s timer; if `currentPlay` exists, auto-pass; if controller, auto-play lowest legal move.
- **Tied total scores at match end:** display tied players in the summary; no tiebreaker logic for MVP.
- **Identical cards:** every card has a unique `(rank, suit)` pair so identity comparison by `id` is sufficient. Never compare cards by value-equality of separate objects.

## Bot behavior

Implemented in `src/game/bot.ts`. Single tier: `'basic'`.

- **Responding to a current play:** generate all legal plays that beat it, pick the lowest `strength`. If none, pass.
- **Leading (controller, or first play of round):** dump cards as fast as possible — pick the **largest** legal combo (5-card > triple > pair > single). Within the same size, pick the lowest strength to save big cards for later.
- **First play of round:** plays must include 3♦. Filter legal plays to those containing 3♦, then apply the leading policy (largest combo).
- **Turn delay:** 700ms `setTimeout` in `gameStore` before the bot's move resolves, so the game reads smoothly.
