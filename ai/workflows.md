# Workflows

## Implementing a feature

1. Read the active ticket under `ai/tickets/active/`.
2. Read `ai/project.md`, `ai/architecture.md`, `ai/conventions.md`, and any relevant `ai/context/` files.
3. Re-skim the matching section of the full spec at `references/big_two_online_game_spec.md` (or `/Users/jimmy/Downloads/big_two_vue_multiplayer_spec.md`).
4. If UI work, look at the matching reference PNG in `references/`.
5. Inspect existing code to find similar patterns.
6. Identify the smallest safe change.
7. Implement. Keep game logic in `src/game/`, keep components dumb.
8. Add or update unit tests in `src/game/*.test.ts`.
9. Update relevant `ai/` documentation if behavior, architecture, or conventions changed.
10. Summarize what changed and why.

## Fixing a bug

1. Reproduce: write a failing unit test in `src/game/` if the bug is in game logic (most bugs will be).
2. Locate the smallest faulty area.
3. Fix the root cause, not the symptom.
4. Keep the regression test.
5. Update docs if any assumption changed.

## Adding or changing tests

- Test runner: Vitest (planned). Tests live next to source: `src/game/rules.ts` → `src/game/rules.test.ts`.
- Use fixture `GameState` objects, not mocked stores.
- Use deterministic shuffles by passing a seeded RNG into `deck.shuffle(deck, rng)` — never call `Math.random` from inside game code if you want it tested.
- Run with `npm test` (script to be added during scaffolding).

## Updating database schema

Not applicable. P1 has no database. P2 keeps an in-memory room store; if persistence is added later, an ADR is required first.

## Updating API contracts (P2)

- All socket events are listed in spec §22. Treat that as the canonical list.
- Adding a new event: update spec §22 (or its successor doc), update `ai/context/api-contracts.md`, and update both client and server in the same PR.
- Changing an existing payload: the server is authoritative; the change must be backward-compatible if any clients are deployed, otherwise version the event.

## Preparing a pull request

Include:
- One-paragraph summary of what changed and which ticket it closes.
- Test notes: how to verify locally. For UI changes, the reference PNG to compare against.
- Screenshot for any UI change.
- Note any spec section that the change clarifies, expands, or contradicts.
- Note any `ai/` doc updated in the same PR.

## Updating project context

When behavior, architecture, APIs, integrations, deployment, or workflows change, update the relevant `ai/` file in the same change. New architectural decisions get an ADR. New domain terms go in `ai/glossary.md`.
