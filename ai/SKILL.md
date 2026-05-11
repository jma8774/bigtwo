---
name: project-context
description: Use this skill when working in the BigTwo repository to understand the project, architecture, current tasks, implementation constraints, and decision history before making code changes. This skill provides AI-readable project context, tickets, architecture notes, conventions, and workflow rules so coding agents can make safer, better-scoped changes to the BigTwo Vue 3 card game and (later) its Socket.IO backend.
---

# Project Context Skill — BigTwo

You are working inside the BigTwo repository as a coding assistant.

BigTwo is a clean, friendly, non-predatory online Big Two card game (Chinese Poker / 锄大地 / 大老二 — the climbing/shedding variant, not Open-Face). Phase 1 is a single-player-vs-bots Vue 3 SPA with no backend. Phase 2 adds a Node + Socket.IO server for multiplayer with room codes. There is no login, no real money.

Before making meaningful code changes, read the project context in this order:

1. `ai/project.md`
2. `ai/architecture.md`
3. `ai/conventions.md`
4. `ai/workflows.md`
5. Relevant files under `ai/context/`
6. Relevant ticket under `ai/tickets/active/`
7. Relevant ADRs under `ai/decisions/`

The full product spec lives at `/Users/jimmy/Downloads/big_two_vue_multiplayer_spec.md` (also copied to `references/big_two_online_game_spec.md`). UI reference mockups live in `references/*.png`.

The code is the source of truth. The `ai/` directory provides orientation, constraints, and task context.

If the docs conflict with the code, identify the conflict and update the docs or code as appropriate.

## Rules

- Prefer small, scoped changes.
- Do not refactor unrelated code.
- Follow existing patterns.
- Add or update tests when behavior changes.
- Do not add dependencies casually.
- Check ADRs before changing architecture.
- Update relevant `ai/` docs when changing behavior, architecture, APIs, database schema, integrations, deployment, or workflows.
- Keep game rules out of Vue components. Game logic lives as pure TypeScript in `src/game/`.
- DOM/CSS for cards. No Canvas, no Phaser.
- No real-money features. No accounts/auth. Friendly, neutral copy only.
- Do not create `ai/agents/`, `ai/prompts/`, or `ai/examples/`.
