<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { Card } from '@/game/cards'
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{
  cards: Card[]
  selectedIds: Set<string>
}>()

const emit = defineEmits<{
  (e: 'toggle', card: Card): void
  (e: 'reorder', cards: Card[]): void
}>()

const containerRef = ref<ComponentPublicInstance | null>(null)
function getContainerEl(): HTMLElement | null {
  return (containerRef.value?.$el as HTMLElement | undefined) ?? null
}
const dragId = ref<string | null>(null)
const dragStartX = ref(0)
const dragDX = ref(0)
const dragging = ref(false)
const suppressNextClick = ref(false)

const DRAG_THRESHOLD = 5

function onPointerDown(card: Card, e: PointerEvent) {
  if (e.button !== 0) return
  dragId.value = card.id
  dragStartX.value = e.clientX
  dragDX.value = 0
  dragging.value = false

  document.addEventListener('pointermove', onDocPointerMove)
  document.addEventListener('pointerup', onDocPointerEnd)
  document.addEventListener('pointercancel', onDocPointerEnd)
}

function onDocPointerMove(e: PointerEvent) {
  if (dragId.value === null) return
  const dx = e.clientX - dragStartX.value
  if (!dragging.value && Math.abs(dx) > DRAG_THRESHOLD) {
    dragging.value = true
  }
  if (dragging.value) {
    dragDX.value = dx
  }
}

function onDocPointerEnd() {
  cleanupListeners()

  const container = getContainerEl()
  if (dragging.value && dragId.value !== null && container) {
    const id = dragId.value
    const draggedEl = container.querySelector<HTMLElement>(`[data-card-id="${id}"]`)
    if (draggedEl) {
      const dragRect = draggedEl.getBoundingClientRect()
      const dragCenter = dragRect.left + dragRect.width / 2

      let insertAt = 0
      for (const other of props.cards) {
        if (other.id === id) continue
        const el = container.querySelector<HTMLElement>(`[data-card-id="${other.id}"]`)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const center = rect.left + rect.width / 2
        if (dragCenter > center) insertAt++
      }

      const fromIndex = props.cards.findIndex((c) => c.id === id)
      if (fromIndex !== -1 && insertAt !== fromIndex) {
        const newOrder = [...props.cards]
        const [removed] = newOrder.splice(fromIndex, 1)
        newOrder.splice(insertAt, 0, removed)
        emit('reorder', newOrder)
      }
    }

    // Suppress the trailing click so dropping doesn't accidentally toggle selection.
    suppressNextClick.value = true
    nextTick(() => {
      suppressNextClick.value = false
    })
  }

  dragId.value = null
  dragDX.value = 0
  dragging.value = false
}

function cleanupListeners() {
  document.removeEventListener('pointermove', onDocPointerMove)
  document.removeEventListener('pointerup', onDocPointerEnd)
  document.removeEventListener('pointercancel', onDocPointerEnd)
}

onBeforeUnmount(cleanupListeners)

function onSelect(card: Card) {
  if (suppressNextClick.value) return
  emit('toggle', card)
}
</script>

<template>
  <TransitionGroup
    ref="containerRef"
    tag="div"
    name="hand-card"
    class="flex items-end gap-1 flex-nowrap min-h-[5.5rem]"
  >
    <!--
      Two layers per card so FLIP and drag don't fight over `transform`:
        outer .flip-wrap → owned by TransitionGroup for leave/move animations
        inner .drag-wrap → carries the inline drag translate
    -->
    <div v-for="card in cards" :key="card.id" class="flip-wrap">
      <div
        :data-card-id="card.id"
        :class="[
          'drag-wrap touch-none relative',
          dragId === card.id && dragging ? 'z-10' : '',
        ]"
        :style="
          dragId === card.id && dragging ? { transform: `translateX(${dragDX}px)` } : undefined
        "
        @pointerdown="onPointerDown(card, $event)"
      >
        <PlayingCard :card="card" :selected="selectedIds.has(card.id)" @select="onSelect" />
      </div>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.hand-card-leave-active {
  transition:
    transform 220ms ease,
    opacity 220ms ease;
}
.hand-card-leave-to {
  opacity: 0;
  transform: translateY(-36px);
}
.hand-card-move {
  transition: transform 220ms ease;
}
</style>
