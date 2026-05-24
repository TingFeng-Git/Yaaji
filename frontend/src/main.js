import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { loadAuthFromStorage } from './store/auth'

// Load authentication from localStorage before creating app
loadAuthFromStorage()

createApp(App).use(router).mount('#app')