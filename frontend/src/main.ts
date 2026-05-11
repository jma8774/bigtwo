import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { getSocket, pingServer } from './utils/socket'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
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
