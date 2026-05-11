<script setup lang="ts">
import type { Card } from '@/game/cards'
import { isRedSuit, suitSymbol } from '@/game/cards'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    card?: Card
    selected?: boolean
    faceDown?: boolean
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
  }>(),
  { selected: false, faceDown: false, size: 'md', disabled: false },
)

const emit = defineEmits<{ (e: 'select', card: Card): void }>()

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-12 h-16 rounded-md'
    case 'lg':
      return 'w-24 h-32 rounded-xl'
    default:
      return 'w-16 h-24 rounded-lg 2xl:w-20 2xl:h-28'
  }
})

const rankClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm'
    case 'lg':
      return 'text-2xl'
    default:
      return 'text-lg 2xl:text-xl'
  }
})

const suitClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-lg'
    case 'lg':
      return 'text-5xl'
    default:
      return 'text-3xl 2xl:text-4xl'
  }
})

const colorClass = computed(() =>
  props.card && isRedSuit(props.card.suit) ? 'text-suit-red' : 'text-suit-black',
)

function onClick() {
  if (props.disabled || !props.card || props.faceDown) return
  emit('select', props.card)
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :tabindex="disabled ? -1 : 0"
    @click="onClick"
    :class="[
      'relative bg-white border border-slate-200 shadow-card transition-all duration-150',
      'flex flex-col items-center justify-center font-semibold',
      sizeClasses,
      colorClass,
      selected ? '-translate-y-3 shadow-card-lift ring-2 ring-brand-500' : '',
      disabled ? 'cursor-default pointer-events-none' : 'cursor-pointer hover:shadow-card-lift',
    ]"
  >
    <template v-if="faceDown || !card">
      <div
        class="absolute inset-1 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center"
      >
        <span class="text-white text-2xl opacity-70">♠</span>
      </div>
    </template>
    <template v-else>
      <span :class="['leading-none font-semibold', rankClass]">{{ card.rank }}</span>
      <span :class="['leading-none mt-1', suitClass]">{{ suitSymbol[card.suit] }}</span>
    </template>
  </button>
</template>
