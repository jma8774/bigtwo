# Project Overview

## What this project does

BigTwo is a web-based implementation of the Big Two climbing/shedding card game (also known as Chinese Poker, 锄大地, 大老二) for 3–4 players. It is designed as a casual web table for friends — clean desktop-first UI, fake "table money" for score tracking, no login, no real-money gambling. P1 ships as a single-player experience versus bots, with no backend. P2 adds online play with room codes and WebSockets.

## Primary users

- Casual players who want a quick game of Big Two with friends.
- Solo players practicing against bots.

No accounts. Identity is a nickname per session.

## Core user flows

P1 (single-player vs bots):
1. Land on HomePage → click "Play with Bots" or "Create Room".
2. Configure table on CreateRoomPage (nickname, player count, bot fill, card value, sound).
3. Play rounds on GamePage: select cards, play/pass, watch bots act, see move log and scoreboard.
4. Round Summary modal at end of each round; continue or leave.

P2 (multiplayer, later):
1. Host: Create Room → gets room code → shares with friends.
2. Guests: Join Room with code + nickname → Lobby.
3. Host starts game → server deals → server-authoritative play.
4. Disconnect/reconnect by `seatToken` stored in localStorage.

## Non-goals

- Real-money betting, payments, or anything resembling a casino.
- Login, accounts, authentication, persistent player profiles.
- Public matchmaking or ranked ladder.
- In-game chat (P1 and P2 MVP).
- Spectators.
- Mobile polish (deferred to P3).
- Confetti, slot-machine effects, manipulative urgency.
- Complex bot AI. P1 bots are intentionally basic.

## Important constraints

- **Tech:** Vue 3 + Vite + TypeScript + Tailwind + Vue Router + Pinia. DOM-based cards, no Canvas, no Phaser. P2 adds Node + Socket.IO.
- **Architecture:** Game rules must live in pure TypeScript in `src/game/`, not in Vue components. Components stay dumb.
- **Server authority (P2):** Server owns state. Clients never compute scores, validate winners, or see opponent hands.
- **Tone:** Friendly, neutral copy. Never use casino language ("bet now", "jackpot", "buy chips", "cash out"). Always frame scoring as fake table money.
- **No external auth.** Seat ownership is enforced by a per-seat `seatToken` stored in localStorage.

## Current project status

Greenfield. Empty git repo. No source code yet. Reference mockups and full spec are available; first task is scaffolding the Vue 3 + Vite + TS project and building the static UI per Milestone 1.
