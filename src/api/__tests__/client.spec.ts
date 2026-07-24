import { describe, it, expect, vi, beforeEach } from 'vitest'
import { client } from '../client'
import { setAccessToken, clearSession } from '@/auth/session'

function makeFetchStub() {
  return vi.fn<(input: Request) => Promise<Response>>().mockResolvedValue(
    new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('core client auth middleware', () => {
  beforeEach(() => {
    clearSession()
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
