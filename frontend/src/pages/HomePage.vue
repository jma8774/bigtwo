<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppTopBar from '@/components/AppTopBar.vue'
import RulesModal from '@/components/RulesModal.vue'
import heroUrl from '@/assets/images/home-hero.png'

const router = useRouter()
const showRules = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppTopBar>
      <template #left>
        <nav class="flex items-center gap-6 text-sm">
          <RouterLink to="/" class="text-slate-900 font-medium border-b-2 border-brand-600 pb-1"
            >Home</RouterLink
          >
          <RouterLink to="/browse" class="text-slate-500 hover:text-slate-900 transition-colors"
            >Rooms</RouterLink
          >
        </nav>
      </template>
    </AppTopBar>

    <main class="max-w-3xl mx-auto px-8 py-20 text-center">
      <h1 class="text-7xl font-bold text-slate-900 leading-tight mb-5">Big Two</h1>
      <p class="text-lg text-slate-600 mb-3 max-w-2xl mx-auto">
        Big Two grew out of East and Southeast Asian card-game culture and became a favorite
        table game among friends and families. It goes by many names (Dai Di, Choh Dai Di,
        大老二, Big Deuce, Pusoy Dos), but the goal is always simple: empty your hand first
        by outplaying the table.
      </p>
      <div class="flex flex-wrap justify-center gap-3 mb-16 mt-10">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white text-base font-medium hover:bg-brand-700 transition-colors"
          @click="router.push({ name: 'create' })"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
          Create
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-base font-medium hover:bg-slate-50 transition-colors"
          @click="router.push({ name: 'join' })"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Join
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-base font-medium hover:bg-slate-50 transition-colors"
          @click="showRules = true"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Rules
        </button>
      </div>

      <img
        :src="heroUrl"
        alt="Big Two table preview"
        class="mx-auto rounded-2xl shadow-panel border border-slate-200 max-w-full"
      />
    </main>

    <RulesModal :open="showRules" @close="showRules = false" />
  </div>
</template>
