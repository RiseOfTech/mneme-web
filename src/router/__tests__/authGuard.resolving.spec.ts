import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { flushPromises } from '@vue/test-utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/authClient', () => ({
  authClient: {
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

beforeEach(() => {
  vi.resetModules()
})

describe('authGuard while the session is resolving', () => {
  it('waits for sessionReady before deciding, then lets an authenticated visit through', async () => {
    const { authClient } = await import('@/api/authClient')
    const { routes, authGuard } = await import('@/router')
    const { initSession } = await import('@/auth/refresh')

    let resolvePost!: (value: unknown) => void
    vi.mocked(authClient.POST).mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve
      }),
    )

    initSession()

    const router = createRouter({ history: createMemoryHistory(), routes })
    router.beforeEach(authGuard)
    router.push('/cards')
    await flushPromises()

    // The refresh is still pending — the guard must not have decided yet.
    expect(router.currentRoute.value.name).not.toBe('cards')
    expect(router.currentRoute.value.name).not.toBe('login')

    resolvePost({ data: { accessToken: 'jwt-restored' }, error: undefined, response: { ok: true } })
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('redirects to /login once resolving settles anonymous, without ever bouncing early', async () => {
    const { authClient } = await import('@/api/authClient')
    const { routes, authGuard } = await import('@/router')
    const { initSession } = await import('@/auth/refresh')

    vi.mocked(authClient.POST).mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { ok: false, status: 401 },
    })

    initSession()

    const router = createRouter({ history: createMemoryHistory(), routes })
    router.beforeEach(authGuard)
    router.push('/cards')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/cards')
  })
})
