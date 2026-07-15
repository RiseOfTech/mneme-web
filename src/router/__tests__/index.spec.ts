import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '../index'

function makeTestRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
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
