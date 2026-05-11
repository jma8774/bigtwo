# Big Two Online Card Game — Product & Implementation Spec

## 1. Product Summary

Build a clean, friendly, non-predatory online Big Two card game, also known as Chinese Poker / 锄大地 / 大老二 depending on region. This is the climbing/shedding card game, not Open-Face Chinese Poker.

The product should feel like a simple web table for friends, not a casino app and not a flashy mobile game. No real-money gambling. Fake money / table score is used only for competition and fun.

## 2. High-Level Goals

- 3–4 player Big Two game.
- 4 players preferred.
- Phase 1: single-player against bots, no backend.
- Phase 2: multiplayer with room code and WebSockets.
- No login or accounts.
- Users enter a nickname and play.
- Fake money / table score tracks wins and losses.
- Clean desktop-first UI.
- Mobile support is P3 and should come after the core game works.
- Minimal sound design: only card-play sound and round-win sound for now.
- Simple animations for feedback, not flashy casino-style effects.

## 3. Non-Goals for Early Versions

Do not build these in P1:

- Real-money betting.
- Login/accounts/authentication.
- Public matchmaking.
- Ranked ladder.
- Chat system.
- Spectators.
- Mobile polish.
- Advanced casino-like animations.
- Confetti/loot-box-style feedback.
- Complex bot AI.
- Persistent player history.

## 4. Tech Stack

### P1 Frontend

- Vue 3
- Vite
- TypeScript
- Tailwind CSS
- Vue Router
- Pinia
- DOM-based card UI, not Canvas

### P2 Backend

- Node.js
- TypeScript
- Socket.IO
- In-memory room store for MVP
- Optional Redis later if horizontally scaling

### Why SPA / DOM Instead of Canvas or Phaser

This game is mostly UI: cards, room settings, buttons, scoreboards, move logs, modals, and simple animations. A Vue SPA with DOM elements is the best fit.

Use DOM/CSS for:

- Card rendering
- Dragging/rearranging hand
- Tap/click selection
- Scoreboard
- Room creation forms
- Lobby
- Rules modal
- Move log
- Sounds
- Transitions

Do not use Phaser or Canvas unless the product intentionally shifts toward a heavily animated game-table experience.

## 5. Priority Levels

### P1 — Core Local Game

Desktop-first single-player bot version with no backend.

Must include:

- Create Room screen with settings
- Game screen
- Deck creation / shuffle / deal
- Big Two rules validation
- Bot turns
- Score calculation
- Round summary
- Card selection
- Sort by rank / suit
- Basic card rearranging if feasible
- Card-play sound
- Round-win sound
- Basic CSS transitions

### P2 — Multiplayer

Online play with room codes and WebSockets.

Must include:

- Create online room
- Join room by code
- Nickname-only identity
- Room lobby
- Host starts game
- Server-authoritative game state
- Server-side move validation
- Per-browser seat token
- Disconnect/reconnect handling
- Disconnected player status

### P3 — Mobile

Mobile comes later after core gameplay and multiplayer work.

Must include later:

- Responsive game layout
- Mobile hand layout
- Large touch targets
- Sticky action bar
- Horizontal hand scroll or fanned hand
- Possibly long-press drag to rearrange

## 6. App Pages

### P1 Pages

#### HomePage

Purpose: entry point.

Content:

- App title: Big Two
- Short description
- Button: Play with Bots
- Button: Create Room
- Button: Rules
- Small note: No real money — friendly score tracking only.

For P1, Play with Bots can route to CreateRoomPage with bot defaults.

#### CreateRoomPage

Purpose: configure a table before starting.

Fields:

- Nickname
- Player count: 3 / 4
- Fill empty seats with bots: on/off
- Bot difficulty: Basic only for P1
- Scoring mode
- Card value / dollar value per remaining card
- Round limit
- Sound effects: on/off
- Start Game button

Suggested default values:

- Nickname: You
- Player count: 4
- Fill with bots: true
- Bot difficulty: Basic
- Scoring mode: Simple
- Card value: $10 per card
- Round limit: Unlimited
- Sound effects: On

#### GamePage

Purpose: actual game table.

Sections:

- Top bar
- Opponent panels
- Current play area
- Player hand
- Action bar
- Scoreboard
- Move log
- Rules modal
- Round summary modal

#### RulesPage or RulesModal

Can be a modal in P1.

Should explain:

- Goal
- Card order
- Suit order
- Valid plays
- Passing
- Five-card hands
- Scoring
- No real money

### P2 Pages

#### JoinRoomPage

Fields:

- Nickname
- Room code
- Join Room button

#### LobbyPage

Purpose: waiting room before online match.

Content:

- Room code
- Copy/share code action
- Player list
- Host indicator
- Ready state, optional
- Room settings summary
- Start Game button for host

## 7. Create Room Settings

Create Room should expose the important game settings. Even in P1, it should feel like configuring a table.

### Settings Model

```ts
type RoomSettings = {
  playerCount: 3 | 4
  fillWithBots: boolean
  botDifficulty: 'basic'
  scoringMode: 'simple'
  cardValue: number
  roundLimit: number | null
  soundEnabled: boolean
}
```

### UI Sketch

```text
Create Table

Nickname
[ Jia ]

Players
( ) 3 players   (●) 4 players

Bots
[●] Fill empty seats with bots
Bot difficulty
[ Basic ]

Scoring
Mode
[ Simple: cards remaining × card value ]

Card value
[$10] per card

Round limit
[ Unlimited ]

Sound
[●] Sound effects

[Start Game]
```

### Scoring Controls

For P1, implement only simple scoring with configurable card value.

Card value options:

- $1
- $5
- $10 default
- $25
- $50
- Custom

Keep wording clear that this is fake table money.

## 8. Game UI Requirements

### Overall Style

- Clean web app aesthetic.
- Light background.
- White cards/panels.
- Subtle borders and shadows.
- No dark casino theme.
- No slot-machine visuals.
- No manipulative gambling-style language.

### Top Bar

Show:

- Game name: Big Two
- Room code if applicable
- Round number
- Rules button
- Leave button

Example:

```text
♣ Big Two      Room AB7K · Round 4      [Rules] [Leave]
```

### Opponent Panels

Each opponent panel should show:

- Player name
- Connected/disconnected status if multiplayer
- Cards remaining
- Total gain/loss
- Last action
- Card backs or card count visualization

Example:

```text
Alex
6 cards
+$120
Last action: Pass
```

Disconnected example:

```text
Alex
Disconnected · auto-pass in 24s
6 cards
+$120
```

### Current Play Area

Show:

- Current hand on table
- Hand type
- Player who played it
- Whose turn it is
- Pass state if useful

Example:

```text
Current play
Pair: 9♣ 9♥
Played by Riley

Your turn
```

### Your Hand

Each card must show:

- Rank
- Suit
- Red/black color
- Selected state

Interactions:

- Click/tap card to select/unselect.
- Selected card lifts upward.
- Drag card horizontally to rearrange if implemented.
- Sort by rank.
- Sort by suit.
- Play Selected.
- Pass.

Important: hand rearranging is local UI state only and does not affect server game state.

### Action Bar

Buttons:

- Play Selected
- Pass
- Sort by Rank
- Sort by Suit

Optional later:

- Auto Group
- Suggest Move

### Scoreboard

Show round and total values.

Example:

```text
Player    Round    Total
You       +40      -$140
Alex      +20      +$120
Riley     -10      +$80
Ming      -50      -$60
```

### Move Log

Show recent actions:

```text
Riley played pair 9♣ 9♥
Alex passed
Ming passed
You played pair J♦ J♠
Alex disconnected
Alex auto-passed
```

## 9. Card Model

```ts
type Suit = 'diamonds' | 'clubs' | 'hearts' | 'spades'
type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2'

type Card = {
  id: string
  rank: Rank
  suit: Suit
}
```

Card IDs should be stable and unique.

Examples:

```ts
{ id: '3-diamonds', rank: '3', suit: 'diamonds' }
{ id: '2-spades', rank: '2', suit: 'spades' }
```

Display labels:

```ts
const suitSymbol = {
  diamonds: '♦',
  clubs: '♣',
  hearts: '♥',
  spades: '♠',
}
```

Red suits:

- diamonds
- hearts

Black suits:

- clubs
- spades

## 10. Rule Defaults

Big Two has regional variants. Use these defaults for MVP unless changed.

### Player Count

- 4 players preferred.
- P1 default: 1 human + 3 bots.
- For 3-player mode, prefer filling the 4th seat with a bot for now.
- Avoid implementing true 3-player deal rules until later.

### Rank Order

From lowest to highest:

```text
3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2
```

### Suit Order

From lowest to highest:

```text
♦ < ♣ < ♥ < ♠
```

Implementation:

```ts
const rankValue = {
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

const suitValue = {
  diamonds: 1,
  clubs: 2,
  hearts: 3,
  spades: 4,
}
```

### Starting Player

- First round starts with the player who has 3♦.
- First play must include 3♦.
- After each round, decide later whether winner starts next round or 3♦ starts every new round.

Recommended MVP:

- Every new round starts with whoever has 3♦.

### Valid Plays

Support these play types:

- Single
- Pair
- Triple
- Five-card hand
- Pass

### Five-Card Hands

Support these five-card hand types:

- Straight
- Flush
- Full house
- Four of a kind + kicker
- Straight flush

Recommended five-card ranking order, low to high:

```text
Straight < Flush < Full House < Four of a Kind < Straight Flush
```

Need exact tie-breaking rules in implementation.

Recommended MVP tie-breakers:

- Straight: compare highest card, then suit of highest card.
- Flush: compare highest card, then next highest cards as needed, then suit of highest card.
- Full house: compare triple rank.
- Four of a kind: compare four-card rank.
- Straight flush: compare highest card, then suit of highest card.

### Turn Flow

1. Current player plays a valid hand or passes.
2. If there is an active current play, a new play must be same card count/type and must beat the current play.
3. Players may pass if they are not starting a new trick.
4. Once all other active players pass, the last player who played gains control.
5. Controller starts a new trick with any valid play.
6. First player with no cards wins the round.

### Passing Rule

MVP rule:

- Once a player passes, they cannot re-enter the current trick.
- They can play again after the trick resets.

### Cannot Pass When Starting

If the player controls the table and there is no active current play, they cannot pass. They must play a valid hand.

## 11. Scoring Rules

### Simple Scoring

Each losing player pays:

```text
cardsRemaining × cardValue
```

Winner gains the total amount lost by all other players.

Example with $10/card:

```text
Alex has 4 cards left → -$40
Ming has 8 cards left → -$80
Riley has 2 cards left → -$20
Winner gains +$140
```

### Score State

Track:

- Round delta
- Total score

```ts
type ScoreState = {
  roundDelta: Record<PlayerId, number>
  total: Record<PlayerId, number>
}
```

### Later Scoring Options

Do not implement in P1 unless desired later:

- Double penalty for 10+ cards remaining.
- Extra penalty for each 2 remaining.
- Extra penalty if player never played a card.
- Bonus for finishing with a five-card hand.
- House-rule scoring presets.

## 12. Game State Model

```ts
type PlayerId = string

type Player = {
  id: PlayerId
  nickname: string
  isBot: boolean
  connected: boolean
  disconnectedAt?: number | null
  replacedByBot?: boolean
}

type PlayedHandType = 'single' | 'pair' | 'triple' | 'straight' | 'flush' | 'fullHouse' | 'fourOfAKind' | 'straightFlush'

type PlayedHand = {
  type: PlayedHandType
  cards: Card[]
  strength: number
  playedBy: PlayerId
}

type MoveLogEntry = {
  id: string
  at: number
  playerId: PlayerId
  message: string
  type: 'play' | 'pass' | 'system' | 'score'
}

type GameState = {
  roomCode: string
  status: 'waiting' | 'playing' | 'roundOver'
  roundNumber: number
  players: Player[]
  hands: Record<PlayerId, Card[]>
  currentPlayerId: PlayerId
  currentPlay: PlayedHand | null
  lastPlayerToPlay: PlayerId | null
  passedPlayerIds: PlayerId[]
  scores: Record<PlayerId, number>
  roundDelta: Record<PlayerId, number>
  moveLog: MoveLogEntry[]
  settings: RoomSettings
}
```

## 13. Game Engine Modules

Keep game logic separate from Vue components.

Recommended structure:

```text
src/
  pages/
    HomePage.vue
    CreateRoomPage.vue
    GamePage.vue
    RulesPage.vue

  components/
    PlayingCard.vue
    PlayerPanel.vue
    HandArea.vue
    CurrentPlay.vue
    ActionBar.vue
    Scoreboard.vue
    MoveLog.vue
    RoundSummaryModal.vue
    RulesModal.vue
    ConnectionStatus.vue

  game/
    cards.ts
    deck.ts
    rules.ts
    scoring.ts
    legalMoves.ts
    bot.ts
    gameState.ts
    handEvaluation.ts

  stores/
    gameStore.ts
    settingsStore.ts

  assets/
    sounds/
      card-play.mp3
      round-win.mp3
```

### cards.ts

Responsibilities:

- Suit/rank constants
- Card display helpers
- Card comparison helpers
- Sort by rank
- Sort by suit

### deck.ts

Responsibilities:

- Create 52-card deck
- Shuffle deck
- Deal cards

### handEvaluation.ts

Responsibilities:

- Determine whether selected cards form a valid play
- Determine hand type
- Compute strength/tiebreaker value

### rules.ts

Responsibilities:

- Can player play selected cards?
- Can selected hand beat current play?
- Can player pass?
- Advance turn
- Reset trick
- Detect winner

### legalMoves.ts

Responsibilities:

- Generate legal moves for a hand
- Used by bots and possible future hint system

### scoring.ts

Responsibilities:

- Calculate round deltas
- Apply scoring settings
- Update totals

### bot.ts

Responsibilities:

- Choose bot action
- Basic bot strategy

## 14. Bot AI

### P1 Basic Bot

When responding to an active current play:

```text
If bot can beat current play:
  play the lowest valid hand that beats it
Else:
  pass
```

When bot controls the table:

```text
Play the lowest reasonable valid hand
```

Add a short delay before bot action so the game feels readable.

Example:

```ts
setTimeout(() => takeBotTurn(botPlayerId), 700)
```

Avoid complex AI for P1.

## 15. Sounds

Only two P1 sounds:

- Card played
- Round won

### Requirements

- Sound effects can be toggled on/off in Create Room.
- Persist sound preference in localStorage if easy.
- Do not add sounds for every tiny interaction yet.
- Browser audio may require user interaction before playback; this is acceptable because the player will click Start Game or Play.

### Suggested API

```ts
type SoundName = 'cardPlay' | 'roundWin'

function playSound(name: SoundName) {
  if (!settings.soundEnabled) return
  // play audio
}
```

Trigger card-play sound when:

- Human successfully plays cards.
- Bot successfully plays cards.

Trigger round-win sound when:

- Round summary appears.

## 16. Animations

Use CSS transitions and Vue TransitionGroup. Animate only transform and opacity where possible.

### P1 Required Animations

- Selected card lifts upward.
- Played card fades/slides out of hand.
- Current play fades/slides into center.
- Round summary modal appears.

### Avoid For P1

- Full flying-card FLIP animation.
- Confetti.
- Particle effects.
- Casino-style flashing.

### CSS Guidance

Good properties:

```css
transform
opacity
```

Avoid animating:

```css
top
left
width
height
margin
```

Example selected card behavior:

```css
.card {
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.card--selected {
  transform: translateY(-14px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}
```

## 17. Dragging / Rearranging Hand

This is useful but not the hardest part.

### P1 Requirement

At minimum:

- Tap/click to select.
- Sort by rank.
- Sort by suit.

Manual drag rearranging can be included if feasible, but it should not block the core game.

### Behavior

- Dragging changes local hand order only.
- It does not affect game rules.
- It does not need to be sent to the server in P2 unless you want persistence across reconnects.

### Desktop Interaction

- Drag card left/right to reorder.
- Click card to select/unselect.

### Mobile Later

- Tap selects.
- Swipe scrolls hand.
- Long press + drag may reorder.

Mobile dragging is P3.

## 18. Multiplayer Architecture — P2

P2 moves authoritative game state to the server.

### Server Responsibilities

The server owns the truth.

Server must handle:

- Create room
- Join room
- Leave room
- Start game
- Deal cards
- Track turns
- Validate plays
- Validate passes
- Reset trick
- Detect round winner
- Calculate score
- Start next round
- Disconnect/reconnect
- Auto-pass or auto-play for disconnected players

### Client Responsibilities

Client may request actions only:

- Create room
- Join room
- Start game if host
- Play selected card IDs
- Pass
- Leave

Client must not submit:

- Final scores
- Full game state
- Opponent hands
- Winner result
- Turn changes

## 19. Multiplayer Room Flow

### Create Room

Client sends:

```ts
createRoom({ nickname, settings })
```

Server returns:

```ts
{
  roomCode: 'AB7K',
  playerId: 'p_123',
  seatToken: 'long-random-secret'
}
```

Client stores session in localStorage.

### Join Room

Client sends:

```ts
joinRoom({ roomCode, nickname })
```

Server returns:

```ts
{
  roomCode,
  playerId,
  seatToken
}
```

### Start Game

Host sends:

```ts
startGame({ roomCode })
```

Server verifies host permission and starts if enough players/bots.

## 20. No-Login Seat Ownership

Because there is no auth, use per-seat tokens.

### Concepts

Room code:

- Lets users find a table.

Player ID:

- Identifies a seat.

Seat token:

- Secret stored in the browser.
- Proves the browser controls that seat.

### localStorage Session

```ts
type LocalSession = {
  roomCode: string
  playerId: string
  seatToken: string
}
```

Store as:

```ts
localStorage.setItem('bigTwoSession', JSON.stringify(session))
```

### Rejoin

On app load:

```ts
const session = localStorage.getItem('bigTwoSession')
if (session) {
  socket.emit('rejoinRoom', JSON.parse(session))
}
```

Server verifies:

- Room exists.
- Player exists in room.
- Seat token matches.

Then attach new socket to that player.

Important: never allow rejoin with only playerId. Always require seatToken.

## 21. Anti-Cheat Model

No-login does not mean no protection.

### Server Validation

For every playCards request, server checks:

- Is this socket associated with this player?
- Is it this player's turn?
- Does this player own these cards?
- Do these cards form a valid hand?
- Does the hand beat currentPlay if required?
- Is the player allowed to start a new trick?

For every passTurn request, server checks:

- Is this socket associated with this player?
- Is it this player's turn?
- Is passing allowed right now?

### Hidden Information

Never send opponent hands to a client.

Each client gets a private state.

For current user:

```ts
{
  playerId: 'p_123',
  hand: [/* actual cards */]
}
```

For opponents:

```ts
{
  playerId: 'p_456',
  nickname: 'Alex',
  cardCount: 6,
  connected: true,
  score: 120
}
```

Do not send all hands and hide them in the UI. Browser inspection would reveal them.

## 22. Socket Events — P2

### Client to Server

```ts
createRoom({ nickname, settings })
joinRoom({ roomCode, nickname })
rejoinRoom({ roomCode, playerId, seatToken })
startGame({ roomCode })
playCards({ roomCode, cardIds })
passTurn({ roomCode })
leaveRoom({ roomCode })
```

Optional later:

```ts
sendChat({ roomCode, message })
updateSettings({ roomCode, settings })
addBot({ roomCode })
removeBot({ roomCode, botId })
```

### Server to Client

```ts
roomUpdated(roomPublicState)
gameUpdated(playerPrivateState)
invalidMove({ reason })
roundEnded(roundSummary)
playerDisconnected({ playerId })
playerReconnected({ playerId })
turnTimerUpdated({ playerId, deadlineAt })
autoActionTaken({ playerId, action })
```

## 23. Disconnect / Reconnect Handling

### On Disconnect

Server should:

- Mark player as disconnected.
- Keep player seated.
- Broadcast disconnected status.
- Do not immediately end the game.

UI example:

```text
Alex
Disconnected · auto-pass in 24s
6 cards
+$120
```

### On Reconnect

If browser reloads, it attempts rejoin with stored session.

If token is valid:

- Restore seat.
- Mark connected.
- Send private game state.
- Broadcast player reconnected.

### If Disconnected Player's Turn

MVP rule:

1. Wait 30 seconds.
2. If passing is allowed, auto-pass.
3. If passing is not allowed because player controls the table, auto-play the lowest legal move.

Later option:

- Temporary bot replacement until the player reconnects.

### Room Expiration

Suggested cleanup:

- Waiting rooms expire after inactivity.
- Active rooms expire if all players disconnected for a while.
- Completed rooms expire after a delay.

Exact timings can be decided later.

## 24. Mobile — P3 Notes

Mobile is intentionally not P1.

When implementing mobile later:

### Layout

- Top: room/round/turn info.
- Middle: current play and compact opponents.
- Bottom: sticky player hand and action bar.

### Hand Options

Option 1: horizontal scroll row.

- Easy.
- Good for MVP mobile.
- Dragging can conflict with scrolling.

Option 2: overlapped/fanned row.

- Saves space.
- More card-game-like.
- Must preserve visible rank/suit.

Option 3: two-row hand.

- Most tappable.
- More complex for drag reorder.

Recommended mobile interaction:

- Tap = select/unselect.
- Swipe = scroll hand.
- Long press + drag = rearrange.

## 25. Error Messages

Invalid move feedback should be specific.

Examples:

- It is not your turn.
- Select at least one card.
- That is not a valid hand.
- You must play a pair.
- Your pair does not beat 9♣ 9♥.
- You cannot pass because you control the table.
- First play must include 3♦.

Use inline messages near the action bar. Avoid browser alerts.

## 26. Round Summary Modal

Shown after a player empties their hand.

Content:

- Winner
- Each player's remaining cards
- Each player's round delta
- Winner gain
- Total scores
- Next Round button
- Leave Table button

Example:

```text
Round complete

You won +$140

Alex: 4 cards left, -$40
Ming: 8 cards left, -$80
Riley: 2 cards left, -$20

[Next Round]
[Leave Table]
```

## 27. Development Roadmap

### Milestone 1 — Static Desktop UI

Build pages/components with fake data.

- HomePage
- CreateRoomPage
- GamePage
- PlayingCard
- PlayerPanel
- CurrentPlay
- HandArea
- ActionBar
- Scoreboard
- MoveLog
- RulesModal
- RoundSummaryModal

### Milestone 2 — Local Game Engine

Build pure TypeScript game logic.

- Create deck
- Shuffle
- Deal
- Determine starting player
- Select cards
- Evaluate hands
- Compare hands
- Play/pass
- Advance turns
- Reset trick
- Detect winner
- Calculate scores

### Milestone 3 — Bots

- Basic bot AI
- Bot turn delay
- Bot play/pass
- Move log entries
- Round summary integration

### Milestone 4 — P1 Polish

- Sort by rank
- Sort by suit
- Optional drag reorder
- Card-play sound
- Round-win sound
- Basic transitions
- Invalid move messages
- Save sound setting

### Milestone 5 — Multiplayer P2

- Socket.IO backend
- Create room
- Join room code
- Lobby
- Host starts game
- Server-owned game state
- Server-side validation
- Private per-player state
- Seat tokens

### Milestone 6 — Reliability P2

- Reconnect
- Disconnected status
- Auto-pass/auto-play
- Host transfer if needed
- Room expiration
- Deployment

### Milestone 7 — Mobile P3

- Responsive layout
- Sticky bottom hand
- Horizontal scroll/fanned hand
- Large tap targets
- Long-press drag if desired

## 28. Acceptance Criteria for P1 MVP

P1 is complete when:

- User can open app and create a local bot game.
- User can choose nickname, player count, bot fill, card value, round limit, and sound on/off.
- Game deals cards correctly.
- Player with 3♦ starts.
- User can select cards and play valid hands.
- Invalid plays are rejected with useful messages.
- Bots can play/pass automatically.
- Turn order works.
- Passing and trick reset work.
- First player to empty hand wins.
- Scores are calculated using cardValue × remaining cards.
- Round summary displays correctly.
- Card-play sound plays.
- Round-win sound plays.
- UI remains clean and non-casino-like.

## 29. Acceptance Criteria for P2 Multiplayer MVP

P2 is complete when:

- User can create a room with a room code.
- Another user can join with nickname + room code.
- Host can start game.
- Server deals cards.
- Server sends each player only their own hand.
- Opponents only show card counts.
- Server validates all moves.
- Users cannot act out of turn.
- Users cannot play cards they do not own.
- Scores are calculated on server.
- Disconnected users are shown as disconnected.
- Refreshing browser rejoins seat using localStorage token.
- If a disconnected user does not return on their turn, server auto-passes or auto-plays.

## 30. Implementation Notes for AI Coding Agents

Build this incrementally. Do not start with multiplayer. Start with static UI and pure local game logic.

Important constraints:

- Keep game rules out of Vue components.
- Keep card/rule/scoring logic as pure TypeScript functions.
- Make components dumb where possible.
- Use Pinia for local state orchestration.
- Use DOM/CSS for cards.
- Do not use Canvas or Phaser.
- Do not implement real-money features.
- Do not create account/auth flows.
- Do not overbuild mobile in P1.
- Do not overbuild scoring variants in P1.

Suggested first coding task:

1. Scaffold Vue 3 + Vite + TypeScript + Tailwind.
2. Create route structure.
3. Build CreateRoomPage.
4. Build GamePage with fake data.
5. Build card component and hand selection.
6. Then add game engine.

## 31. Open Product Decisions

Before finalizing rules engine, decide:

- Should true 3-player mode exist, or should 3 players require a bot as 4th?
- Should winner of previous round start next round, or always player with 3♦?
- Are straights allowed to wrap around A/2? Recommended MVP: no.
- Exact straight rules involving 2. Recommended MVP: 2 cannot be used in straights.
- Exact flush tie-breaker.
- Should passed players be permanently out until trick reset? Recommended MVP: yes.
- Should bot fill be mandatory in P1? Recommended: yes.
- Default round limit. Recommended: unlimited.

## 32. Recommended Defaults

Use these unless changed:

```text
Player count: 4
Bots: fill empty seats
Bot difficulty: Basic
Card value: $10
Round limit: Unlimited
Sound: On
Rank order: 3 low, 2 high
Suit order: ♦ < ♣ < ♥ < ♠
First player: holder of 3♦
First play: must include 3♦
Passing: cannot re-enter until trick resets
Scoring: cards remaining × card value
Mobile: P3
```

## 33. Tone and Copy Guidelines

Use friendly, neutral copy.

Good:

- Table money
- Score
- Friendly game for friends
- No real money
- Round complete
- Start game

Avoid:

- Bet now
- Jackpot
- Buy chips
- Cash out
- High roller
- Casino-style language
- Predatory urgency

Footer copy:

```text
No real money — friendly score tracking only.
```
