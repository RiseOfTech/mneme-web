import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authClient } from '@/api/authClient'
import { clearSession, getAccessToken, isAuthenticated, session } from '@/auth/session'
import { refreshAccessToken, endSession, initSession } from '../refresh'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/authClient', () => ({
  authClient: {
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

type RefreshResult = { data?: { accessToken: string }; error?: unknown; response: Response }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const postMock = vi.mocked(authClient.POST)

beforeEach(() => {
  clearSession()
  postMock.mockReset()
})

describe('refreshAccessToken', () => {
  it('fires concurrent calls but issues exactly one POST, and every caller gets the same token', async () => {
    const { promise, resolve } = deferred<RefreshResult>()
    postMock.mockReturnValue(promise)

    const call1 = refreshAccessToken()
    const call2 = refreshAccessToken()
    const call3 = refreshAccessToken()

    expect(postMock).toHaveBeenCalledTimes(1)

    resolve({ data: { accessToken: 'jwt-refreshed' }, error: undefined, response: { ok: true } as Response })

    const [result1, result2, result3] = await Promise.all([call1, call2, call3])

    expect(result1).toBe('jwt-refreshed')
    expect(result2).toBe('jwt-refreshed')
    expect(result3).toBe('jwt-refreshed')
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('starts a new request for a later call once the in-flight one has settled', async () => {
    postMock.mockResolvedValueOnce({
      data: { accessToken: 'jwt-first' },
      error: undefined,
      response: { ok: true } as Response,
    })

    await refreshAccessToken()
    expect(postMock).toHaveBeenCalledTimes(1)

    postMock.mockResolvedValueOnce({
      data: { accessToken: 'jwt-second' },
      error: undefined,
      response: { ok: true } as Response,
    })

    const token = await refreshAccessToken()

    expect(token).toBe('jwt-second')
    expect(postMock).toHaveBeenCalledTimes(2)
  })

  it('clears the session and resolves null on a 401 from refresh', async () => {
    postMock.mockResolvedValueOnce({
      data: undefined,
      error: { title: 'invalid refresh token' },
      response: { ok: false, status: 401 } as Response,
    })

    const token = await refreshAccessToken()

    expect(token).toBeNull()
    expect(isAuthenticated.value).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('clears the session and resolves null when the request throws', async () => {
    postMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const token = await refreshAccessToken()

    expect(token).toBeNull()
    expect(isAuthenticated.value).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('does not resurrect the session when endSession runs while a refresh is still in flight', async () => {
    const { promise, resolve } = deferred<RefreshResult>()
    postMock.mockReturnValue(promise)

    const call = refreshAccessToken()

    endSession()
    expect(isAuthenticated.value).toBe(false)

    resolve({ data: { accessToken: 'jwt-late' }, error: undefined, response: { ok: true } as Response })
    const token = await call

    expect(token).toBeNull()
    expect(isAuthenticated.value).toBe(false)
    expect(getAccessToken()).toBeNull()
  })
})

describe('endSession', () => {
  it('clears the session state', async () => {
    const { setAccessToken } = await import('../session')
    setAccessToken('jwt-abc')

    endSession()

    expect(isAuthenticated.value).toBe(false)
    expect(getAccessToken()).toBeNull()
  })
})

describe('initSession', () => {
  it('ends authenticated on a successful refresh', async () => {
    postMock.mockResolvedValueOnce({
      data: { accessToken: 'jwt-restored' },
      error: undefined,
      response: { ok: true } as Response,
    })

    await expect(initSession()).resolves.toBeUndefined()

    expect(session.status.value).toBe('authenticated')
    expect(getAccessToken()).toBe('jwt-restored')
  })

  it('ends anonymous and never throws when there is no valid cookie', async () => {
    postMock.mockResolvedValueOnce({
      data: undefined,
      error: undefined,
      response: { ok: false, status: 401 } as Response,
    })

    await expect(initSession()).resolves.toBeUndefined()

    expect(session.status.value).toBe('anonymous')
  })

  it('never throws even when the underlying request throws', async () => {
    postMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(initSession()).resolves.toBeUndefined()

    expect(session.status.value).toBe('anonymous')
  })
})
