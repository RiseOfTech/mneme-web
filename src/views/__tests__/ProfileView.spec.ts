import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import ProfileView from '../ProfileView.vue'
import { authClient } from '@/api/authClient'
import { routes } from '@/router'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/authClient', () => ({
  authClient: {
    GET: vi.fn<AnyAsyncFn>(),
    PUT: vi.fn<AnyAsyncFn>(),
  },
}))

const mockedGet = vi.mocked(authClient.GET)
const mockedPut = vi.mocked(authClient.PUT)

async function mountAtProfile(): Promise<{ router: Router; wrapper: ReturnType<typeof mount> }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push('/profile')
  await router.isReady()
  const wrapper = mount(ProfileView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

beforeEach(() => {
  mockedGet.mockReset()
  mockedPut.mockReset()
})

describe('ProfileView', () => {
  it('renders an empty field with no error when nickname is null', async () => {
    mockedGet.mockResolvedValue({
      data: { userId: 'user-1', nickname: null },
      error: undefined,
      response: { ok: true } as Response,
    })

    const { wrapper } = await mountAtProfile()

    expect((wrapper.find('#nickname').element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).not.toContain('required')
  })

  it('blocks submission on an empty or whitespace-only nickname', async () => {
    mockedGet.mockResolvedValue({
      data: { userId: 'user-1', nickname: 'Fedya' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper } = await mountAtProfile()

    await wrapper.find('#nickname').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPut).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Nickname is required.')
  })

  it('blocks submission on a nickname longer than 50 characters', async () => {
    mockedGet.mockResolvedValue({
      data: { userId: 'user-1', nickname: 'Fedya' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper } = await mountAtProfile()

    await wrapper.find('#nickname').setValue('a'.repeat(51))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPut).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('50 characters or fewer')
  })

  it('saves the trimmed value and shows a confirmation without navigating away', async () => {
    mockedGet.mockResolvedValue({
      data: { userId: 'user-1', nickname: 'Fedya' },
      error: undefined,
      response: { ok: true } as Response,
    })
    mockedPut.mockResolvedValue({
      data: { userId: 'user-1', nickname: 'New name' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper, router } = await mountAtProfile()

    await wrapper.find('#nickname').setValue('  New name  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPut).toHaveBeenCalledWith('/v1/profile', { body: { nickname: 'New name' } })
    expect(wrapper.text()).toContain('Saved')
    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('shows the error and keeps the entered value on a failed save', async () => {
    mockedGet.mockResolvedValue({
      data: { userId: 'user-1', nickname: 'Fedya' },
      error: undefined,
      response: { ok: true } as Response,
    })
    mockedPut.mockResolvedValue({
      data: undefined,
      error: { title: 'boom' },
      response: { ok: false } as Response,
    })
    const { wrapper } = await mountAtProfile()

    await wrapper.find('#nickname').setValue('New name')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to save your profile')
    expect((wrapper.find('#nickname').element as HTMLInputElement).value).toBe('New name')
  })
})
