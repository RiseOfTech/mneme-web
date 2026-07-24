import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes, authGuard } from '../index'
import { clearSession, setAccessToken } from '@/auth/session'

function makeTestRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

function makeGuardedTestRouter() {
  const router = makeTestRouter()
  router.beforeEach(authGuard)
  return router
}

describe('router', () => {
  it('redirects / to /session', async () => {
    const router = makeTestRouter()
    router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('session')
  })

  it('resolves /cards to the cards route', () => {
    expect(makeTestRouter().resolve('/cards').name).toBe('cards')
  })

  it('redirects an unknown path to /session', async () => {
    const router = makeTestRouter()
    router.push('/does-not-exist')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('session')
  })
})

describe('authGuard', () => {
  beforeEach(() => {
    clearSession()
  })

  it('redirects an anonymous visit to a protected route to /login, preserving the destination', async () => {
    const router = makeGuardedTestRouter()
    router.push('/cards')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/cards')
  })

  it('lets an authenticated visit to a protected route through', async () => {
    setAccessToken('jwt-abc')
    const router = makeGuardedTestRouter()
    router.push('/cards')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('redirects an authenticated visit to /login away to /session', async () => {
    setAccessToken('jwt-abc')
    const router = makeGuardedTestRouter()
    router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('session')
  })

  it('lets an anonymous visit to /login through', async () => {
    const router = makeGuardedTestRouter()
    router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects an anonymous visit to /profile to /login', async () => {
    const router = makeGuardedTestRouter()
    router.push('/profile')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/profile')
  })
})
