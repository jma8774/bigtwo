<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'

const router = useRouter()
const game = useGameStore()

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
    if (current === 'lobby' || current === 'game') return
    router.replace({ name: dest })
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
