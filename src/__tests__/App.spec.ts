import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import SessionView from '@/views/SessionView.vue'
import CardsView from '@/views/CardsView.vue'
import { routes } from '@/router'
import { clearSession, setAccessToken } from '@/auth/session'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
    POST: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
  },
}))

vi.mock('@/api/authClient', () => ({
  authClient: {
    GET: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
    POST: vi
      .fn<AnyAsyncFn>()
      .mockResolvedValue({ data: undefined, error: undefined, response: { ok: true } }),
  },
}))

async function mountAppAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

beforeEach(() => {
  clearSession()
})

describe('App', () => {
  it('renders SessionView at /session when authenticated', async () => {
    setAccessToken('jwt-abc')
    const wrapper = await mountAppAt('/session')
    expect(wrapper.findComponent(SessionView).exists()).toBe(true)
  })

  it('renders CardsView at /cards when authenticated', async () => {
    setAccessToken('jwt-abc')
    const wrapper = await mountAppAt('/cards')
    expect(wrapper.findComponent(CardsView).exists()).toBe(true)
  })

  it('hides the nav when signed out', async () => {
    const wrapper = await mountAppAt('/login')
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('shows the nav with a sign-out control when authenticated', async () => {
    setAccessToken('jwt-abc')
    const wrapper = await mountAppAt('/session')
    expect(wrapper.find('nav').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sign out')
  })

  it('signing out clears the session and navigates to /login', async () => {
    setAccessToken('jwt-abc')
    const wrapper = await mountAppAt('/session')

    await wrapper.find('.sign-out-button').trigger('click')
    await flushPromises()

    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
