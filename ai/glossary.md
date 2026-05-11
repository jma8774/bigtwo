# Glossary

## Big Two

The climbing/shedding card game this project implements. Also known as Chinese Poker, 锄大地, 大老二, Dai Di. Not Open-Face Chinese Poker.

## Trick

A sequence of plays of the same type/size, started by the controller and continued until every other still-in-the-round player has passed consecutively since the last play. The last player to play wins control and leads the next trick.

## Controller

The player who has the right to start a new trick. Defined as `state.lastPlayerToPlay` once a trick ends; they cannot pass while leading (no `currentPlay`).

## Current play

The hand currently on the table that the next play must beat (same card count and type). `null` when the table is open. When a new play happens, the prior `currentPlay` moves into `playedPile`.

## Pass

Skipping the current turn. Under ADR-0002, passing **does not** lock you out of the trick — when the turn comes back around you can play again (bluff or bait). A trick ends only when every other still-in-the-round player passes *consecutively* since the last play.

## Trick reset

Happens when every other player has passed in a row since the last play. The leader (`lastPlayerToPlay`) becomes the new controller; `currentPlay` moves into `playedPile` and is cleared; `passedPlayerIds` clears.

## Played pile

Visual scatter of previously-played cards behind `CurrentPlay`. Each card carries `PlayedPileCardMeta` (xRatio, yRatio, rotation, zIndex) generated once on entry and never mutated — so the pile never jitters. Cleared at the start of each round. See TICKET-012.

## Five-card hand

One of: straight, flush, full house, four of a kind + kicker, straight flush. Ranked low to high in that order via `FIVE_CARD_RANK` in `handEvaluation.ts`.

## Strength

Numeric value used to compare two `PlayedHand`s. Singles/pairs/triples compare only within their type; 5-card hands compare across the 5-card ladder via the strength formula `FIVE_CARD_RANK * 1e6 + primary * 100 + suitTie`.

## Smart sort

Local hand sort that groups cards into combos: quads → triples → pairs → singles, with 2s pinned to the end. Implemented as `smartSort` in `cards.ts`.

## 3♦ (three of diamonds)

The lowest card in the game and the starting card. Whoever holds it leads the first trick of every round, and their first play must include it.

## 2 (Two)

The highest rank — higher than Ace. MVP rule: 2s cannot be used in straights.

## Rank order

`3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2`

## Suit order

`♦ < ♣ < ♥ < ♠` (diamonds lowest, spades highest)

## Round

One deal of cards. Ends when any player empties their hand. Followed by scoring and the Round Summary modal.

## Match

A sequence of rounds bounded by `settings.roundLimit`. When the limit is hit, `GameState.status` becomes `matchOver` and the Round Summary modal switches to "Match Complete" mode with a "Play Again" button. `roundLimit = null` means an unlimited match.

## Round delta

The signed amount a player gains or loses in a single round. Sum of round deltas across all players is zero.

## Table money / Score

Fake currency used to track wins/losses. There is no real money in this product, ever.

## Card value

The dollar amount per remaining card used for scoring. Configurable per room: $1, $5, $10 (default), $25, $50, or a Custom positive integer.

## Room

A table. Identified by a 4-character `roomCode` (generated client-side in P1, will be server-issued in P2). Every room has a code regardless of visibility.

## Public room

A room with `settings.isPublic === true`. Discoverable from the public lobby browser (P2) and also joinable directly via room code. Default for new rooms.

## Private room

A room with `settings.isPublic === false`. Hidden from any public list — joinable only by entering the room code on the Join Room page.

## Seat

A player slot in a room. Owned by exactly one browser session in P2, proved by `seatToken`.

## seatToken

Server-issued secret stored in `localStorage` that lets a browser prove it owns a seat after a disconnect or reload. Never logged, never shared.

## Bot

An AI-controlled player. P1 difficulty is "Basic":
- Responding: play the lowest legal hand that beats the current play, else pass.
- Leading: play the **largest** legal combo (5-card > triple > pair > single), choosing the lowest strength within that size to save high cards.
- First play of round: must include 3♦; otherwise apply the leading policy.

Implemented in `src/game/bot.ts`. The 700ms delay before a bot's move resolves is scheduled by `gameStore`.

## Host

The player who created the room (P2). Has the sole right to start the game. Host transfer is a P2-reliability concern, not MVP.

## Turn number

Monotonically-increasing counter on `GameState`. Bumps on every `applyPlay`. Used in `PlayedPileCard.id` to make pile entries stable and unique across turns. Reset on `startRound`.
