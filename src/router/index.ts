import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import SessionView from '@/views/SessionView.vue'
import CardsView from '@/views/CardsView.vue'
import NewCardView from '@/views/NewCardView.vue'
import EditCardView from '@/views/EditCardView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/session', name: 'session', component: SessionView },
  { path: '/cards', name: 'cards', component: CardsView },
  { path: '/cards/new', name: 'new-card', component: NewCardView },
  { path: '/cards/:id/edit', name: 'edit-card', component: EditCardView },
  { path: '/', redirect: '/session' },
  { path: '/:pathMatch(.*)*', redirect: '/session' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
