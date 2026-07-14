import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import SessionView from '@/views/SessionView.vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
    POST: vi.fn<AnyAsyncFn>(() => new Promise(() => {})),
  },
}))

describe('App', () => {
  it('renders SessionView', () => {
    const wrapper = mount(App)
    expect(wrapper.findComponent(SessionView).exists()).toBe(true)
  })
})
