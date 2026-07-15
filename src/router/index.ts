import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import SessionView from '@/views/SessionView.vue'
import CardsView from '@/views/CardsView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/session', name: 'session', component: SessionView },
  { path: '/cards', name: 'cards', component: CardsView },
  { path: '/', redirect: '/session' },
  { path: '/:pathMatch(.*)*', redirect: '/session' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
