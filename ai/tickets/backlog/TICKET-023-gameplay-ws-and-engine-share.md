# TICKET-023: Gameplay over WebSockets + engine sharing

## Status

Backlog (depends on TICKET-022)

## Goal

Move the game-rules execution to the server. After this ticket: when the host clicks Start Game, the server deals the cards, owns `GameState`, validates every play and pass, and pushes `gameUpdated` to each client with their private view. Clients become thin renderers.

This is also where we formalize **engine sharing** between `frontend/` and `backend/`. ADR-0006 lands as part of this ticket.

## Background

Spec §18–§22 spell out the server-authoritative model. The engine in `frontend/src/game/` is already pure TypeScript with no Vue/Pinia/DOM imports (per ADR-0001), so sharing is mechanical, not architectural.

## Requirements

### Engine sharing — ADR-0006 to land in this ticket

Pick one of:

1. **npm workspaces** with a `shared/` (or `packages/engine/`) package:
   - Root `package.json` declares `workspaces: ["frontend", "backend", "shared"]`
   - `shared/package.json` is `@bigtwo/shared` exporting the engine
   - Move `frontend/src/game/*` → `shared/src/*`
   - Update frontend imports (find/replace `@/game/...` → `@bigtwo/shared` or keep `@/game/*` aliased to `../shared/src/*`)
   - Backend depends on `@bigtwo/shared`
2. **tsconfig paths + relative imports**: frontend keeps engine under `frontend/src/game/`, backend adds a path mapping pointing there. Runtime requires `tsx` or a build step that resolves the path.
3. **Copy**: pre-build step copies engine to backend. Ugly, last resort.

**Recommend option 1.** Cleanest, standard, makes the engine's API surface explicit via the barrel `index.ts`. Tradeoffs documented in ADR-0006.

### Server-side events

Client → server:

```ts
startGame({ roomCode })                       // host only
playCards({ roomCode, cardIds })
passTurn({ roomCode })
```

Server → client:

```ts
gameUpdated(playerPrivateState)               // per-client; own hand + opponents' counts
invalidMove({ reason })                       // sender-only
roundEnded(roundSummary)
```

### `GameState` on the server

Server holds the canonical `GameState` per room. On every play/pass:

1. Look up room, find player by socket binding (set during `joinRoom`/`rejoinRoom`)
2. Validate via shared `canPlay` / `canPass`
3. If ok → `applyPlay` / `applyPass`
4. Build per-player `playerPrivateState` and emit `gameUpdated` to each socket in the room
5. If `state.status === 'roundOver'`, run `calculateRoundDelta`, emit `roundEnded`

`playerPrivateState` shape (per spec §21):

```ts
{
  playerId: PlayerId,
  hand: Card[],                  // ONLY this player's
  roomCode, status, roundNumber, turnNumber,
  currentPlayerId, currentPlay, lastPlayerToPlay,
  passedPlayerIds,
  scores, roundDelta,
  moveLog,
  playedPile,                    // pile metadata generated server-side
  settings,
  opponents: Array<{
    playerId, nickname, cardCount, connected, score
  }>
}
```

Never include other players' hands. Stripping happens at emit time.

### Bot turns

- Server schedules bot turns with `setTimeout(700ms)` and emits the same events as for human plays.
- `chooseBotMove` runs server-side via the shared engine.
- All clients see bot moves at the same time.

### Frontend changes

- `gameStore` drops its local engine-driving code in P2-mode; switches to:
  - Listening on `gameUpdated` and replacing local state
  - Emitting `playCards` / `passTurn` instead of applying directly
- `errorReason` is set from `invalidMove({ reason })` payloads.
- Sound triggers and the shake animation still work — they watch `state` for changes, regardless of whether the source is local or server.

### P1 backward-compat

- Local mode still works for "Create Room → play with 3 bots, no other humans needed." Detect via `settings.fillWithBots && playerCount === number_of_seats_filled_by_bots_plus_host`. Or just always go through the server, even for solo-vs-bots. Either is fine — pick in implementation.

## Acceptance criteria

- Two browsers in the same room, host starts the game, both see cards dealt at the same instant.
- Each client only ever sees its own hand in network payloads (check via devtools).
- Plays validate server-side: client editing devtools to send fake cards gets `invalidMove`.
- Round end / Round Summary modal shows correct deltas, sourced from server.
- Bots take their turns visibly on all clients ~700ms apart.
- Type-check passes across `frontend/`, `backend/`, and `shared/`.

## Files likely involved

- New `shared/` workspace + its `package.json`/`tsconfig.json`/`src/index.ts` (or whatever sharing strategy ADR-0006 picks)
- `backend/src/game.ts` — server-side game orchestration (apply moves, schedule bots, emit)
- `backend/src/socket.ts` — wire game events
- `frontend/src/stores/gameStore.ts` — replace local apply with emit + listen
- `frontend/src/components/PlayedCardPile.vue` — read `pileMeta` from server, no client RNG
- `ai/decisions/ADR-0006-engine-sharing.md` — new

## Out of scope

- Ready check (TICKET-024)
- Disconnect handling (TICKET-008)
- Pile metadata determinism beyond "server assigns once" (deterministic seeded RNG is over-engineering until we see latency cause divergence)

## Notes for implementation

- The pile's `pileMeta` is now server-issued. Clients render only. Avoids two clients seeing different "random" scatter patterns.
- For `playerPrivateState`, write a `serializeForPlayer(state, playerId)` helper that handles the stripping. Test it.
- Latency: a real play resolves in <100ms locally — fine. We may want optimistic local play for the human's own moves, with rollback on `invalidMove`. Defer that polish; first ship the strict server-round-trip version.
