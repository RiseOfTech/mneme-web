import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import RegisterView from '../RegisterView.vue'
import { authClient } from '@/api/authClient'
import { routes, authGuard } from '@/router'
import { clearSession, setAccessToken, isAuthenticated } from '@/auth/session'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/authClient', () => ({
  authClient: {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

const mockedPost = vi.mocked(authClient.POST)

async function mountAtRegister(
  path = '/register',
): Promise<{ router: Router; wrapper: ReturnType<typeof mount> }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.beforeEach(authGuard)
  router.push(path)
  await router.isReady()
  const wrapper = mount(RegisterView, { global: { plugins: [router] } })
  return { router, wrapper }
}

beforeEach(() => {
  mockedPost.mockReset()
  clearSession()
})

describe('RegisterView', () => {
  it('blocks submission and sends no request when the confirmation does not match', async () => {
    const { wrapper } = await mountAtRegister()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirmPassword').setValue('password124')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Passwords do not match.')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('blocks submission and sends no request when the password is too short', async () => {
    const { wrapper } = await mountAtRegister()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('short')
    await wrapper.find('#confirmPassword').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Password must be 8–64 characters.')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('calls register with email and password only, never the confirmation', async () => {
    mockedPost.mockResolvedValue({
      data: { accessToken: 'jwt-new' },
      error: undefined,
      response: { ok: true, status: 201 } as Response,
    })
    const { wrapper } = await mountAtRegister()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirmPassword').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPost).toHaveBeenCalledWith('/v1/auth/register', {
      body: { email: 'user@example.com', password: 'password123' },
    })
    const options = mockedPost.mock.calls[0]?.[1]
    expect(options?.body).not.toHaveProperty('confirmPassword')
  })

  it('navigates to /session on a successful submit', async () => {
    mockedPost.mockResolvedValue({
      data: { accessToken: 'jwt-new' },
      error: undefined,
      response: { ok: true, status: 201 } as Response,
    })
    const { wrapper, router } = await mountAtRegister()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirmPassword').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('session')
  })

  it('stays on the form, shows the email-taken message, and keeps the entered values on a 409', async () => {
    mockedPost.mockResolvedValue({
      data: undefined,
      error: { title: 'email_taken' },
      response: { ok: false, status: 409 } as Response,
    })
    const { wrapper, router } = await mountAtRegister()

    await wrapper.find('#email').setValue('taken@example.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirmPassword').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toMatch(/already registered/i)
    expect(router.currentRoute.value.name).toBe('register')
    expect((wrapper.find('#email').element as HTMLInputElement).value).toBe('taken@example.com')
    expect((wrapper.find('#password').element as HTMLInputElement).value).toBe('password123')
  })

  it('clears a stale field message once the field is fixed and resubmitted', async () => {
    const { wrapper } = await mountAtRegister()

    await wrapper.find('#email').setValue('user@example.com')
    await wrapper.find('#password').setValue('short')
    await wrapper.find('#confirmPassword').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Password must be 8–64 characters.')

    mockedPost.mockResolvedValue({
      data: { accessToken: 'jwt-new' },
      error: undefined,
      response: { ok: true, status: 201 } as Response,
    })

    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirmPassword').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Password must be 8–64 characters.')
  })

  it('redirects an authenticated visit to /session', async () => {
    setAccessToken('jwt-existing')

    const { router } = await mountAtRegister()

    expect(router.currentRoute.value.name).toBe('session')
  })

  it('renders the form for an anonymous visit', async () => {
    const { wrapper, router } = await mountAtRegister()

    expect(router.currentRoute.value.name).toBe('register')
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(isAuthenticated.value).toBe(false)
  })
})
