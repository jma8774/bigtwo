<script setup lang="ts">
import { computed } from 'vue'
import type { PlayedPileCard } from '@bigtwo/shared'
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{ cards: PlayedPileCard[] }>()

// Per-card stagger delay: cards from the same play turn drop in one-after-another,
// indexed by their order within that turn (sorted by zIndex). Single-card plays
// always get delay 0.
const stagger = computed(() => {
  const byTurn = new Map<number, string[]>()
  const sortedByTurn = [...props.cards].sort(
    (a, b) =>
      a.playedAtTurn - b.playedAtTurn || a.pileMeta.zIndex - b.pileMeta.zIndex,
  )
  for (const c of sortedByTurn) {
    if (!byTurn.has(c.playedAtTurn)) byTurn.set(c.playedAtTurn, [])
    byTurn.get(c.playedAtTurn)!.push(c.id)
  }
  const map = new Map<string, number>()
  for (const ids of byTurn.values()) {
    ids.forEach((id, i) => map.set(id, i * 50))
  }
  return map
})
</script>

<template>
  <div
    class="absolute top-1/2 left-1/2 w-[50vw] h-[110%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 isolate"
    aria-hidden="true"
  >
    <div
      v-for="pc in cards"
      :key="pc.id"
      class="pile-card absolute opacity-80"
      :style="{
        left: `${(pc.pileMeta.xRatio + 1) * 50}%`,
        top: `${(pc.pileMeta.yRatio + 1) * 50}%`,
        transform: `translate(-50%, -50%) rotate(${pc.pileMeta.rotation}deg) scale(0.9)`,
        zIndex: pc.pileMeta.zIndex,
        ['--rot' as string]: `${pc.pileMeta.rotation}deg`,
        animationDelay: `${stagger.get(pc.id) ?? 0}ms`,
      }"
    >
      <PlayingCard :card="pc.card" size="md" disabled />
    </div>
  </div>
</template>

<style scoped>
.pile-card {
  animation: pile-arrive 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes pile-arrive {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 10px)) rotate(0deg) scale(0.82);
  }
  to {
    opacity: 0.8;
    transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) scale(0.9);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pile-card {
    animation: none;
  }
}
</style>
