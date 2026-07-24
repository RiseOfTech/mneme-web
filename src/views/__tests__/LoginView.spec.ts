import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import LoginView from '../LoginView.vue'
import { authClient } from '@/api/authClient'
import { routes } from '@/router'
import { clearSession, isAuthenticated } from '@/auth/session'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/authClient', () => ({
  authClient: {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

const mockedPost = vi.mocked(authClient.POST)

async function mountAtLogin(path = '/login'): Promise<{ router: Router; wrapper: ReturnType<typeof mount> }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [router] } })
  return { router, wrapper }
}

beforeEach(() => {
  mockedPost.mockReset()
  clearSession()
})

describe('LoginView', () => {
  it('shows validation messages for empty fields and does not submit', async () => {
    const { wrapper } = await mountAtLogin()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email is required.')
    expect(wrapper.text()).toContain('Password is required.')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 8 characters without submitting', async () => {
    const { wrapper } = await mountAtLogin()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Password must be 8–64 characters.')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('shows the generic error and stays on /login when login fails', async () => {
    mockedPost.mockResolvedValue({
      data: undefined,
      error: { title: 'invalid_credentials' },
      response: { ok: false, status: 401 } as Response,
    })
    const { wrapper, router } = await mountAtLogin()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('wrong-password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email or password is incorrect')
    expect(router.currentRoute.value.name).toBe('login')
    expect(isAuthenticated.value).toBe(false)
  })

  it('navigates to /session by default on a successful login', async () => {
    mockedPost.mockResolvedValue({
      data: { accessToken: 'jwt-abc' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper, router } = await mountAtLogin()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('session')
  })

  it('navigates to the redirect query param on a successful login', async () => {
    mockedPost.mockResolvedValue({
      data: { accessToken: 'jwt-abc' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper, router } = await mountAtLogin('/login?redirect=%2Fcards')

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cards')
  })
})
