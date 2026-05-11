# TICKET-004: Basic bot AI

## Status

Done

## Goal

Implement `src/game/bot.ts` with the Basic policy from spec §14: when responding to a current play, play the lowest valid hand that beats it; otherwise pass. When controlling the table, play the lowest reasonable valid hand.

## Background

Bots are the only opponents in P1, so the game can't be played end-to-end without them. The bot policy must use `generateLegalMoves` from TICKET-003 — no separate rule duplication.

## Requirements

- `chooseBotMove(state, botPlayerId): { type: 'play', cards: Card[] } | { type: 'pass' }`.
- When `currentPlay` exists: pick the legal hand with the lowest `strength` that still beats it. If none, pass.
- When `currentPlay` is `null` (bot controls): pick the lowest reasonable legal hand. "Reasonable" for MVP: smallest card count, then lowest strength. Avoid burning a five-card hand to lead if a single works.
- Must respect "first play of round must include 3♦" when applicable.
- Bot turn delay (~700ms) is scheduled by the store, **not** by `bot.ts`. `bot.ts` is pure and instant.

## Acceptance criteria

- Unit tests cover:
  - Bot plays the lowest beating hand when one exists.
  - Bot passes when no hand beats `currentPlay`.
  - Bot leading plays the lowest single it owns (not a five-card hand) when both are legal.
  - Bot on first play of round includes 3♦.
  - Bot never returns an invalid move (property test: random hands, all returned moves are accepted by `canPlay`).

## Out of scope

- Smarter bot tiers (`intermediate`, `advanced`). Spec calls these out as later work.
- Bluffing, card counting, hand reading.

## Files likely involved

- `src/game/bot.ts` + `bot.test.ts`
- `src/game/legalMoves.ts` (may need small additions)
