import { describe, it, expect, vi, beforeEach } from 'vitest'
import { client } from '../client'
import { setAccessToken, clearSession } from '@/auth/session'
import { refreshAccessToken } from '@/auth/refresh'

vi.mock('@/auth/refresh', () => ({
  refreshAccessToken: vi.fn<() => Promise<string | null>>(),
}))

const refreshMock = vi.mocked(refreshAccessToken)

function jsonResponse(status: number, body: unknown = []) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeFetchStub() {
  return vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(200))
}

describe('core client auth middleware', () => {
  beforeEach(() => {
    clearSession()
    refreshMock.mockReset()
  })

  it('attaches an Authorization header when a token is present', async () => {
    setAccessToken('token-123')
    const fetchStub = makeFetchStub()

    await client.GET('/v1/session/cards', { fetch: fetchStub })

    const request = fetchStub.mock.calls[0]?.[0] as Request
    expect(request.headers.get('Authorization')).toBe('Bearer token-123')
  })

  it('sends no Authorization header when there is no token', async () => {
    const fetchStub = makeFetchStub()

    await client.GET('/v1/session/cards', { fetch: fetchStub })

    const request = fetchStub.mock.calls[0]?.[0] as Request
    expect(request.headers.has('Authorization')).toBe(false)
  })
})

describe('core client 401 retry', () => {
  beforeEach(() => {
    clearSession()
    refreshMock.mockReset()
  })

  it('leaves a non-401 response untouched and never calls refreshAccessToken', async () => {
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(200, []))

    const { response } = await client.GET('/v1/session/cards', { fetch: fetchStub })

    expect(response.status).toBe(200)
    expect(refreshMock).not.toHaveBeenCalled()
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it('refreshes and retries once on a 401, returning the retried response', async () => {
    setAccessToken('stale-token')
    refreshMock.mockResolvedValue('fresh-token')
    const fetchStub = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { box: 2 }))

    const { data, response } = await client.POST('/v1/reviews/{cardId}', {
      params: { path: { cardId: 'card-1' } },
      body: { grade: 'CORRECT' },
      fetch: fetchStub,
    })

    expect(response.status).toBe(200)
    expect(data).toEqual({ box: 2 })
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledTimes(2)

    const retriedRequest = fetchStub.mock.calls[1]?.[0] as Request
    expect(retriedRequest.headers.get('Authorization')).toBe('Bearer fresh-token')
    expect(retriedRequest.method).toBe('POST')
    expect(await retriedRequest.clone().json()).toEqual({ grade: 'CORRECT' })
  })

  it('does not retry a third time when the retried request also 401s', async () => {
    setAccessToken('stale-token')
    refreshMock.mockResolvedValue('fresh-token')
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(401))

    const { response } = await client.GET('/v1/session/cards', { fetch: fetchStub })

    expect(response.status).toBe(401)
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledTimes(2)
  })

  it('returns the original 401 untouched when refresh fails', async () => {
    setAccessToken('stale-token')
    refreshMock.mockResolvedValue(null)
    const fetchStub = vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(jsonResponse(401))

    const { response } = await client.GET('/v1/session/cards', { fetch: fetchStub })

    expect(response.status).toBe(401)
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })
})
