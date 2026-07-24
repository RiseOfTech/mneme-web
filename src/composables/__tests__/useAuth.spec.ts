import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../useAuth'
import type { AuthClient } from '@/api/authClient'
import { clearSession, setAccessToken, isAuthenticated, getAccessToken } from '@/auth/session'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

function makeStubClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
    PUT: vi.fn<AnyAsyncFn>(),
    DELETE: vi.fn<AnyAsyncFn>(),
    ...overrides,
  } as unknown as AuthClient
}

describe('useAuth', () => {
  beforeEach(() => {
    clearSession()
  })

  describe('login', () => {
    it('sets the access token and returns true on success', async () => {
      const postMock = vi.fn<AnyAsyncFn>().mockResolvedValue({
        data: { accessToken: 'jwt-abc' },
        error: undefined,
        response: { ok: true } as Response,
      })
      const client = makeStubClient({ POST: postMock })

      const auth = useAuth(client)
      const result = await auth.login('user@example.com', 'password123')

      expect(postMock).toHaveBeenCalledWith('/v1/auth/login', {
        body: { email: 'user@example.com', password: 'password123' },
      })
      expect(result).toBe(true)
      expect(getAccessToken()).toBe('jwt-abc')
      expect(isAuthenticated.value).toBe(true)
      expect(auth.submitError.value).toBeNull()
      expect(auth.submitting.value).toBe(false)
    })

    it('returns false, sets one generic error, and leaves the session anonymous on a 401', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'invalid_credentials' },
          response: { ok: false, status: 401 } as Response,
        }),
      })

      const auth = useAuth(client)
      const result = await auth.login('user@example.com', 'wrong-password')

      expect(result).toBe(false)
      expect(auth.submitError.value).toBe('Email or password is incorrect')
      expect(isAuthenticated.value).toBe(false)
      expect(getAccessToken()).toBeNull()
    })

    it('shows a network message, not the credentials message, when the client rejects', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const auth = useAuth(client)
      const result = await auth.login('user@example.com', 'password123')

      expect(result).toBe(false)
      expect(auth.submitError.value).toBe("Couldn't reach the server. Try again.")
      expect(auth.submitError.value).not.toBe('Email or password is incorrect')
      expect(isAuthenticated.value).toBe(false)
      expect(auth.submitting.value).toBe(false)
    })
  })

  describe('register', () => {
    it('sets the access token and returns true on success', async () => {
      const postMock = vi.fn<AnyAsyncFn>().mockResolvedValue({
        data: { accessToken: 'jwt-new' },
        error: undefined,
        response: { ok: true, status: 201 } as Response,
      })
      const client = makeStubClient({ POST: postMock })

      const auth = useAuth(client)
      const result = await auth.register('new@example.com', 'password123')

      expect(postMock).toHaveBeenCalledWith('/v1/auth/register', {
        body: { email: 'new@example.com', password: 'password123' },
      })
      expect(result).toBe(true)
      expect(getAccessToken()).toBe('jwt-new')
      expect(isAuthenticated.value).toBe(true)
      expect(auth.submitError.value).toBeNull()
      expect(auth.submitting.value).toBe(false)
    })

    it('returns false with an email-taken message on a 409, and leaves the session anonymous', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'email_taken' },
          response: { ok: false, status: 409 } as Response,
        }),
      })

      const auth = useAuth(client)
      const result = await auth.register('taken@example.com', 'password123')

      expect(result).toBe(false)
      expect(auth.submitError.value).toMatch(/already registered/i)
      expect(isAuthenticated.value).toBe(false)
      expect(getAccessToken()).toBeNull()
    })

    it('returns false with a validation message on a 400, and leaves the session anonymous', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'validation_failed' },
          response: { ok: false, status: 400 } as Response,
        }),
      })

      const auth = useAuth(client)
      const result = await auth.register('bad@example.com', 'password123')

      expect(result).toBe(false)
      expect(auth.submitError.value).not.toMatch(/already registered/i)
      expect(isAuthenticated.value).toBe(false)
      expect(getAccessToken()).toBeNull()
    })

    it('shows the network message, not the 409/400 copy, when the client rejects', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const auth = useAuth(client)
      const result = await auth.register('new@example.com', 'password123')

      expect(result).toBe(false)
      expect(auth.submitError.value).toBe("Couldn't reach the server. Try again.")
      expect(isAuthenticated.value).toBe(false)
      expect(auth.submitting.value).toBe(false)
    })
  })

  describe('logout', () => {
    it('clears the session on a successful call', async () => {
      setAccessToken('jwt-abc')
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: undefined,
          response: { ok: true, status: 204 } as Response,
        }),
      })

      const auth = useAuth(client)
      await auth.logout()

      expect(isAuthenticated.value).toBe(false)
      expect(getAccessToken()).toBeNull()
    })

    it('clears the session even when the call throws', async () => {
      setAccessToken('jwt-abc')
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const auth = useAuth(client)
      await auth.logout()

      expect(isAuthenticated.value).toBe(false)
      expect(getAccessToken()).toBeNull()
    })
  })
})
