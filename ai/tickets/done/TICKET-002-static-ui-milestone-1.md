# TICKET-002: Build Milestone 1 static UI with fake data

## Status

Done

## Goal

Build all P1 pages and components with hard-coded fake data so we can visually verify the layout matches the reference mockups before wiring up real game logic. No bots, no real shuffle, no scoring — just pixels.

## Background

Spec §27 Milestone 1 says: build static UI first, game engine second. The reference PNGs in `references/` are the source of truth for layout. We want to know the UI works before we put effort into rules.

This ticket also exercises the boundary set up by ADR-0001: components stay dumb, fake data is passed in as props.

## Requirements

Build the following pages and components with fake data matching the reference mockups:

**Pages:**
- `HomePage.vue` — matches `references/big_two_game_dashboard_mockup.png`. Buttons: Play with Bots, Create Room, Rules. Footer copy: "No real money — friendly score tracking only."
- `CreateRoomPage.vue` — matches `references/create_room_page_for_card_game.png`. All fields from spec §7 (nickname, player count, fill with bots, bot difficulty, scoring mode, card value, round limit, sound). Use a local `ref` for form state.
- `GamePage.vue` — matches `references/online_big_two_card_game_interface.png`. Top bar, three opponent panels, current play, your hand (13 cards), action bar, scoreboard, move log.
- `RulesPage.vue` — matches `references/big_two_game_rules_overview.png` and `card_game_rules_guide_dashboard.png`. Sections: Goal, Card Order, Suit Order, Turn Flow, Valid Plays, Scoring.

**Components (dumb / props-only):**
- `PlayingCard.vue` — single card. Props: `card`, `selected`, `faceDown?`. Click emits `select`. Red suits red, black suits black. Selected card lifts.
- `PlayerPanel.vue` — opponent panel. Props: `name`, `cardCount`, `score`, `lastAction?`, `status?`. Matches the three opponent panels in the game mockup.
- `HandArea.vue` — your hand. Renders a row of `PlayingCard`s.
- `CurrentPlay.vue` — center "Current play" area. Props: `cards`, `handType`, `playedBy`.
- `ActionBar.vue` — Play Selected, Pass, Sort by Rank, Sort by Suit buttons. Emits intents only.
- `Scoreboard.vue` — table of player rows with totals. Matches the right-rail card in the game mockup.
- `MoveLog.vue` — vertical list of recent moves with avatar dot and timestamp.
- `RoundSummaryModal.vue` — modal version of spec §26 layout.
- `RulesModal.vue` — content from RulesPage rendered as a modal.

All real interactions (selecting, sorting, playing) can be no-ops or local-state-only in this ticket. The point is the UI scaffolding.

## Acceptance criteria

- Each page is reachable via Vue Router and renders without console errors.
- The layout of each page is recognizably the corresponding reference PNG. Pixel-perfect is not required; structure and spacing are.
- `PlayingCard` correctly renders rank, suit symbol, and red/black color for all four suits.
- Selected cards visually lift (CSS transform).
- Action Bar buttons are clickable and emit events (even if the page's handler is a no-op).
- The footer "No real money — friendly score tracking only." appears on HomePage and somewhere visible in GamePage.
- No game rules live inside any component or page — fake data is hard-coded or passed in as props.
- All copy follows the tone guide in `ai/conventions.md` (no casino language).

## Files likely involved

- `src/pages/HomePage.vue`
- `src/pages/CreateRoomPage.vue`
- `src/pages/GamePage.vue`
- `src/pages/RulesPage.vue`
- `src/components/PlayingCard.vue`
- `src/components/PlayerPanel.vue`
- `src/components/HandArea.vue`
- `src/components/CurrentPlay.vue`
- `src/components/ActionBar.vue`
- `src/components/Scoreboard.vue`
- `src/components/MoveLog.vue`
- `src/components/RoundSummaryModal.vue`
- `src/components/RulesModal.vue`
- `src/router/index.ts`
- `src/style.css` / Tailwind config for any custom theme tokens

## Out of scope

- Real deck, shuffle, deal.
- Real card selection logic tied to game state (selection can be local to `HandArea` for now).
- Hand validation / can-play.
- Bots, turns, scoring, animations beyond the card lift.
- Sounds.
- JoinRoom / Lobby pages (P2).

## Notes for implementation

- Build `PlayingCard` first; it's the most reused component.
- Use the rank/suit constants from spec §10 even though `src/game/cards.ts` is a placeholder — define them locally for now and migrate in TICKET-003.
- Match the light, clean visual style of the references: white panels, subtle borders/shadows, generous whitespace, blue primary button. Avoid dark / casino palettes.
- Don't fight the references on details that don't matter (exact pixel values, exact gray shade). Match structure.
