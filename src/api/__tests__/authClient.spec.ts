import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authClient } from '../authClient'
import { setAccessToken, clearSession } from '@/auth/session'
import { refreshAccessToken } from '@/auth/refresh'

vi.mock('@/auth/refresh', () => ({
  refreshAccessToken: vi.fn<() => Promise<string | null>>(),
}))

const refreshMock = vi.mocked(refreshAccessToken)

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('auth client auth middleware', () => {
  beforeEach(() => {
    clearSession()
    refreshMock.mockReset()
  })

  it('attaches an Authorization header when a token is present', async () => {
    setAccessToken('token-123')
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(200))

    await authClient.GET('/v1/profile', { fetch: fetchStub })

    const request = fetchStub.mock.calls[0]?.[0] as Request
    expect(request.headers.get('Authorization')).toBe('Bearer token-123')
  })
})

describe('auth client 401 retry', () => {
  beforeEach(() => {
    clearSession()
    refreshMock.mockReset()
  })

  it('refreshes and retries once on a 401 from the profile endpoint', async () => {
    setAccessToken('stale-token')
    refreshMock.mockResolvedValue('fresh-token')
    const fetchStub = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { userId: 'user-1', nickname: 'Fedya' }))

    const { data, response } = await authClient.GET('/v1/profile', { fetch: fetchStub })

    expect(response.status).toBe(200)
    expect(data).toEqual({ userId: 'user-1', nickname: 'Fedya' })
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledTimes(2)

    const retriedRequest = fetchStub.mock.calls[1]?.[0] as Request
    expect(retriedRequest.headers.get('Authorization')).toBe('Bearer fresh-token')
  })

  it('does not retry a third time when the retried profile request also 401s', async () => {
    setAccessToken('stale-token')
    refreshMock.mockResolvedValue('fresh-token')
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(401))

    const { response } = await authClient.GET('/v1/profile', { fetch: fetchStub })

    expect(response.status).toBe(401)
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledTimes(2)
  })

  it('never refreshes or retries a 401 from /v1/auth/login', async () => {
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(401))

    const { response } = await authClient.POST('/v1/auth/login', {
      body: { email: 'user@example.com', password: 'wrong-password' },
      fetch: fetchStub,
    })

    expect(response.status).toBe(401)
    expect(refreshMock).not.toHaveBeenCalled()
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it('never triggers a further refresh on a 401 from /v1/auth/refresh itself', async () => {
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(401))

    const { response } = await authClient.POST('/v1/auth/refresh', { fetch: fetchStub })

    expect(response.status).toBe(401)
    expect(refreshMock).not.toHaveBeenCalled()
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })
})
