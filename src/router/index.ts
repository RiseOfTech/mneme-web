import { createRouter, createWebHistory, type NavigationGuard, type RouteRecordRaw } from 'vue-router'
import SessionView from '@/views/SessionView.vue'
import CardsView from '@/views/CardsView.vue'
import NewCardView from '@/views/NewCardView.vue'
import EditCardView from '@/views/EditCardView.vue'
import LoginView from '@/views/LoginView.vue'
import { isAuthenticated, session } from '@/auth/session'
import { sessionReady } from '@/auth/refresh'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  { path: '/session', name: 'session', component: SessionView, meta: { requiresAuth: true } },
  { path: '/cards', name: 'cards', component: CardsView, meta: { requiresAuth: true } },
  {
    path: '/cards/new',
    name: 'new-card',
    component: NewCardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/cards/:id/edit',
    name: 'edit-card',
    component: EditCardView,
    meta: { requiresAuth: true },
  },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/', redirect: '/session' },
  { path: '/:pathMatch(.*)*', redirect: '/session' },
]

export const authGuard: NavigationGuard = async (to) => {
  if (session.status.value === 'resolving') {
    await sessionReady
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && isAuthenticated.value) {
    return { path: '/session' }
  }

  return true
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(authGuard)
