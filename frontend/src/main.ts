import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useGameStore } from './stores/gameStore'
import { getSocket, pingServer } from './utils/socket'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Guard: if a user has an active online room, prevent them from drifting onto
// the marketing/lobby-entry pages. They must use the explicit Leave button to
// exit, which clears `isOnlineRoom` before the navigation runs.
const OUTSIDE_ROOM_ROUTES = new Set(['home', 'create', 'join', 'browse', 'rules'])

function destinationForStatus(status: string | undefined): string | null {
  if (status === 'waiting') return 'lobby'
  if (status === 'playing' || status === 'roundOver' || status === 'matchOver') return 'game'
  return null
}

const game = useGameStore()
router.beforeEach((to) => {
  if (typeof to.name !== 'string') return true
  if (!OUTSIDE_ROOM_ROUTES.has(to.name)) return true
  if (!game.isOnlineRoom || !game.state) return true
  if (game.sessionRestoreState === 'failed') return true
  const dest = destinationForStatus(game.state.status)
  if (!dest || dest === to.name) return true

  // Lobby (status='waiting'): the user pressed a topbar link or browser
  // back — treat it as "leave the room" rather than anchoring them. The
  // server-side disconnect/leave evicts them so the seat opens up.
  // Mid-game (playing / roundOver / matchOver): still anchor. Game forfeits
  // should require the explicit Leave button.
  if (game.state.status === 'waiting') {
    game.endGame()
    return true
  }

  return { name: dest, replace: true }
})

app.mount('#app')

// Smoke-test the backend connection on boot. TICKET-022 will replace this
// with real lobby events; for now we just verify the link is alive.
const socket = getSocket()
socket.on('connect', () => {
  console.debug('[bigtwo] socket connected', socket.id)
  void pingServer()
})
socket.on('disconnect', (reason) => {
  console.debug('[bigtwo] socket disconnected', reason)
})
