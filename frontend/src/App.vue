<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'

const router = useRouter()
const game = useGameStore()

// Server-forced exit (room sweep). Send the user back to /home; HomePage will
// surface the reason banner on first paint and the store will clear it.
watch(
  () => game.closedReason,
  (reason) => {
    if (!reason) return
    const name = router.currentRoute.value.name as string | undefined
    if (name !== 'home') router.replace({ name: 'home' })
  },
)

// When a session is restored asynchronously (rejoin race), the router guard
// in main.ts won't catch the user — they're already on home/etc. This watcher
// picks up that case and routes them back into the room.
watch(
  () => ({
    status: game.state?.status,
    online: game.isOnlineRoom,
    restore: game.sessionRestoreState,
  }),
  (s) => {
    if (!s.online || !s.status) return
    if (s.restore === 'failed') return
    const dest =
      s.status === 'waiting'
        ? 'lobby'
        : s.status === 'playing' || s.status === 'roundOver' || s.status === 'matchOver'
          ? 'game'
          : null
    if (!dest) return
    const current = router.currentRoute.value.name as string | undefined
    if (current === dest) return
    // Only block the in-room → in-room jump if it would step backwards (e.g.
    // /game → /lobby on a transient 'waiting' read while gameUpdated is still
    // in flight). Forward steps (lobby → game) must be allowed so a rejoiner
    // mid-game lands back at the table.
    if (current === 'game' && dest === 'lobby') return
    router.replace({ name: dest })
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
