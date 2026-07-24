import { createApp } from 'vue'
import '@/assets/tokens.css'
import '@/assets/base.css'
import App from './App.vue'
import { router } from './router'
import { initSession } from '@/auth/refresh'

initSession()
createApp(App).use(router).mount('#app')
