import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CreateRoomPage from '@/pages/CreateRoomPage.vue'
import JoinRoomPage from '@/pages/JoinRoomPage.vue'
import BrowseRoomsPage from '@/pages/BrowseRoomsPage.vue'
import LobbyPage from '@/pages/LobbyPage.vue'
import GamePage from '@/pages/GamePage.vue'
import RulesPage from '@/pages/RulesPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/create', name: 'create', component: CreateRoomPage },
    { path: '/join', name: 'join', component: JoinRoomPage },
    { path: '/browse', name: 'browse', component: BrowseRoomsPage },
    { path: '/lobby', name: 'lobby', component: LobbyPage },
    { path: '/game', name: 'game', component: GamePage },
    { path: '/rules', name: 'rules', component: RulesPage },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    // Respect browser back/forward, otherwise jump to the top.
    return savedPosition ?? { top: 0, left: 0 }
  },
})

export default router
