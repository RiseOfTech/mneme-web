import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import SessionView from '@/views/SessionView.vue'
import CardsView from '@/views/CardsView.vue'
import { routes } from '@/router'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
    POST: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
  },
}))

async function mountAppAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

describe('App', () => {
  it('renders SessionView at /session', async () => {
    const wrapper = await mountAppAt('/session')
    expect(wrapper.findComponent(SessionView).exists()).toBe(true)
  })

  it('renders CardsView at /cards', async () => {
    const wrapper = await mountAppAt('/cards')
    expect(wrapper.findComponent(CardsView).exists()).toBe(true)
  })
})
