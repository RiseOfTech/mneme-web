import { describe, it, expect, vi } from 'vitest'
import { useProfile } from '../useProfile'
import type { AuthClient } from '@/api/authClient'
import type { components } from '@/api/authSchema'

type ProfileResponseDto = components['schemas']['ProfileResponseDto']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

function makeProfile(overrides: Partial<ProfileResponseDto> = {}): ProfileResponseDto {
  return {
    userId: 'user-1',
    nickname: 'Fedya',
    ...overrides,
  }
}

function makeStubClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
    PUT: vi.fn<AnyAsyncFn>(),
    DELETE: vi.fn<AnyAsyncFn>(),
    ...overrides,
  } as unknown as AuthClient
}

describe('useProfile', () => {
  describe('load', () => {
    it('sets status to ready and stores the profile on success', async () => {
      const profile = makeProfile()
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: profile,
          error: undefined,
          response: { ok: true } as Response,
        }),
      })

      const p = useProfile(client)
      await p.load()

      expect(p.status.value).toBe('ready')
      expect(p.profile.value).toEqual(profile)
    })

    it('sets status to error when the client returns an HTTP error', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'boom' },
          response: { ok: false } as Response,
        }),
      })

      const p = useProfile(client)
      await p.load()

      expect(p.status.value).toBe('error')
      expect(p.error.value).not.toBeNull()
    })

    it('sets status to error, not stuck on loading, when the client throws', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const p = useProfile(client)
      await p.load()

      expect(p.status.value).toBe('error')
      expect(p.error.value).not.toBeNull()
    })
  })

  describe('save', () => {
    it('returns true and stores the returned profile on success', async () => {
      const updated = makeProfile({ nickname: 'New name' })
      const putMock = vi.fn<AnyAsyncFn>().mockResolvedValue({
        data: updated,
        error: undefined,
        response: { ok: true } as Response,
      })
      const client = makeStubClient({ PUT: putMock })

      const p = useProfile(client)
      const result = await p.save('New name')

      expect(putMock).toHaveBeenCalledWith('/v1/profile', { body: { nickname: 'New name' } })
      expect(result).toBe(true)
      expect(p.profile.value).toEqual(updated)
      expect(p.submitting.value).toBe(false)
      expect(p.submitError.value).toBeNull()
    })

    it('returns false and sets submitError on an HTTP failure (including 400)', async () => {
      const client = makeStubClient({
        PUT: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'Validation failed' },
          response: { ok: false, status: 400 } as Response,
        }),
      })

      const p = useProfile(client)
      const result = await p.save('')

      expect(result).toBe(false)
      expect(p.submitError.value).not.toBeNull()
      expect(p.submitting.value).toBe(false)
    })

    it('returns false and sets submitError when the client throws', async () => {
      const client = makeStubClient({
        PUT: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const p = useProfile(client)
      const result = await p.save('New name')

      expect(result).toBe(false)
      expect(p.submitError.value).not.toBeNull()
      expect(p.submitting.value).toBe(false)
    })
  })
})
