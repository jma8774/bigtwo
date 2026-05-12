# TICKET-025: Nickname should persist and populate across all entry pages

## Status

Backlog

## Goal

A user types their nickname once. It's remembered across sessions and pre-fills every form that asks for one: Create Room, Join Room, Browse Rooms.

Today only `BrowseRoomsPage` reads from `settingsStore.nickname`, and it copies into a *local* `ref` so edits in the input don't flow back to the store. The other pages have hardcoded defaults (`'You'` or `''`). The line "Saved locally so you don't have to retype it." on the browse page is a lie in the current build.

## Background

`settingsStore` already has the `nickname` ref with localStorage persistence (`bigTwoSettings` key). It just isn't wired everywhere.

## Requirements

- **`CreateRoomPage`** — replace `const nickname = ref('You')` with a computed bound to `settingsStore.nickname` (or use `storeToRefs` + 2-way binding). The form input mutates the store directly. Default falls back to `'You'` only when the store value is empty.
- **`JoinRoomPage`** — same: replace `const nickname = ref('')` with a store-bound input. Default to whatever's stored, or `'Guest'` if empty when joining.
- **`BrowseRoomsPage`** — drop the local `ref` copy; bind the input directly to `settingsStore.nickname` (via `storeToRefs` or v-model on the store property). Today's local copy means a change here is lost when the user navigates away.
- **No empty submissions** — at submit time, fall back to a sensible default (`'You'` for create/lobby, `'Guest'` for join) if the input is blank. The store can still hold the empty string so users can type freely.

## Acceptance criteria

- Set a nickname on the Browse Rooms page → navigate to Create Room → the form is pre-filled with the same nickname.
- Same on Join Room.
- Refresh the page → nickname is still there.
- Empty submission falls back to the default per page (no rooms created with literally empty names).
- The "Saved locally so you don't have to retype it." copy on Browse is now accurate (or remove it if the UX is obvious enough).

## Files likely involved

- `frontend/src/stores/settingsStore.ts` — already has the `nickname` ref; no changes expected
- `frontend/src/pages/CreateRoomPage.vue`
- `frontend/src/pages/JoinRoomPage.vue`
- `frontend/src/pages/BrowseRoomsPage.vue`

## Out of scope

- Server-side nickname uniqueness or moderation. Two players can still pick the same name.
- A profile / settings page for editing the nickname outside of the entry flows.
- Suggesting random names. If empty, default applies silently.

## Notes for implementation

- Pinia's `storeToRefs` keeps reactivity intact when extracting refs from a store:

  ```ts
  import { storeToRefs } from 'pinia'
  const settings = useSettingsStore()
  const { nickname } = storeToRefs(settings)
  // <input v-model="nickname" />
  ```

- Validate input length (settingsStore already accepts strings; consider trimming + max 20 chars at submit time).
