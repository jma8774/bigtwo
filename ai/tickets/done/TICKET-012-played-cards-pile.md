# TICKET-012: Persistent played-cards pile under Current Play

## Status

Done

## Goal

Make the center of the table feel alive by accumulating a scattered pile of previously-played cards underneath the active `CurrentPlay` area. Each pile card gets stable random-looking placement (offset + rotation + z-index) that **never changes** after it lands — no jitter on re-render, sort, or any other state update.

## Background

Today, when a new play happens, the previous play simply disappears. The middle of the table looks empty between plays. Adding a persistent pile that grows during a round makes the game feel physical, like a real table, without crossing into casino territory.

This is P1 polish / P2 nice-to-have. The rules engine doesn't need it; the UI does.

## Requirements

### Data model

Extend `GameState` (or attach to the game store — pile is UI-visible state, but tied to the round, so it belongs on the state):

```ts
type PlayedPileCardMeta = {
  x: number          // px offset within the table area
  y: number          // px offset
  rotation: number   // degrees, ~ -14..14
  zIndex: number     // monotonic — newer cards on top
}

type PlayedPileCard = {
  id: string                // stable: `${playerId}-${turnNumber}-${card.id}`
  card: Card
  playedBy: PlayerId
  playedAtTurn: number
  pileMeta: PlayedPileCardMeta
}
```

Add to `GameState`:

```ts
playedPile: PlayedPileCard[]
turnNumber: number   // increments on each play; used for pile keys + zIndex
```

### Lifecycle

1. **Round start** (`startRound`): `playedPile = []`, `turnNumber = 0`.
2. **New play lands in `applyPlay`**: before assigning the new `currentPlay`, move the *old* `currentPlay.cards` into `playedPile` with freshly-generated `pileMeta` per card. Increment `turnNumber`.
3. **Trick reset** (all but the leader passed): no special handling — the prior `currentPlay` stays on top until the next play moves it into the pile.
4. **Round end**: keep the pile visible behind the winning play until the round summary closes. Pile clears on the next `startRound`.

Helper to write:

```ts
function moveCurrentPlayToPile(state: GameState): GameState {
  if (!state.currentPlay) return state
  const newPileCards = state.currentPlay.cards.map((card, offset) => ({
    id: `${state.currentPlay!.playedBy}-${state.turnNumber}-${card.id}`,
    card,
    playedBy: state.currentPlay!.playedBy,
    playedAtTurn: state.turnNumber,
    pileMeta: createPileMeta(state.playedPile.length + offset),
  }))
  return { ...state, playedPile: [...state.playedPile, ...newPileCards] }
}

function createPileMeta(index: number): PlayedPileCardMeta {
  return {
    x: Math.round(randomBetween(-42, 42)),
    y: Math.round(randomBetween(-24, 28)),
    rotation: Number(randomBetween(-14, 14).toFixed(1)),
    zIndex: index,
  }
}
```

### Critical rule: never derive placement during render

```ts
// BAD — randomness re-runs on every render, pile twitches.
style={{ transform: `rotate(${Math.random() * 10}deg)` }}

// GOOD — generated once when the card entered the pile, then read from state.
style={{
  transform: `translate(${pileMeta.x}px, ${pileMeta.y}px) rotate(${pileMeta.rotation}deg)`,
  zIndex: pileMeta.zIndex,
}}
```

Placement stability must hold across:
- Component re-renders (any state change)
- New cards being played
- Bot turns (turn timer advances)
- Sorting the player hand
- Window resizing
- Scoreboard updates / chat panel opens

### Component structure

```
CurrentPlay.vue (existing — already wraps the current play card row)
└── PlayedCardPile.vue (new — sibling layer, absolute-positioned behind)
```

Restructure the table-center area so both share a relative container:

```vue
<div class="relative">
  <PlayedCardPile :cards="state.playedPile" class="absolute inset-0 z-0" />
  <CurrentPlay ... class="relative z-10" />
</div>
```

### Pile rendering rules

Each pile card:
- Smaller than active cards (e.g., `scale-90`)
- Lower opacity (75–85%)
- Subtle drop shadow
- `pointer-events: none` so they don't interfere with hand interaction
- `position: absolute`, centered, translated/rotated per `pileMeta`
- `disabled` on the inner `PlayingCard` so no hover/cursor effects

Current play stays on top with full size, full opacity, normal spacing.

### Capping (optional, defer)

P1 MVP: render every pile card. Up to ~52 in a 4-player round is fine.

Future: after 30 cards, tighten spacing or fade older ones further. After 40, switch to a compact stack badge ("Played pile · 38 cards"). Not in this ticket.

## Acceptance criteria

- After at least two plays in a round, the prior play visibly remains as a scattered pile below the current play.
- Each pile card has a small offset and rotation; together they look natural, not gridded.
- Sorting the hand, opening the chat, or any other UI event does not move pile cards.
- Bot turns add cards to the pile correctly; their positions stay fixed once placed.
- Round end leaves the pile visible behind the round summary modal.
- `startRound` (Next Round / Play Again) clears the pile to empty.
- Existing card-play sound still fires on play.
- No casino-like visuals (sparkles, big shadows, animations more elaborate than fade/transform).

## Files likely involved

- `src/game/gameState.ts` — extend `GameState`, add `turnNumber`, `playedPile`, `PlayedPileCard`, `PlayedPileCardMeta`, `createInitialState` / `startRound` reset both
- `src/game/rules.ts` — `applyPlay` moves the old `currentPlay` into pile before setting the new one; increments `turnNumber`
- `src/components/PlayedCardPile.vue` — new component
- `src/components/CurrentPlay.vue` — wrap with relative container, mount the pile as a sibling layer
- `src/pages/GamePage.vue` — pass `state.playedPile` through

## Out of scope

- Animation of the previous play sliding/fading into the pile (just snap for MVP)
- Server-authoritative pile metadata (P2 concern — for now generate on the client; spec calls out two options)
- Stack compression / count badge for huge piles
- Pile cards being inspectable / clickable
- Persisting the pile across rounds (it resets per round)

## Notes for implementation

- Use a small deterministic-enough RNG (`Math.random()` is fine) when *generating* meta. Don't seed from card ID yet; that's a P2 concern.
- Keep `playedPile` on `GameState` so it serializes cleanly to the server later. Don't stash it in component-local state.
- The pile renders behind `CurrentPlay`. Use `z-index: 0` on the pile layer and `z-index: 10` on the current play. Both inside a single `relative` parent.
- Set `aria-hidden="true"` on the pile — it's decorative.

## Priority

P1 polish. Ship before P2 multiplayer if possible; otherwise it lives comfortably as an early P2 polish ticket.
