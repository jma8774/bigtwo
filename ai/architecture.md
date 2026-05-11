# Architecture

## System overview

P1 is a Vue 3 SPA running entirely in the browser. There is no backend in P1; bots and game state live in memory in a Pinia store. Game rules are pure TypeScript functions imported by the store.

P2 introduces a Node + Socket.IO server that owns game state. The client becomes a thin view that emits intents (`playCards`, `passTurn`) and renders server-pushed state. Server keeps an in-memory room store; Redis is optional later.

## Repository layout

See ADR-0005 for the frontend/backend split rationale.

```
bigtwo/
  ai/                          # project context for AI agents
  references/                  # UI mockups and full spec (read-only reference)
  frontend/                    # Vue 3 SPA
    package.json
    vite.config.ts
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    index.html
    public/
    src/
      pages/                   # route-level Vue components
      HomePage.vue
      CreateRoomPage.vue
      JoinRoomPage.vue         # P2 mock (not wired to backend yet)
      LobbyPage.vue            # P2 mock
      GamePage.vue
      RulesPage.vue
    components/                # render-only Vue components
      AppLogo.vue
      AppTopBar.vue            # shared topbar with named slots, ~64px h-16
      PlayingCard.vue
      PlayerPanel.vue
      HandArea.vue             # drag-to-reorder + click-to-select; document pointer events
      CurrentPlay.vue
      PlayedCardPile.vue       # absolute-positioned pile under CurrentPlay (TICKET-012)
      ActionBar.vue
      Scoreboard.vue           # currently unused — kept for potential reuse
      MoveLog.vue              # currently unused — content lives inside ChatPanel's Log tab
      ChatPanel.vue            # bottom-right floating panel: Log + Chat tabs
      RoundSummaryModal.vue    # accepts `isFinal` to render Match Complete mode
      RulesModal.vue
      ConnectionStatus.vue     # P2 placeholder
    game/                      # PURE TypeScript — no Vue/Pinia/socket/DOM imports
      cards.ts                 # types, rankValue, suitValue, sortByRank, sortBySuit, smartSort
      deck.ts                  # createDeck, shuffle(rng), deal(playerCount)
      handEvaluation.ts        # evaluate(): EvaluatedHand | null
      rules.ts                 # canPlay, canPass, applyPlay, applyPass
      legalMoves.ts            # generateLegalPlays for bots
      scoring.ts               # calculateRoundDelta
      bot.ts                   # chooseBotMove (basic policy)
      gameState.ts             # GameState, createInitialState, startRound, moveCurrentPlayToPile
    stores/
      gameStore.ts             # holds GameState, schedules bot turns, triggers sounds via watchers
      settingsStore.ts         # soundEnabled + nickname, persisted to localStorage
    utils/
      sound.ts                 # playSound('cardPlay' | 'yourTurn'); respects settingsStore
    assets/
      sounds/
        card-play.wav
        your-turn.wav
      router/
      style.css
      main.ts
      App.vue
  backend/                     # P2 — Node + Socket.IO (not started)
```

All `src/...` paths in this document refer to `frontend/src/...` unless otherwise noted.

## Major modules

- **`src/game/`** — pure TS. No Vue, Pinia, socket, DOM, or sound imports. Deterministic where possible (`shuffle` takes an RNG).
  - `cards.ts` — `Suit`, `Rank`, `Card` types; `rankValue`, `suitValue`; `sortByRank`, `sortBySuit`, `smartSort` (groups triples/pairs/singles, 2s last).
  - `deck.ts` — `createDeck`, `shuffle(rng = Math.random)`, `deal(playerCount)` (13×4 or 17×3).
  - `handEvaluation.ts` — `evaluate(cards) → EvaluatedHand | null` for singles, pairs, triples, and all five 5-card hands.
  - `rules.ts` — `canPlay`, `canPass`, `applyPlay`, `applyPass`. Pass rule per ADR-0002 (re-entry allowed).
  - `legalMoves.ts` — `generateLegalPlays(hand, currentPlay)` for bots.
  - `scoring.ts` — `calculateRoundDelta` (`cardsRemaining × cardValue`).
  - `bot.ts` — `chooseBotMove`. Responding: lowest legal beating play. Leading: largest combo (5 > 3 > 2 > 1), lowest strength within size. First play: must include 3♦.
  - `gameState.ts` — `GameState`, `createInitialState`, `startRound`, `moveCurrentPlayToPile`, `createPileMeta`.

- **`src/stores/gameStore.ts`** — Pinia store. Holds `GameState`, exposes `startGame / playSelected / passTurn / nextRound / playAgain / endGame / toggleCard / reorderHand / sortHandBy`. Schedules bot turns with a 700ms `setTimeout`. Two watchers fire sounds:
  - `cardPlay` on every new `'play'` moveLog entry — except when the play ended the round (no celebration on the winning play).
  - `yourTurn` when `currentPlayerId` transitions to the human's id during `status === 'playing'`.

- **`src/stores/settingsStore.ts`** — `soundEnabled` and `nickname`, persisted to `localStorage` under `bigTwoSettings`.

- **`src/utils/sound.ts`** — lazy-loaded `HTMLAudioElement` cache, respects `settingsStore.soundEnabled`, swallows autoplay-blocked errors.

- **`src/components/`** — render-only Vue components. Props in, events out. No game logic inside.

- **`src/pages/`** — route targets. Compose components, talk to stores.

- **`server/` (P2)** — not started. Will own authoritative `GameState`, validate every move, send per-player private state, manage disconnect timers.

## Data flow

### P1 (local)

```
User click → component event → page handler → gameStore action →
  src/game/ pure function returns new state → gameStore commits state →
  components re-render → if bot's turn, gameStore schedules setTimeout → repeat
```

### P2 (multiplayer)

```
User click → component event → gameStore emits socket event (playCards/passTurn) →
  server validates → server updates room state →
  server emits gameUpdated(privatePlayerState) to each client →
  gameStore replaces local state → components re-render
```

Clients never compute authoritative state in P2. They optimistically reflect their own action only if it's safe; otherwise they wait for `gameUpdated`.

## Authentication and authorization

- **P1:** none. Single browser, single player.
- **P2:** no login. Identity is `(roomCode, playerId, seatToken)`. Server issues `seatToken` on `createRoom`/`joinRoom`. Client stores `{ roomCode, playerId, seatToken }` in `localStorage` under key `bigTwoSession`. On reconnect, client sends `rejoinRoom`; server verifies all three. Never accept rejoin with only `playerId`.

## External services

None in P1.

In P2: Socket.IO is the only "external" piece, and it's our own server. Optional Redis later for horizontal scaling. No third-party auth, no analytics, no payment providers — ever.

## Background jobs

None server-side in P1. In P2, each room maintains:
- A disconnect timer per disconnected player (30s default) that triggers `auto-pass` or `auto-play lowest legal move` if the player controls the table.
- A bot turn delay (~700ms) for readability — runs on the server in P2, in the store in P1.
- Room expiration cleanup (timings TBD).

## Error handling

- **Invalid moves (P1 and P2):** never throw to the user. Return a typed result `{ ok: false, reason: 'NOT_YOUR_TURN' | 'INVALID_HAND' | ... }`. UI maps reasons to friendly inline messages near the action bar (see spec §25). Never use `alert()`.
- **Server errors (P2):** server emits `invalidMove({ reason })` to the offending client; never broadcast.
- **Network errors (P2):** client shows "Disconnected" banner and attempts rejoin with stored session.

## Testing architecture

Aspirational. Today: only `src/game/cards.test.ts` has coverage (6 tests for sort helpers and rank/suit ordering). Adding tests for `deck`, `handEvaluation`, `rules`, `scoring`, `bot` is tracked but not done — the game has been playtested visually.

- **Unit tests** belong in `src/game/*.test.ts` (Vitest). Highest-leverage surface; pure functions, deterministic. Inject the RNG when testing shuffles/deals.
- **Component tests** with `@vue/test-utils` reserved for non-trivial interactions (the drag-to-reorder path in `HandArea` is the obvious candidate).
- **Integration tests** (P2): in-process server with mock sockets, validating room flow and anti-cheat.
- E2E: out of scope until after P2 MVP.

## Deployment model

- **P1:** static SPA. Build with Vite, deploy to any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront). No server needed.
- **P2:** Node process for the Socket.IO server, deployed alongside the static client. Specifics TBD; in-memory room store means a single instance for MVP.
